import express from 'express';
import fs from 'fs';
import path from 'path';
import Candidate from '../models/Candidate.js';
import Skill from '../models/Skill.js';
import CandidateSkill from '../models/CandidateSkill.js';
import { protect } from '../middleware/auth.js';
import { uploadResume } from '../config/multerConfig.js';
import {
  parseAndSaveCandidateSkills,
  getCandidateSkillsStructured,
  SKILL_CATEGORIES,
} from '../utils/resumeParser.js';

const router = express.Router();

// ==========================================
// 1. GET SKILL CATEGORIES
// ==========================================
// @route   GET /api/candidates/skills/categories
// @desc    Get list of standard skill categories
// @access  Protected
router.get('/skills/categories', protect, (req, res) => {
  res.json({
    success: true,
    data: SKILL_CATEGORIES,
  });
});

// ==========================================
// 2. GET CANDIDATE SKILLS
// ==========================================
// @route   GET /api/candidates/:id/skills
// @desc    Get structured skills for candidate (grouped by category & metadata)
// @access  Protected
router.get('/:id/skills', protect, async (req, res) => {
  try {
    const candidateId = req.params.id;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const structuredData = await getCandidateSkillsStructured(candidateId);

    // Group skills by category for frontend convenience
    const skillsByCategory = {};
    for (const cat of SKILL_CATEGORIES) {
      skillsByCategory[cat] = [];
    }

    for (const skill of structuredData.skills) {
      const cat = skill.category || 'Other';
      if (!skillsByCategory[cat]) {
        skillsByCategory[cat] = [];
      }
      skillsByCategory[cat].push(skill);
    }

    res.json({
      success: true,
      candidate_id: candidateId,
      candidateName: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
      parsingStatus: structuredData.parsingStatus,
      parsingError: structuredData.parsingError,
      parsedAt: structuredData.parsedAt,
      hasResume: !!(candidate.atsResume?.filename || candidate.resume?.filename),
      skills: structuredData.skills,
      skillsByCategory,
      total: structuredData.total,
    });
  } catch (error) {
    console.error(`Error fetching candidate skills:`, error);
    res.status(500).json({ success: false, message: 'Unable to load candidate skills. Please try again.' });
  }
});

// ==========================================
// 3. UPLOAD RESUME & AUTOMATICALLY EXTRACT SKILLS
// ==========================================
// @route   POST /api/candidates/:id/resume
// @desc    Upload ATS-friendly resume and automatically extract skills
// @access  Protected
router.post('/:id/resume', protect, uploadResume.single('resume'), async (req, res) => {
  try {
    const candidateId = req.params.id;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a valid ATS-friendly PDF/DOCX resume file.',
      });
    }

    // Clean up old ATS resume file if it exists
    if (candidate.atsResume?.path && fs.existsSync(candidate.atsResume.path)) {
      try {
        fs.unlinkSync(candidate.atsResume.path);
      } catch (err) {
        console.error('Error removing old ATS resume file:', err);
      }
    }

    // Save ATS Resume reference
    candidate.atsResume = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
      uploadedBy: req.user._id,
    };
    await candidate.save();

    // Automatically trigger Skill Extraction Pipeline
    let extractionResult = null;
    let extractionError = null;

    try {
      extractionResult = await parseAndSaveCandidateSkills(
        candidateId,
        req.file.path,
        req.file.mimetype
      );
    } catch (parseErr) {
      extractionError = parseErr.message;
      console.error('Automatic skill extraction error:', parseErr);
    }

    // Fetch updated structured skills
    const updatedSkills = await getCandidateSkillsStructured(candidateId);

    if (extractionError) {
      return res.status(200).json({
        success: true,
        warning: true,
        message: 'Resume uploaded successfully, but skills could not be extracted. You can retry extraction or add skills manually.',
        parsingStatus: 'FAILED',
        error: extractionError,
        atsResume: candidate.atsResume,
        skills: updatedSkills.skills,
        total: updatedSkills.total,
      });
    }

    res.json({
      success: true,
      message: `Resume uploaded and ${extractionResult?.count || 0} skills automatically extracted!`,
      atsResume: candidate.atsResume,
      parsingStatus: 'COMPLETED',
      skills: updatedSkills.skills,
      total: updatedSkills.total,
    });
  } catch (error) {
    console.error('Resume upload endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to upload resume. Please try again.',
    });
  }
});

