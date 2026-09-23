import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { body, validationResult } from 'express-validator';
import Marketing from '../models/Marketing.js';
import Candidate from '../models/Candidate.js';
import { protect } from '../middleware/auth.js';
import xlsx from 'xlsx';
import { INTERVIEW_STAGES } from '../utils/calculations.js';
import { createExportWorksheet } from '../utils/exportHelper.js';
import { sendCandidateInviteEmail } from '../utils/email.js';
import { uploadResume } from '../config/multerConfig.js';
import { logUserActivity } from '../utils/activityLogger.js';

const generateSecureTempPassword = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  let result = 'Vx!';
  for (let i = 0; i < 4; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  for (let i = 0; i < 3; i++) {
    result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  return result;
};

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

router.get('/export', protect, async (req, res) => {
  try {
    const { date, employeeName } = req.query;
    const filter = {};
    if (employeeName) filter.employeeName = new RegExp(employeeName, 'i');
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.entryDate = { $gte: start, $lte: end };
    }

    const records = await Marketing.find(filter).sort({ createdAt: -1 }).lean();
    
    const exportData = records.map(r => ({
      'TL Name': r.teamLeaderName || '',
      'Recruiter Name': r.employeeName || '',
      'Date': r.entryDate ? new Date(r.entryDate).toISOString().split('T')[0] : '',
      'Candidates': r.candidates ? r.candidates.length : 0,
      'Long Applications': r.longApplicationsSubmitted || 0,
      'Easy Applications': r.easyApplicationsSubmitted || 0,
      'Total Applications': r.totalApplications || 0,
      'Assessments': r.assessmentsReceived || 0,
      'Screening Calls': r.screeningCallsCompleted || 0,
      'Total Interviews': r.totalInterviews || 0,
      'Notes': r.notes || ''
    }));

    const ws = createExportWorksheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Marketing');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename="marketing.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const applyMetrics = (body, user) => {
  const longApps = Number(body.longApplicationsSubmitted) || 0;
  const easyApps = Number(body.easyApplicationsSubmitted) || 0;
  const totalApplications = longApps + easyApps;

  return {
    ...body,
    employeeName: body.employeeName || user?.name || 'Recruiter',
    teamLeaderName: body.teamLeaderName || user?.name || 'General',
    longApplicationsSubmitted: longApps,
    easyApplicationsSubmitted: easyApps,
    totalApplications,
    assessmentsReceived: Number(body.assessmentsReceived) || 0,
    screeningCallsCompleted: Number(body.screeningCallsCompleted) || 0,
    totalInterviews: Number(body.totalInterviews) || 0,
    interviewStages: body.interviewStages || [],
  };
};

router.get('/interview-stages', protect, (req, res) => {
  res.json({ success: true, data: INTERVIEW_STAGES });
});

router.get('/', protect, async (req, res) => {
  try {
    const { date, employeeName, teamLeaderName, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (employeeName) filter.employeeName = new RegExp(employeeName, 'i');
    if (teamLeaderName) filter.teamLeaderName = new RegExp(teamLeaderName, 'i');
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.entryDate = { $gte: start, $lte: end };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      Marketing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Marketing.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: records,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/marketing/assigned-candidates
// @desc    Get candidates assigned to the logged-in marketing employee
// @access  Protected
router.get('/assigned-candidates', protect, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'marketing') {
      query.assignedTo = req.user._id;
    } else if (req.user.role === 'sales') {
      query.convertedBy = req.user._id;
    } else if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      query.assignedTo = req.user._id;
    }

    const candidates = await Candidate.find(query)
      .populate('assignedTo', 'name email role mobileNumber')
      .populate('convertedBy', 'name email role')
      .populate('sourceLeadId', 'date employeeName leadSource submissionType status linkedInProfiles entryDate')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: candidates.length, data: candidates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/marketing/candidates/:id/resend-invite
// @desc    Resend candidate portal invite with fresh temp credentials
// @access  Protected
router.post('/candidates/:id/resend-invite', protect, async (req, res) => {
  try {
    const candidateId = req.params.id;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const tempPassword = generateSecureTempPassword();
    const inviteToken = crypto.randomBytes(32).toString('hex');

    const passwordSalt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, passwordSalt);

    const tokenSalt = await bcrypt.genSalt(10);
    const tokenHash = await bcrypt.hash(inviteToken, tokenSalt);

    const expiryHours = parseInt(process.env.CANDIDATE_INVITE_EXPIRY_HOURS, 10) || 72;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    candidate.passwordHash = passwordHash;
    candidate.tempCredential = {
      tokenHash,
      expiresAt,
      used: false,
    };
    candidate.accountStatus = 'invited';
    candidate.mustResetPassword = true;
    await candidate.save();

    await sendCandidateInviteEmail({
      email: candidate.email,
      firstName: candidate.firstName,
      tempPassword,
      inviteToken,
      expiryHours,
      recruiterEmail: req.user.email || 'recruiting@velvix.com',
    });

    res.json({
      success: true,
      message: `Fresh invite email successfully sent to ${candidate.email}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/marketing/candidates/:id/resume
// @desc    Download candidate resume
// @access  Protected
router.get('/candidates/:id/resume', protect, async (req, res) => {
  try {
    const candidateId = req.params.id;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    if (!candidate.resume?.path || !fs.existsSync(candidate.resume.path)) {
      return res.status(404).json({ success: false, message: 'No resume uploaded for this candidate' });
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(candidate.resume.originalName || `${candidate.firstName}_Resume.pdf`)}"`
    );
    res.setHeader('Content-Type', candidate.resume.mimetype || 'application/octet-stream');
    res.sendFile(path.resolve(candidate.resume.path));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/marketing/candidates/:id/ats-resume
// @desc    Upload or update candidate ATS-friendly resume
// @access  Protected (Recruiter / Marketing / Admin)
router.post('/candidates/:id/ats-resume', protect, uploadResume.single('atsResume'), async (req, res) => {
  try {
    const candidateId = req.params.id;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an ATS-friendly resume file' });
    }

    // Clean up old ATS resume file if it exists
    if (candidate.atsResume?.path && fs.existsSync(candidate.atsResume.path)) {
      try {
        fs.unlinkSync(candidate.atsResume.path);
      } catch (err) {
        console.error('Error removing old ATS resume file:', err);
      }
    }

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

    res.json({
      success: true,
      message: 'ATS-friendly resume uploaded successfully!',
      atsResume: candidate.atsResume,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/marketing/candidates/:id/ats-resume
// @desc    Download candidate ATS-friendly resume
// @access  Protected (Employee)
router.get('/candidates/:id/ats-resume', protect, async (req, res) => {
  try {
    const candidateId = req.params.id;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    if (!candidate.atsResume?.path || !fs.existsSync(candidate.atsResume.path)) {
      return res.status(404).json({ success: false, message: 'No ATS-friendly resume uploaded for this candidate' });
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(candidate.atsResume.originalName || `${candidate.firstName}_ATS_Resume.pdf`)}"`
    );
    res.setHeader('Content-Type', candidate.atsResume.mimetype || 'application/octet-stream');
    res.sendFile(path.resolve(candidate.atsResume.path));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const record = await Marketing.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const data = applyMetrics(req.body, req.user);
    const record = await Marketing.create({
      ...data,
      createdBy: req.user._id,
    });

    // Log Marketing Submission Activity
    logUserActivity({
      req,
      module: 'marketing',
      actionType: 'marketing_submitted',
      title: `Submitted ${data.totalApplications || (data.longApplicationsSubmitted + data.easyApplicationsSubmitted)} client applications`,
      description: `Long: ${data.longApplicationsSubmitted || 0}, Easy: ${data.easyApplicationsSubmitted || 0} for ${data.candidates?.map(c => c.candidateName).join(', ') || 'candidates'}.`,
      metadata: {
        longApplications: data.longApplicationsSubmitted || 0,
        easyApplications: data.easyApplicationsSubmitted || 0,
        totalApplications: data.totalApplications || (data.longApplicationsSubmitted + data.easyApplicationsSubmitted),
        candidateNames: data.candidates?.map(c => c.candidateName).filter(Boolean),
      },
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const data = applyMetrics(req.body, req.user);
    const record = await Marketing.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const record = await Marketing.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
