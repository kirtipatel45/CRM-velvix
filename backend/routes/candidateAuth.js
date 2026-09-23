import express from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { body, validationResult } from 'express-validator';
import Candidate from '../models/Candidate.js';
import Marketing from '../models/Marketing.js';
import { uploadResume } from '../config/multerConfig.js';
import {
  protectCandidate,
  protectCandidateReset,
  generateCandidateToken,
  generateCandidateResetToken,
  createRateLimiter,
} from '../middleware/candidateAuth.js';

const router = express.Router();

const formatCandidateResponse = (candidate) => ({
  id: candidate._id,
  firstName: candidate.firstName || '',
  lastName: candidate.lastName || '',
  email: candidate.email || '',
  phone: candidate.phone || '',
  accountStatus: candidate.accountStatus || 'invited',
  currentCity: candidate.currentCity || '',
  preferredJobCities: candidate.preferredJobCities || [],
  preferredJobTitles: candidate.preferredJobTitles || [],
  visaStatus: candidate.visaStatus || '',
  primarySkill: candidate.primarySkill || '',
  experienceYears: candidate.experienceYears || 0,
  jobExperiences: candidate.jobExperiences || [],
  isOnboarded: candidate.isOnboarded || false,
  onboardedAt: candidate.onboardedAt,
  hasResume: !!(candidate.resume && candidate.resume.filename),
  resumeName: candidate.resume?.originalName || '',
  hasAtsResume: !!(candidate.atsResume && candidate.atsResume.filename),
  atsResumeName: candidate.atsResume?.originalName || '',
  atsResumeUploadedAt: candidate.atsResume?.uploadedAt,
  convertedAt: candidate.convertedAt,
  createdAt: candidate.createdAt,
});

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array(), message: errors.array()[0].msg });
  }
  next();
};

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