// ==========================================
// 4. REPROCESS RESUME SKILLS
// ==========================================
// @route   POST /api/candidates/:id/resume/reprocess
// @desc    Re-run skill extraction on candidate's existing ATS resume
// @access  Protected
router.post('/:id/resume/reprocess', protect, async (req, res) => {
  try {
    const candidateId = req.params.id;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // Check for ATS resume first, then fallback to original resume
    const resumeObj = candidate.atsResume?.path ? candidate.atsResume : candidate.resume;
    if (!resumeObj?.path || !fs.existsSync(resumeObj.path)) {
      return res.status(400).json({
        success: false,
        message: 'No resume document on file for this candidate to process. Please upload a resume first.',
      });
    }

    // Run extraction pipeline
    const extractionResult = await parseAndSaveCandidateSkills(
      candidateId,
      resumeObj.path,
      resumeObj.mimetype
    );

    const updatedSkills = await getCandidateSkillsStructured(candidateId);

    res.json({
      success: true,
      message: `Skill extraction complete! ${extractionResult.count} skills identified.`,
      parsingStatus: 'COMPLETED',
      skills: updatedSkills.skills,
      total: updatedSkills.total,
    });
  } catch (error) {
    console.error('Reprocess resume error:', error);
    res.status(500).json({
      success: false,
      message: `Skill extraction failed: ${error.message || 'Unable to read resume content'}. You can retry or add skills manually.`,
    });
  }
});

// ==========================================
// 5. MANUALLY ADD SKILL TO CANDIDATE
// ==========================================
// @route   POST /api/candidates/:id/skills
// @desc    Manually add a skill to a candidate's profile
// @access  Protected
router.post('/:id/skills', protect, async (req, res) => {
  try {
    const candidateId = req.params.id;
    const { name, category } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Skill name is required' });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const trimmedName = name.trim();
    const normalizedName = trimmedName.toLowerCase();
    const skillCategory = category?.trim() || 'Other';

    // Find or create the canonical Skill
    let skillDoc = await Skill.findOne({ normalizedName });
    if (!skillDoc) {
      skillDoc = await Skill.create({
        name: trimmedName,
        normalizedName,
        category: skillCategory,
      });
    }

    // Check if candidate already has this skill
    let candidateSkill = await CandidateSkill.findOne({
      candidate: candidateId,
      skill: skillDoc._id,
    });

    if (candidateSkill) {
      // If it existed as resume-sourced, upgrade/ensure it's preserved
      return res.json({
        success: true,
        message: 'Skill already exists for this candidate',
        skill: {
          id: skillDoc._id,
          candidateSkillId: candidateSkill._id,
          name: skillDoc.name,
          category: skillDoc.category,
          source: candidateSkill.source,
          confidence: candidateSkill.confidence,
        },
      });
    }

    // Create candidate skill with source: 'manual'
    candidateSkill = await CandidateSkill.create({
      candidate: candidateId,
      skill: skillDoc._id,
      confidence: 1.0,
      source: 'manual',
    });

    res.status(201).json({
      success: true,
      message: `Skill "${skillDoc.name}" added successfully`,
      skill: {
        id: skillDoc._id,
        candidateSkillId: candidateSkill._id,
        name: skillDoc.name,
        category: skillDoc.category,
        source: 'manual',
        confidence: 1.0,
      },
    });
  } catch (error) {
    console.error('Error manually adding skill:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 6. DELETE CANDIDATE SKILL
// ==========================================
// @route   DELETE /api/candidates/:id/skills/:skillId
// @desc    Remove a skill from candidate's profile
// @access  Protected
router.delete('/:id/skills/:skillId', protect, async (req, res) => {
  try {
    const { id: candidateId, skillId } = req.params;

    // Delete candidate skill either by candidateSkill._id or by skill._id
    const deleted = await CandidateSkill.findOneAndDelete({
      candidate: candidateId,
      $or: [{ _id: skillId }, { skill: skillId }],
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Candidate skill not found' });
    }

    res.json({
      success: true,
      message: 'Skill removed from candidate profile',
    });
  } catch (error) {
    console.error('Error removing candidate skill:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
