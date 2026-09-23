import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import LeadGeneration from '../models/LeadGeneration.js';
import Candidate from '../models/Candidate.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import xlsx from 'xlsx';
import {
  calculateLeadGenerationMetrics,
  CONNECTION_RANGES,
  LEAD_GEN_TARGETS,
} from '../utils/calculations.js';
import { sendEmail, sendCandidateInviteEmail } from '../utils/email.js';
import { createExportWorksheet } from '../utils/exportHelper.js';
import { logUserActivity } from '../utils/activityLogger.js';

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array(), message: errors.array()[0].msg });
  }
  next();
};

const applyMetrics = (body) => {
  const metrics = calculateLeadGenerationMetrics(body);
  return { ...body, ...metrics };
};

const generateSecureTempPassword = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%&*';
  
  let result = 'Vx!';
  for (let i = 0; i < 4; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  for (let i = 0; i < 3; i++) {
    result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  return result;
};

// @route   GET /api/lead-generation/sales-team
// @desc    Get sales employees for the assignedTo dropdown
// @access  Protected (All authenticated employees)
router.get('/sales-team', protect, async (req, res) => {
  try {
    const salesTeam = await User.find({
      $or: [
        { allowedModules: 'leads' },
        { role: 'sales' },
        { role: 'admin' },
        { role: 'manager' },
      ],
      status: 'Active',
      isActive: true,
    })
      .select('_id name email role allowedModules mobileNumber')
      .sort({ role: 1, name: 1 })
      .lean();

    res.json({ success: true, data: salesTeam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/lead-generation/marketing-team
// @desc    Get marketing employees for the assignedTo dropdown
// @access  Protected (All authenticated employees)
router.get('/marketing-team', protect, async (req, res) => {
  try {
    const marketingTeam = await User.find({
      $or: [{ role: 'marketing' }, { role: 'admin' }, { role: 'manager' }],
      status: 'Active',
      isActive: true,
    })
      .select('_id name email role mobileNumber')
      .sort({ role: 1, name: 1 })
      .lean();

    res.json({ success: true, data: marketingTeam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/lead-generation/my-assigned-leads
// @desc    Get all leads assigned to the currently authenticated user
// @access  Protected
router.get('/my-assigned-leads', protect, async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === 'admin' || req.user.role === 'manager') {
      if (req.query.assignedTo) {
        filter.assignedTo = req.query.assignedTo;
      }
    } else if (req.user.role === 'marketing') {
      filter.assignedTo = req.user._id;
      filter.convertedToCandidateId = { $exists: true, $ne: null };
    } else {
      filter.assignedTo = req.user._id;
    }

    const assignedLeads = await LeadGeneration.find(filter)
      .populate('convertedToCandidateId', 'email firstName lastName accountStatus mustResetPassword tempCredential.expiresAt tempCredential.used')
      .populate('linkedInProfiles.convertedToCandidateId', 'email firstName lastName accountStatus mustResetPassword tempCredential.expiresAt tempCredential.used')
      .populate('convertedCandidateIds', 'email firstName lastName accountStatus mustResetPassword tempCredential.expiresAt tempCredential.used')
      .populate('assignedTo', 'name email role mobileNumber')
      .populate('createdBy', 'name email role')
      .sort({ entryDate: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, data: assignedLeads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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

    const records = await LeadGeneration.find(filter)
      .populate('convertedToCandidateId', 'email firstName lastName accountStatus mustResetPassword')
      .populate('linkedInProfiles.convertedToCandidateId', 'email firstName lastName accountStatus mustResetPassword')
      .populate('convertedCandidateIds', 'email firstName lastName accountStatus mustResetPassword')
      .populate('assignedTo', 'name email role')
      .sort({ createdAt: -1 })
      .lean();
    
    const exportData = records.map(r => {
      const profilesStr = r.linkedInProfiles?.length
        ? r.linkedInProfiles.map(p => `${p.profileName || 'Unnamed'}${p.email ? ` <${p.email}>` : ''}${p.phone ? ` (${p.phone})` : ''}${p.url ? ` - ${p.url}` : ''}`).join('; ')
        : (r.linkedInProfileNames || '');

      return {
        'Employee Name': r.employeeName || '',
        'Date': r.entryDate ? new Date(r.entryDate).toISOString().split('T')[0] : '',
        'Profiles': profilesStr,
        'Connections Range': (r.connectionsRange || []).join(', '),
        'Lead Source': r.leadSource || 'LinkedIn',
        'Assigned To': r.assignedTo ? `${r.assignedTo.name} (${r.assignedTo.email})` : 'Unassigned',
        'Daily Resume Leads': r.dailyResumeLeads || 0,
        'Daily Chat Leads': r.dailyChatLeads || 0,
        'Total Leads Generated': r.totalLeadsGenerated || 0,
        'Converted To Candidate': r.convertedToCandidateId ? (r.convertedToCandidateId.email || 'Yes') : 'No',
        'Notes': r.notes || '',
      };
    });

    const ws = createExportWorksheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Leads');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename="leads.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/targets', protect, (req, res) => {
  res.json({ success: true, data: LEAD_GEN_TARGETS });
});

router.get('/connection-ranges', protect, (req, res) => {
  res.json({ success: true, data: CONNECTION_RANGES });
});

router.get('/', protect, async (req, res) => {
  try {
    const { date, employeeName, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (employeeName) filter.employeeName = new RegExp(employeeName, 'i');
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.entryDate = { $gte: start, $lte: end };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      LeadGeneration.find(filter)
        .populate('convertedToCandidateId', 'email firstName lastName accountStatus mustResetPassword tempCredential.expiresAt tempCredential.used')
        .populate('linkedInProfiles.convertedToCandidateId', 'email firstName lastName accountStatus mustResetPassword tempCredential.expiresAt tempCredential.used')
        .populate('convertedCandidateIds', 'email firstName lastName accountStatus mustResetPassword tempCredential.expiresAt tempCredential.used')
        .populate('assignedTo', 'name email role mobileNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LeadGeneration.countDocuments(filter),
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

router.get('/:id', protect, async (req, res) => {
  try {
    const record = await LeadGeneration.findById(req.params.id)
      .populate('convertedToCandidateId', 'email firstName lastName accountStatus mustResetPassword tempCredential.expiresAt tempCredential.used')
      .populate('linkedInProfiles.convertedToCandidateId', 'email firstName lastName accountStatus mustResetPassword tempCredential.expiresAt tempCredential.used')
      .populate('convertedCandidateIds', 'email firstName lastName accountStatus mustResetPassword tempCredential.expiresAt tempCredential.used')
      .populate('assignedTo', 'name email role mobileNumber');
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/leads/:id/convert-to-candidate or /api/lead-generation/:id/convert-to-candidate
// @desc    Convert specific lead profile to candidate, generate temp credentials & send portal invite email
// @access  Protected (Employee)
router.post(
  '/:id/convert-to-candidate',
  protect,
  [
    body('email')
      .isEmail()
      .withMessage('A valid candidate email address is required')
      .normalizeEmail(),
  ],
  validate,
  async (req, res) => {
    try {
      const leadId = req.params.id;
      const { email, firstName, lastName, phone, assignedTo, profileId, profileName } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      // Step 1: Duplicate check against Candidate collection (case-insensitive)
      const existingCandidate = await Candidate.findOne({ email: normalizedEmail });
      if (existingCandidate) {
        return res.status(400).json({
          success: false,
          code: 'DUPLICATE_CANDIDATE',
          message: `A candidate with email "${normalizedEmail}" already exists.`,
        });
      }

      // Step 2: Check Lead existence
      const lead = await LeadGeneration.findById(leadId);
      if (!lead) {
        return res.status(404).json({ success: false, message: 'Lead record not found' });
      }

      // Step 3: Check if this specific profile in linkedInProfiles has already been converted
      let matchedProfileIndex = -1;
      if (lead.linkedInProfiles && lead.linkedInProfiles.length > 0) {
        matchedProfileIndex = lead.linkedInProfiles.findIndex(
          (p) =>
            (profileId && p._id && p._id.toString() === profileId.toString()) ||
            (profileName && p.profileName && p.profileName.trim().toLowerCase() === profileName.trim().toLowerCase()) ||
            (p.email && p.email.toLowerCase() === normalizedEmail) ||
            (firstName && p.profileName && p.profileName.toLowerCase().includes(firstName.toLowerCase()))
        );

        if (matchedProfileIndex === -1 && lead.linkedInProfiles.length === 1) {
          matchedProfileIndex = 0;
        }
      }

      if (matchedProfileIndex !== -1) {
        const targetProfile = lead.linkedInProfiles[matchedProfileIndex];
        if (targetProfile.convertedToCandidateId) {
          return res.status(400).json({
            success: false,
            code: 'PROFILE_ALREADY_CONVERTED',
            message: `This person profile (${targetProfile.profileName || normalizedEmail}) has already been converted to a candidate.`,
          });
        }
      }

      // Step 4: Determine candidate names from body or prefill from lead
      let resolvedFirstName = firstName?.trim();
      let resolvedLastName = lastName?.trim();

      if (!resolvedFirstName && !resolvedLastName) {
        if (matchedProfileIndex !== -1 && lead.linkedInProfiles[matchedProfileIndex].profileName) {
          const parts = lead.linkedInProfiles[matchedProfileIndex].profileName.trim().split(' ');
          resolvedFirstName = parts[0] || 'Candidate';
          resolvedLastName = parts.slice(1).join(' ') || '';
        } else if (lead.employeeName) {
          const parts = lead.employeeName.trim().split(' ');
          resolvedFirstName = parts[0] || 'Candidate';
          resolvedLastName = parts.slice(1).join(' ') || '';
        }
      }

      // Step 5: Generate temporary password and single-use invite token
      const tempPassword = generateSecureTempPassword();
      const inviteToken = crypto.randomBytes(32).toString('hex');

      // Step 6: Hash temp credentials with bcrypt (never save in plaintext)
      const passwordSalt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(tempPassword, passwordSalt);

      const tokenSalt = await bcrypt.genSalt(10);
      const tokenHash = await bcrypt.hash(inviteToken, tokenSalt);

      // Step 7: Configurable expiry window (default 72 hours)
      const expiryHours = parseInt(process.env.CANDIDATE_INVITE_EXPIRY_HOURS, 10) || 72;
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

      // Step 8: Create Candidate record
      const candidate = await Candidate.create({
        firstName: resolvedFirstName || 'Candidate',
        lastName: resolvedLastName || '',
        email: normalizedEmail,
        phone: phone?.trim() || '',
        sourceLeadId: lead._id,
        assignedTo: assignedTo || null,
        convertedBy: req.user._id,
        convertedAt: new Date(),
        accountStatus: 'invited',
        mustResetPassword: true,
        passwordHash,
        tempCredential: {
          tokenHash,
          expiresAt,
          used: false,
        },
      });

      // Step 9: Send transactional invite email
      await sendCandidateInviteEmail({
        email: candidate.email,
        firstName: candidate.firstName,
        tempPassword,
        inviteToken,
        expiryHours,
        recruiterEmail: req.user.email || 'recruiting@velvix.com',
      });

      // Step 10: Update Lead and specific profile record
      if (matchedProfileIndex !== -1) {
        lead.linkedInProfiles[matchedProfileIndex].convertedToCandidateId = candidate._id;
        lead.linkedInProfiles[matchedProfileIndex].convertedAt = candidate.convertedAt;
        lead.linkedInProfiles[matchedProfileIndex].interestStatus = 'Converted';
        lead.linkedInProfiles[matchedProfileIndex].isInterested = true;
        if (!lead.linkedInProfiles[matchedProfileIndex].email) {
          lead.linkedInProfiles[matchedProfileIndex].email = normalizedEmail;
        }
        if (phone && !lead.linkedInProfiles[matchedProfileIndex].phone) {
          lead.linkedInProfiles[matchedProfileIndex].phone = phone.trim();
        }
      }

      lead.convertedToCandidateId = candidate._id;
      lead.convertedAt = candidate.convertedAt;
      if (!lead.convertedCandidateIds) {
        lead.convertedCandidateIds = [];
      }
      if (!lead.convertedCandidateIds.includes(candidate._id)) {
        lead.convertedCandidateIds.push(candidate._id);
      }
      if (assignedTo && !lead.assignedTo) {
        lead.assignedTo = assignedTo;
      }
      await lead.save();

      // Step 11: If assigned, create an in-app notification for the marketing recruiter
      if (assignedTo) {
        try {
          await Notification.create({
            userId: assignedTo,
            title: 'New Candidate Assigned',
            message: `Candidate ${candidate.firstName} ${candidate.lastName} (${candidate.email}) has been assigned to you.`,
            type: 'info',
          });
        } catch (notifErr) {
          console.error('Notification creation failed:', notifErr);
        }
      }

      // Log Candidate Conversion Activity
      logUserActivity({
        req,
        module: 'candidates',
        actionType: 'candidate_converted',
        title: `Converted ${candidate.firstName} ${candidate.lastName} to Candidate`,
        description: `Lead profile converted to onboarded candidate (${candidate.email}).`,
        metadata: {
          candidateId: candidate._id,
          candidateName: `${candidate.firstName} ${candidate.lastName}`.trim(),
          candidateEmail: candidate.email,
          leadSource: lead.leadSource || 'LinkedIn',
        },
      });

      // Step 12: Return clean response without plaintext credentials
      res.status(201).json({
        success: true,
        message: `Candidate created and invite sent to ${candidate.email}`,
        data: {
          candidateId: candidate._id,
          email: candidate.email,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          status: candidate.accountStatus,
          assignedTo: candidate.assignedTo,
          convertedAt: candidate.convertedAt,
        },
      });
    } catch (error) {
      console.error('Lead conversion error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// @route   POST /api/leads/:id/resend-candidate-invite or /api/lead-generation/:id/resend-candidate-invite
// @desc    Resend candidate portal invite with fresh temp credentials and 72h window
// @access  Protected (Employee)
router.post('/:id/resend-candidate-invite', protect, async (req, res) => {
  try {
    const leadId = req.params.id;
    const { candidateId: reqCandidateId } = req.body || {};
    const lead = await LeadGeneration.findById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead record not found' });
    }

    const candidateIdToUse = reqCandidateId || lead.convertedToCandidateId;
    if (!candidateIdToUse) {
      return res.status(400).json({
        success: false,
        message: 'This lead has not been converted to a candidate yet.',
      });
    }

    const candidate = await Candidate.findById(candidateIdToUse);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Associated candidate record not found' });
    }

    if (candidate.accountStatus === 'active' && !candidate.mustResetPassword) {
      return res.status(400).json({
        success: false,
        message: 'Candidate has already activated their account and set their password.',
      });
    }

    // Generate new credentials
    const tempPassword = generateSecureTempPassword();
    const inviteToken = crypto.randomBytes(32).toString('hex');

    const passwordSalt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, passwordSalt);

    const tokenSalt = await bcrypt.genSalt(10);
    const tokenHash = await bcrypt.hash(inviteToken, tokenSalt);

    const expiryHours = parseInt(process.env.CANDIDATE_INVITE_EXPIRY_HOURS, 10) || 72;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    candidate.passwordHash = passwordHash;
    candidate.accountStatus = 'invited';
    candidate.mustResetPassword = true;
    candidate.tempCredential = {
      tokenHash,
      expiresAt,
      used: false,
    };
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
      message: `Fresh invite email sent to ${candidate.email}`,
      data: {
        candidateId: candidate._id,
        email: candidate.email,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/leads/:id/call-log or /api/lead-generation/:id/call-log
// @desc    Log a phone call made to a lead profile (call duration, outcome: picked up/call cut/voicemail/not answered, interest, follow up date/time)
// @access  Protected (Sales / Staff)
router.post(
  '/:id/call-log',
  protect,
  [
    body('outcome')
      .isIn(['picked_up', 'call_cut', 'voicemail', 'not_answered'])
      .withMessage('A valid call outcome is required (picked_up, call_cut, voicemail, not_answered)'),
  ],
  validate,
  async (req, res) => {
    try {
      const leadId = req.params.id;
      const {
        profileId,
        profileName,
        phone,
        callDuration = '00:00',
        callDurationSeconds = 0,
        outcome,
        isInterested = false,
        interestStatus = 'Pending',
        followUpDate = null,
        notes = '',
      } = req.body;

      const lead = await LeadGeneration.findById(leadId);
      if (!lead) {
        return res.status(404).json({ success: false, message: 'Lead record not found' });
      }

      const parsedFollowUpDate = followUpDate ? new Date(followUpDate) : null;
      const actualDurationSec = Number(callDurationSeconds) || 0;
      const actualDurationStr =
        callDuration && callDuration !== '00:00'
          ? callDuration
          : actualDurationSec > 0
          ? `${Math.floor(actualDurationSec / 60)}m ${actualDurationSec % 60}s`
          : '00:00';

      const callLogEntry = {
        profileId: profileId || null,
        profileName: profileName || lead.employeeName || 'Contact',
        phone: phone || '',
        callerId: req.user._id,
        callerName: req.user.name || 'Sales Representative',
        callDate: new Date(),
        callDuration: actualDurationStr,
        callDurationSeconds: actualDurationSec,
        outcome,
        isInterested: outcome === 'picked_up' ? Boolean(isInterested) : false,
        interestStatus:
          outcome === 'picked_up'
            ? interestStatus || (isInterested ? 'Interested' : 'Not Interested')
            : 'N/A',
        followUpDate: parsedFollowUpDate,
        notes: notes?.trim() || '',
        createdAt: new Date(),
      };

      if (!lead.callLogs) {
        lead.callLogs = [];
      }
      lead.callLogs.unshift(callLogEntry);

      // Update specific profile inside lead.linkedInProfiles if matched
      if (lead.linkedInProfiles && lead.linkedInProfiles.length > 0) {
        let profileIndex = -1;
        if (profileId) {
          profileIndex = lead.linkedInProfiles.findIndex(
            (p) => p._id && p._id.toString() === profileId.toString()
          );
        }
        if (profileIndex === -1 && phone) {
          profileIndex = lead.linkedInProfiles.findIndex(
            (p) => p.phone && p.phone.trim() === phone.trim()
          );
        }
        if (profileIndex === -1 && profileName) {
          profileIndex = lead.linkedInProfiles.findIndex(
            (p) => p.profileName && p.profileName.toLowerCase() === profileName.toLowerCase()
          );
        }
        if (profileIndex === -1 && lead.linkedInProfiles.length === 1) {
          profileIndex = 0;
        }

        if (profileIndex !== -1) {
          lead.linkedInProfiles[profileIndex].lastCallStatus = outcome;
          lead.linkedInProfiles[profileIndex].lastCallDuration = actualDurationStr;
          lead.linkedInProfiles[profileIndex].isInterested =
            outcome === 'picked_up' ? Boolean(isInterested) : false;
          lead.linkedInProfiles[profileIndex].interestStatus =
            outcome === 'picked_up'
              ? interestStatus || (isInterested ? 'Interested' : 'Not Interested')
              : '';
          lead.linkedInProfiles[profileIndex].followUpDate = parsedFollowUpDate;
          lead.linkedInProfiles[profileIndex].lastCalledAt = new Date();
          lead.linkedInProfiles[profileIndex].callCount =
            (lead.linkedInProfiles[profileIndex].callCount || 0) + 1;
        }
      }

      await lead.save();

      // If a follow up date is scheduled, create a notification reminder
      if (parsedFollowUpDate) {
        try {
          await Notification.create({
            userId: req.user._id,
            title: 'Follow-Up Call Scheduled',
            message: `Follow-up call with ${profileName || lead.employeeName || 'lead'} scheduled for ${parsedFollowUpDate.toLocaleString()}.`,
            type: 'reminder',
          });
        } catch (notifErr) {
          console.error('Follow-up notification creation error:', notifErr);
        }
      }

      const updatedLead = await LeadGeneration.findById(leadId)
        .populate('convertedToCandidateId', 'email firstName lastName accountStatus mustResetPassword tempCredential.expiresAt tempCredential.used')
        .populate('linkedInProfiles.convertedToCandidateId', 'email firstName lastName accountStatus mustResetPassword tempCredential.expiresAt tempCredential.used')
        .populate('convertedCandidateIds', 'email firstName lastName accountStatus mustResetPassword tempCredential.expiresAt tempCredential.used')
        .populate('assignedTo', 'name email role mobileNumber')
        .populate('createdBy', 'name email role');

      // Log Call Activity
      logUserActivity({
        req,
        module: 'leads',
        actionType: 'call_logged',
        title: `Logged call with ${profileName || lead.employeeName || 'Lead'} (${outcome})`,
        description: `Outcome: ${outcome}, Duration: ${actualDurationStr}, Interest: ${callLogEntry.interestStatus}.`,
        metadata: {
          callOutcome: outcome,
          callDuration: actualDurationStr,
          callDurationSeconds: actualDurationSec,
          interestStatus: callLogEntry.interestStatus,
          profileName: profileName || lead.employeeName,
          notes: notes?.trim() || '',
        },
      });

      res.status(201).json({
        success: true,
        message: 'Call logged successfully',
        data: updatedLead,
        callLog: callLogEntry,
      });
    } catch (error) {
      console.error('Call logging error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.post(
  '/',
  protect,
  async (req, res) => {
    try {
      const employeeName = req.body.employeeName?.trim() || req.user.name || 'Staff User';
      const profiles = Array.isArray(req.body.linkedInProfiles) ? req.body.linkedInProfiles : [];
      const profilesText = profiles.map(p => p.profileName || p.url || p.email).filter(Boolean).join('\n') || req.body.linkedInProfileNames || '';
      const accountsCount = req.body.linkedInAccountsCount !== undefined && req.body.linkedInAccountsCount !== ''
        ? Number(req.body.linkedInAccountsCount)
        : (profiles.length || 0);

      const leadSource = req.body.leadSource?.trim() || 'LinkedIn';
      const assignedTo = req.body.assignedTo ? req.body.assignedTo : null;

      const data = applyMetrics({
        ...req.body,
        employeeName,
        leadSource,
        assignedTo,
        dailyResumeLeads: Number(req.body.dailyResumeLeads) || 0,
        dailyChatLeads: Number(req.body.dailyChatLeads) || 0,
        linkedInProfiles: profiles,
        linkedInProfileNames: profilesText,
        linkedInAccountsCount: accountsCount,
      });

      const record = await LeadGeneration.create({
        ...data,
        createdBy: req.user._id,
      });

      // Log Lead Sourcing Activity
      const sourcedCount = profiles.length > 0 ? profiles.length : (record.totalLeadsGenerated || 1);
      logUserActivity({
        req,
        module: 'lead_generation',
        actionType: 'lead_created',
        title: `Sourced ${sourcedCount} lead(s) from ${leadSource}`,
        description: `${employeeName} added ${sourcedCount} prospective profile(s) via ${leadSource}.`,
        metadata: {
          leadSource,
          profileCount: sourcedCount,
          profileNames: profiles.map(p => p.profileName).filter(Boolean),
        },
      });

      const populatedRecord = await LeadGeneration.findById(record._id)
        .populate('assignedTo', 'name email role mobileNumber');

      res.status(201).json({ success: true, data: populatedRecord || record });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.put('/:id', protect, async (req, res) => {
  try {
    const existingRecord = await LeadGeneration.findById(req.params.id);
    if (!existingRecord) return res.status(404).json({ success: false, message: 'Record not found' });

    const employeeName = req.body.employeeName?.trim() || existingRecord.employeeName || req.user.name;
    const profiles = req.body.linkedInProfiles !== undefined
      ? (Array.isArray(req.body.linkedInProfiles) ? req.body.linkedInProfiles : [])
      : existingRecord.linkedInProfiles;
    const profilesText = profiles?.length
      ? profiles.map(p => p.profileName || p.url || p.email).filter(Boolean).join('\n')
      : (req.body.linkedInProfileNames || existingRecord.linkedInProfileNames || '');
    const accountsCount = req.body.linkedInAccountsCount !== undefined && req.body.linkedInAccountsCount !== ''
      ? Number(req.body.linkedInAccountsCount)
      : (profiles?.length || existingRecord.linkedInAccountsCount || 0);

    const leadSource = req.body.leadSource !== undefined ? (req.body.leadSource?.trim() || 'LinkedIn') : existingRecord.leadSource;
    const assignedTo = req.body.assignedTo !== undefined ? (req.body.assignedTo ? req.body.assignedTo : null) : existingRecord.assignedTo;

    const data = applyMetrics({
      ...req.body,
      employeeName,
      leadSource,
      assignedTo,
      dailyResumeLeads: req.body.dailyResumeLeads !== undefined ? (Number(req.body.dailyResumeLeads) || 0) : existingRecord.dailyResumeLeads,
      dailyChatLeads: req.body.dailyChatLeads !== undefined ? (Number(req.body.dailyChatLeads) || 0) : existingRecord.dailyChatLeads,
      linkedInProfiles: profiles,
      linkedInProfileNames: profilesText,
      linkedInAccountsCount: accountsCount,
    });

    const record = await LeadGeneration.findByIdAndUpdate(
      req.params.id,
      { ...data },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email role mobileNumber');

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const record = await LeadGeneration.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