// @route   POST /api/candidate-auth/first-login
// @desc    Candidate first login using temporary password and single-use token
// @access  Public (Rate-limited)
router.post(
  '/first-login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
    body('tempPassword').notEmpty().withMessage('Temporary password is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, tempPassword, token } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      const candidate = await Candidate.findOne({ email: normalizedEmail }).select(
        '+passwordHash +tempCredential.tokenHash +tempCredential.expiresAt +tempCredential.used'
      );

      if (!candidate) {
        return res.status(401).json({ success: false, message: 'Invalid credentials or invite details.' });
      }

      if (candidate.accountStatus === 'disabled') {
        return res.status(403).json({ success: false, message: 'This candidate account is currently disabled.' });
      }

      // Check if temp credentials were already used
      if (candidate.tempCredential?.used) {
        return res.status(400).json({
          success: false,
          code: 'INVITE_ALREADY_USED',
          message: 'This invitation link has already been used. Please log in with your permanent password.',
          isUsed: true,
        });
      }

      // Check expiration
      if (candidate.tempCredential?.expiresAt && new Date(candidate.tempCredential.expiresAt) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Invitation link has expired (valid for 72 hours). Please contact your recruiter for a new invite.',
          isExpired: true,
        });
      }

      // Match temporary password
      const isPasswordMatch = await candidate.matchPassword(tempPassword);
      if (!isPasswordMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect temporary password.' });
      }

      // If invite token was provided in URL, verify token hash as well
      if (token && candidate.tempCredential?.tokenHash) {
        const isTokenMatch = await candidate.matchToken(token);
        if (!isTokenMatch) {
          return res.status(401).json({ success: false, message: 'Invalid security token.' });
        }
      }

      // Mark temp credential as used
      if (candidate.tempCredential) {
        candidate.tempCredential.used = true;
      }
      await candidate.save();

      // Issue temporary reset token valid for password setup
      const resetToken = generateCandidateResetToken(candidate._id, candidate.email);

      res.json({
        success: true,
        mustResetPassword: true,
        resetToken,
        candidate: formatCandidateResponse(candidate),
        message: 'Temporary password verified. Please set your permanent password to continue.',
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// @route   POST /api/candidate-auth/set-password
// @desc    Set new permanent password after first login
// @access  Protected by scoped reset token
router.post(
  '/set-password',
  protectCandidateReset,
  [
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[a-zA-Z]/)
      .withMessage('Password must contain at least one letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),
  ],
  validate,
  async (req, res) => {
    try {
      const { newPassword } = req.body;
      const candidate = req.candidate;

      // Hash new permanent password
      const salt = await bcrypt.genSalt(12);
      candidate.passwordHash = await bcrypt.hash(newPassword, salt);
      candidate.mustResetPassword = false;
      candidate.accountStatus = 'active';

      await candidate.save();

      // Issue full candidate portal token
      const sessionToken = generateCandidateToken(candidate._id, candidate.email);

      res.json({
        success: true,
        message: 'Password set successfully. Welcome to your portal!',
        token: sessionToken,
        candidate: formatCandidateResponse(candidate),
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// @route   POST /api/candidate-auth/login
// @desc    Standard login for active candidates
// @access  Public (Rate-limited)
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      const candidate = await Candidate.findOne({ email: normalizedEmail }).select('+passwordHash');

      if (!candidate) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (candidate.accountStatus === 'disabled') {
        return res.status(403).json({ success: false, message: 'This candidate account has been disabled' });
      }

      const isMatch = await candidate.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      // If mustResetPassword is still true
      if (candidate.mustResetPassword || candidate.accountStatus === 'invited') {
        const resetToken = generateCandidateResetToken(candidate._id, candidate.email);
        return res.json({
          success: true,
          mustResetPassword: true,
          resetToken,
          candidate: formatCandidateResponse(candidate),
          message: 'Temporary password verified. Please set your new permanent password.',
        });
      }

      const token = generateCandidateToken(candidate._id, candidate.email);

      res.json({
        success: true,
        token,
        candidate: formatCandidateResponse(candidate),
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// @route   GET /api/candidate-auth/me
// @desc    Get current candidate profile
// @access  Protected (Candidate Session)
router.get('/me', protectCandidate, async (req, res) => {
  res.json({
    success: true,
    candidate: formatCandidateResponse(req.candidate),
  });
});

// @route   PUT /api/candidate-auth/onboarding
// @desc    Submit or update candidate onboarding details & resume upload
// @access  Protected (Candidate Session)
router.put('/onboarding', protectCandidate, uploadResume.single('resume'), async (req, res) => {
  try {
    const candidate = req.candidate;
    const {
      firstName,
      lastName,
      phone,
      currentCity,
      preferredJobCities,
      preferredJobTitles,
      visaStatus,
      jobExperiences,
    } = req.body;

    if (firstName) candidate.firstName = firstName.trim();
    if (lastName) candidate.lastName = lastName.trim();
    if (phone !== undefined) candidate.phone = phone.trim();
    if (currentCity !== undefined) candidate.currentCity = currentCity.trim();
    if (visaStatus !== undefined) candidate.visaStatus = visaStatus.trim();

    // Parse job experiences (array of { jobTitle, experience })
    if (jobExperiences !== undefined) {
      let parsedExp = [];
      if (typeof jobExperiences === 'string') {
        try {
          parsedExp = JSON.parse(jobExperiences);
        } catch {
          parsedExp = [];
        }
      } else if (Array.isArray(jobExperiences)) {
        parsedExp = jobExperiences;
      }
      candidate.jobExperiences = (Array.isArray(parsedExp) ? parsedExp : [])
        .map((exp) => ({
          jobTitle: (exp.jobTitle || '').trim(),
          experience: (exp.experience || '').trim(),
        }))
        .filter((exp) => exp.jobTitle || exp.experience);
    }

    // Parse preferred job cities (can be JSON array string or array)
    if (preferredJobCities) {
      let parsedCities = [];
      if (typeof preferredJobCities === 'string') {
        try {
          parsedCities = JSON.parse(preferredJobCities);
        } catch {
          parsedCities = preferredJobCities.split(',').map((c) => c.trim()).filter(Boolean);
        }
      } else if (Array.isArray(preferredJobCities)) {
        parsedCities = preferredJobCities;
      }
      candidate.preferredJobCities = parsedCities;
    }

    // Parse preferred job titles (can be JSON array string or array)
    if (preferredJobTitles) {
      let parsedTitles = [];
      if (typeof preferredJobTitles === 'string') {
        try {
          parsedTitles = JSON.parse(preferredJobTitles);
        } catch {
          parsedTitles = preferredJobTitles.split(',').map((t) => t.trim()).filter(Boolean);
        }
      } else if (Array.isArray(preferredJobTitles)) {
        parsedTitles = preferredJobTitles;
      }
      candidate.preferredJobTitles = parsedTitles;
    }

    // Process resume file if uploaded
    if (req.file) {
      // If candidate already had an old resume file, delete it from disk
      if (candidate.resume?.path && fs.existsSync(candidate.resume.path)) {
        try {
          fs.unlinkSync(candidate.resume.path);
        } catch (unlinkErr) {
          console.error('Error removing old resume file:', unlinkErr);
        }
      }

      candidate.resume = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date(),
      };
    }

    candidate.isOnboarded = true;
    candidate.onboardedAt = new Date();
    await candidate.save();

    res.json({
      success: true,
      message: 'Onboarding profile saved successfully!',
      candidate: formatCandidateResponse(candidate),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/candidate-auth/resume
// @desc    Download own resume file
// @access  Protected (Candidate Session)
router.get('/resume', protectCandidate, async (req, res) => {
  try {
    const candidate = req.candidate;
    if (!candidate.resume?.path || !fs.existsSync(candidate.resume.path)) {
      return res.status(404).json({ success: false, message: 'Resume file not found' });
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(candidate.resume.originalName || 'resume.pdf')}"`
    );
    res.setHeader('Content-Type', candidate.resume.mimetype || 'application/octet-stream');
    res.sendFile(path.resolve(candidate.resume.path));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/candidate-auth/ats-resume
// @desc    Download candidate ATS-friendly resume uploaded by recruiter
// @access  Protected (Candidate Session)
router.get('/ats-resume', protectCandidate, async (req, res) => {
  try {
    const candidate = req.candidate;
    if (!candidate.atsResume?.path || !fs.existsSync(candidate.atsResume.path)) {
      return res.status(404).json({ success: false, message: 'ATS-friendly resume not available yet' });
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(candidate.atsResume.originalName || 'ATS_Resume.pdf')}"`
    );
    res.setHeader('Content-Type', candidate.atsResume.mimetype || 'application/octet-stream');
    res.sendFile(path.resolve(candidate.atsResume.path));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/candidate-auth/application-metrics
// @desc    Get marketing application metrics for logged-in candidate
// @access  Protected (Candidate Session)
router.get('/application-metrics', protectCandidate, async (req, res) => {
  try {
    const candidate = req.candidate;
    const fullName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();

    // Query marketing records matching candidate ID, Email, or Name
    const queryConditions = [{ 'candidates.candidateId': candidate._id }];
    if (candidate.email) {
      queryConditions.push({ 'candidates.candidateEmail': candidate.email.toLowerCase() });
    }
    if (fullName) {
      queryConditions.push({
        'candidates.candidateName': { $regex: new RegExp(`^${fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
    }

    const marketingLogs = await Marketing.find({ $or: queryConditions }).sort({ entryDate: -1, createdAt: -1 });

    let totalLongApplications = 0;
    let totalEasyApplications = 0;
    let totalApplications = 0;

    const submissions = marketingLogs.map((log) => {
      const longApps = log.longApplicationsSubmitted || 0;
      const easyApps = log.easyApplicationsSubmitted || 0;
      const totalApps = log.totalApplications || longApps + easyApps;

      totalLongApplications += longApps;
      totalEasyApplications += easyApps;
      totalApplications += totalApps;

      const matchedCandidate = log.candidates?.find(
        (c) =>
          c.candidateId?.toString() === candidate._id.toString() ||
          (c.candidateEmail && c.candidateEmail.toLowerCase() === candidate.email?.toLowerCase()) ||
          (c.candidateName && c.candidateName.toLowerCase() === fullName.toLowerCase())
      ) || log.candidates?.[0];

      return {
        id: log._id,
        date: log.entryDate || log.createdAt,
        recruiterName: log.employeeName || 'Assigned Marketing Specialist',
        jobTitle: matchedCandidate?.jobTitle || '',
        experience: matchedCandidate ? `${matchedCandidate.experienceYears || 0}y ${matchedCandidate.experienceMonths || 0}m` : '',
        longApplications: longApps,
        easyApplications: easyApps,
        totalApplications: totalApps,
        notes: log.notes || '',
      };
    });

    res.json({
      success: true,
      metrics: {
        totalLongApplications,
        totalEasyApplications,
        totalApplications,
        submissionCount: marketingLogs.length,
        submissions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
