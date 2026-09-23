import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import UserActivityLog from '../models/UserActivityLog.js';
import LeadGeneration from '../models/LeadGeneration.js';
import Candidate from '../models/Candidate.js';
import Marketing from '../models/Marketing.js';
import Sales from '../models/Sales.js';
import { protect, authorize } from '../middleware/auth.js';
import { sendEmployeeInviteEmail } from '../utils/email.js';

const router = express.Router();

const generateSecureTempPassword = () => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%&*';

  let pwd = 'Vx!';
  for (let i = 0; i < 3; i++) {
    pwd += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  }
  for (let i = 0; i < 3; i++) {
    pwd += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  }
  for (let i = 0; i < 2; i++) {
    pwd += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  pwd += special.charAt(Math.floor(Math.random() * special.length));
  return pwd;
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

const createAuditLog = async ({ req, action, targetEmployee, details }) => {
  try {
    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action,
      targetEmployeeId: targetEmployee?._id,
      targetEmployeeName: targetEmployee?.name,
      details,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
    });
  } catch (err) {
    console.error('AuditLog error:', err);
  }
};

const getDateRangeFilter = (period, startDate, endDate) => {
  if (startDate && endDate) {
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    return { $gte: s, $lte: e };
  }

  const now = new Date();
  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { $gte: start, $lte: end };
  }
  if (period === 'week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    return { $gte: start, $lte: end };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const end = new Date();
    return { $gte: start, $lte: end };
  }

  return null;
};

// All user management routes require Authentication AND Admin role
router.use(protect, authorize('admin'));

// GET /api/users/activity-summary - Admin aggregate every single user's activity
router.get('/activity-summary', async (req, res) => {
  try {
    const { period = 'all', startDate, endDate, role, search } = req.query;
    const dateRange = getDateRangeFilter(period, startDate, endDate);

    const userQuery = {};
    if (role && role !== 'all') {
      userQuery.role = role;
    }
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(userQuery).select('-password').sort({ name: 1 }).lean();

    // Query all records in date range
    const leadGenFilter = {};
    const marketingFilter = {};
    const candidateFilter = {};
    const salesFilter = {};
    const activityLogFilter = {};

    if (dateRange) {
      leadGenFilter.entryDate = dateRange;
      marketingFilter.entryDate = dateRange;
      candidateFilter.convertedAt = dateRange;
      salesFilter.entryDate = dateRange;
      activityLogFilter.timestamp = dateRange;
    }

    const [allLeads, allMarketing, allCandidates, allSales, allActivityLogs] = await Promise.all([
      LeadGeneration.find(leadGenFilter).lean(),
      Marketing.find(marketingFilter).lean(),
      Candidate.find(candidateFilter).lean(),
      Sales.find(salesFilter).lean(),
      UserActivityLog.find(activityLogFilter).lean(),
    ]);

    // Standard Lead Sources list
    const KNOWN_SOURCES = [
      'LinkedIn',
      'Dice',
      'CareerBuilder',
      'Monster',
      'Indeed',
      'Referral',
      'Cold Outreach',
      'Email Campaign',
      'Other',
    ];

    const userSummaries = users.map((u) => {
      const uIdStr = u._id.toString();
      const uNameLower = (u.name || '').trim().toLowerCase();

      // 1. Leads Generated & Breakdown by Source
      const userLeadRecords = allLeads.filter(
        (l) =>
          (l.createdBy && l.createdBy.toString() === uIdStr) ||
          (l.employeeName && l.employeeName.trim().toLowerCase() === uNameLower)
      );

      const leadSourcesCount = {};
      KNOWN_SOURCES.forEach((s) => {
        leadSourcesCount[s] = 0;
      });

      let totalLeadsGenerated = 0;
      let totalResumeLeads = 0;
      let totalChatLeads = 0;

      userLeadRecords.forEach((l) => {
        const sourceName = l.leadSource || 'LinkedIn';
        const profilesCount =
          l.linkedInProfiles && l.linkedInProfiles.length > 0
            ? l.linkedInProfiles.length
            : l.totalLeadsGenerated || l.dailyResumeLeads + l.dailyChatLeads || 1;

        totalLeadsGenerated += profilesCount;
        totalResumeLeads += l.dailyResumeLeads || 0;
        totalChatLeads += l.dailyChatLeads || 0;

        if (leadSourcesCount[sourceName] !== undefined) {
          leadSourcesCount[sourceName] += profilesCount;
        } else {
          leadSourcesCount['Other'] = (leadSourcesCount['Other'] || 0) + profilesCount;
        }
      });

      // 2. Sales / Outreach Calls Made & Duration
      let totalCallsMade = 0;
      let totalCallDurationSeconds = 0;
      let callsPickedUp = 0;
      let callsVoicemail = 0;
      let callsNotAnswered = 0;
      let callsCut = 0;
      let callsInterested = 0;
      let callsNotInterested = 0;

      // Extract calls from LeadGeneration.callLogs
      allLeads.forEach((l) => {
        if (Array.isArray(l.callLogs)) {
          l.callLogs.forEach((cl) => {
            const isMatch =
              (cl.callerId && cl.callerId.toString() === uIdStr) ||
              (cl.callerName && cl.callerName.trim().toLowerCase() === uNameLower);

            if (isMatch) {
              if (dateRange && cl.callDate) {
                const cd = new Date(cl.callDate);
                if (dateRange.$gte && cd < dateRange.$gte) return;
                if (dateRange.$lte && cd > dateRange.$lte) return;
              }

              totalCallsMade += 1;
              totalCallDurationSeconds += Number(cl.callDurationSeconds) || 0;

              if (cl.outcome === 'picked_up') callsPickedUp += 1;
              else if (cl.outcome === 'voicemail') callsVoicemail += 1;
              else if (cl.outcome === 'not_answered') callsNotAnswered += 1;
              else if (cl.outcome === 'call_cut') callsCut += 1;

              if (cl.interestStatus === 'Interested' || cl.isInterested) callsInterested += 1;
              else if (cl.interestStatus === 'Not Interested') callsNotInterested += 1;
            }
          });
        }
      });

      // Also sum from Sales records
      const userSalesRecords = allSales.filter(
        (s) =>
          (s.createdBy && s.createdBy.toString() === uIdStr) ||
          (s.salesExecutiveName && s.salesExecutiveName.trim().toLowerCase() === uNameLower)
      );
      userSalesRecords.forEach((s) => {
        if (totalCallsMade === 0 && s.dailyCallCount) {
          totalCallsMade += s.dailyCallCount || 0;
          callsVoicemail += s.voiceMailCount || 0;
          callsNotAnswered += s.notAnsweredCalls || 0;
          callsNotInterested += s.notInterestedCalls || 0;
          totalCallDurationSeconds += (s.callDurationMinutes || 0) * 60;
        }
      });

      const totalCallDurationMinutes = Math.round(totalCallDurationSeconds / 60);
      const callDurationFormatted = `${Math.floor(totalCallDurationMinutes / 60)}h ${totalCallDurationMinutes % 60}m`;

      // 3. Applications Submitted (Long vs Easy vs Total)
      const userMarketingRecords = allMarketing.filter(
        (m) =>
          (m.createdBy && m.createdBy.toString() === uIdStr) ||
          (m.employeeName && m.employeeName.trim().toLowerCase() === uNameLower)
      );

      let totalLongApplications = 0;
      let totalEasyApplications = 0;
      let totalApplications = 0;

      userMarketingRecords.forEach((m) => {
        const longApps = m.longApplicationsSubmitted || 0;
        const easyApps = m.easyApplicationsSubmitted || 0;
        const totalApps = m.totalApplications || longApps + easyApps;

        totalLongApplications += longApps;
        totalEasyApplications += easyApps;
        totalApplications += totalApps;
      });

      // 4. Profiles Converted to Candidate
      const userConvertedCandidates = allCandidates.filter(
        (c) => c.convertedBy && c.convertedBy.toString() === uIdStr
      );
      const candidatesConverted = userConvertedCandidates.length;
      const conversionRate =
        totalLeadsGenerated > 0 ? ((candidatesConverted / totalLeadsGenerated) * 100).toFixed(1) : '0.0';

      // 5. Activity Logs count & Last active date
      const userLogs = allActivityLogs.filter((al) => al.userId && al.userId.toString() === uIdStr);
      const lastLogin = u.lastLogin ? new Date(u.lastLogin) : null;
      let lastActive = lastLogin;

      userLogs.forEach((l) => {
        const logDate = new Date(l.timestamp || l.createdAt);
        if (!lastActive || logDate > lastActive) {
          lastActive = logDate;
        }
      });

      return {
        user: {
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          designation: u.designation || 'Staff',
          allowedModules: u.allowedModules || [],
          status: u.status || 'Active',
          lastLogin: u.lastLogin,
        },
        metrics: {
          totalLeadsGenerated,
          totalResumeLeads,
          totalChatLeads,
          leadSourcesBreakdown: leadSourcesCount,
          totalCallsMade,
          totalCallDurationSeconds,
          totalCallDurationMinutes,
          callDurationFormatted,
          callsPickedUp,
          callsVoicemail,
          callsNotAnswered,
          callsCut,
          callsInterested,
          callsNotInterested,
          totalLongApplications,
          totalEasyApplications,
          totalApplications,
          candidatesConverted,
          conversionRate,
          totalLogsCount: userLogs.length,
          lastActive,
        },
      };
    });

    // Overall Totals across all filtered users
    const totals = userSummaries.reduce(
      (acc, curr) => {
        acc.totalLeads += curr.metrics.totalLeadsGenerated;
        acc.totalCalls += curr.metrics.totalCallsMade;
        acc.totalCallMinutes += curr.metrics.totalCallDurationMinutes;
        acc.totalLongApps += curr.metrics.totalLongApplications;
        acc.totalEasyApps += curr.metrics.totalEasyApplications;
        acc.totalApps += curr.metrics.totalApplications;
        acc.totalConversions += curr.metrics.candidatesConverted;
        return acc;
      },
      {
        totalLeads: 0,
        totalCalls: 0,
        totalCallMinutes: 0,
        totalLongApps: 0,
        totalEasyApps: 0,
        totalApps: 0,
        totalConversions: 0,
      }
    );

    res.json({
      success: true,
      period,
      count: userSummaries.length,
      totals,
      data: userSummaries,
    });
  } catch (error) {
    console.error('Activity summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/live-activity-stream - Global live feed of employee actions
router.get('/live-activity-stream', async (req, res) => {
  try {
    const { limit = 50, module, actionType } = req.query;
    const filter = {};
    if (module && module !== 'all') filter.module = module;
    if (actionType && actionType !== 'all') filter.actionType = actionType;

    const stream = await UserActivityLog.find(filter)
      .populate('userId', 'name email role designation')
      .sort({ timestamp: -1, createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.json({ success: true, count: stream.length, data: stream });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/:id/activity-logs - Deep-dive timeline & breakdown for specific employee
router.get('/:id/activity-logs', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const { limit = 100, period = 'all', startDate, endDate } = req.query;
    const dateRange = getDateRangeFilter(period, startDate, endDate);

    const logFilter = { userId: user._id };
    if (dateRange) {
      logFilter.timestamp = dateRange;
    }

    const activityLogs = await UserActivityLog.find(logFilter)
      .sort({ timestamp: -1, createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    // Also collect recent entity records for rich timeline
    const [userLeads, userMarketing, userCandidates] = await Promise.all([
      LeadGeneration.find({
        $or: [{ createdBy: user._id }, { employeeName: user.name }],
        ...(dateRange ? { entryDate: dateRange } : {}),
      })
        .sort({ entryDate: -1, createdAt: -1 })
        .limit(30)
        .lean(),
      Marketing.find({
        $or: [{ createdBy: user._id }, { employeeName: user.name }],
        ...(dateRange ? { entryDate: dateRange } : {}),
      })
        .sort({ entryDate: -1, createdAt: -1 })
        .limit(30)
        .lean(),
      Candidate.find({
        convertedBy: user._id,
        ...(dateRange ? { convertedAt: dateRange } : {}),
      })
        .sort({ convertedAt: -1 })
        .limit(30)
        .lean(),
    ]);

    // Build timeline items
    const timeline = [...activityLogs.map((al) => ({ ...al, type: 'activity_log' }))];

    res.json({
      success: true,
      user,
      counts: {
        logs: activityLogs.length,
        leads: userLeads.length,
        marketingEntries: userMarketing.length,
        candidatesConverted: userCandidates.length,
      },
      activityLogs,
      recentLeads: userLeads,
      recentMarketing: userMarketing,
      recentCandidates: userCandidates,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/audit-logs - View audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users - List employees with search & filters
router.get('/', async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const andConditions = [];

    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { mobileNumber: { $regex: search, $options: 'i' } },
          { designation: { $regex: search, $options: 'i' } },
        ],
      });
    }

    if (role && role !== 'all') {
      andConditions.push({ role });
    }

    if (status && status !== 'all') {
      if (status === 'Active') {
        andConditions.push({
          $or: [{ status: 'Active' }, { status: { $exists: false } }],
        });
      } else {
        andConditions.push({ status });
      }
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const users = await User.find(query)
      .select('-password')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/:id - Get single employee
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'name email');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users - Admin create new employee
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email address is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, email, role, status, mobileNumber, designation, allowedModules } = req.body;

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email address is already in use' });
      }

      const validSystemModules = ['lead_generation', 'leads', 'candidates', 'marketing'];
      let modulesToAssign = [];

      if (Array.isArray(allowedModules) && allowedModules.length > 0) {
        modulesToAssign = allowedModules.filter((m) => validSystemModules.includes(m));
      }

      const allowedRoles = ['admin', 'lead_gen', 'sales', 'marketing', 'manager', 'employee'];
      const normalizedRole = allowedRoles.includes(role) ? role : 'employee';

      if (normalizedRole === 'admin') {
        modulesToAssign = validSystemModules;
      } else if (modulesToAssign.length === 0) {
        if (normalizedRole === 'lead_gen') modulesToAssign = ['lead_generation', 'leads'];
        else if (normalizedRole === 'sales') modulesToAssign = ['leads'];
        else if (normalizedRole === 'marketing') modulesToAssign = ['candidates', 'marketing'];
        else modulesToAssign = ['lead_generation', 'leads'];
      }

      const userStatus = status === 'Inactive' ? 'Inactive' : 'Active';

      const tempPassword = generateSecureTempPassword();
      const expiryDate = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

      const newUser = await User.create({
        name,
        email: email.toLowerCase(),
        password: tempPassword,
        mobileNumber: mobileNumber || '',
        designation: designation || '',
        role: normalizedRole,
        allowedModules: modulesToAssign,
        status: userStatus,
        isActive: userStatus === 'Active',
        accountStatus: 'invited',
        mustResetPassword: true,
        tempCredential: {
          expiresAt: expiryDate,
          used: false,
        },
        createdBy: req.user._id,
      });

      let emailSent = false;
      try {
        emailSent = await sendEmployeeInviteEmail({
          email: newUser.email,
          name: newUser.name,
          tempPassword,
          designation: newUser.designation,
          role: newUser.role,
          expiryHours: 72,
          adminEmail: req.user.email || 'admin@velvix.com',
        });
      } catch (emailErr) {
        console.error('Failed to send employee invite email:', emailErr);
      }

      await createAuditLog({
        req,
        action: 'CREATE_EMPLOYEE',
        targetEmployee: newUser,
        details: `Created employee "${newUser.name}" (${newUser.email}) - Designation: "${newUser.designation || 'N/A'}" with modules [${newUser.allowedModules.join(', ')}]. Invitation sent via email.`,
      });

      res.status(201).json({
        success: true,
        message: 'Employee account created and invitation email sent with temporary password.',
        emailSent,
        data: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          mobileNumber: newUser.mobileNumber,
          designation: newUser.designation,
          role: newUser.role,
          allowedModules: newUser.allowedModules,
          status: newUser.status,
          isActive: newUser.isActive,
          accountStatus: newUser.accountStatus,
          mustResetPassword: newUser.mustResetPassword,
          createdAt: newUser.createdAt,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// POST /api/users/:id/resend-invite - Resend employee temporary credentials email
router.post('/:id/resend-invite', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const tempPassword = generateSecureTempPassword();
    const expiryDate = new Date(Date.now() + 72 * 60 * 60 * 1000);

    user.password = tempPassword;
    user.mustResetPassword = true;
    user.accountStatus = 'invited';
    user.tempCredential = {
      expiresAt: expiryDate,
      used: false,
    };
    await user.save();

    let emailSent = false;
    try {
      emailSent = await sendEmployeeInviteEmail({
        email: user.email,
        name: user.name,
        tempPassword,
        designation: user.designation,
        role: user.role,
        expiryHours: 72,
        adminEmail: req.user.email || 'admin@velvix.com',
      });
    } catch (emailErr) {
      console.error('Failed to resend employee invite email:', emailErr);
    }

    await createAuditLog({
      req,
      action: 'RESEND_EMPLOYEE_INVITE',
      targetEmployee: user,
      details: `Resent invitation email with fresh temporary password to "${user.name}" (${user.email})`,
    });

    res.json({
      success: true,
      message: `Fresh invitation email sent successfully to ${user.email}`,
      emailSent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/users/:id - Admin update employee details / status / role / allowedModules / designation
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('+password');
      if (!user) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      const { name, email, mobileNumber, designation, role, status, allowedModules } = req.body;
      const changes = [];

      if (email && email.toLowerCase() !== user.email) {
        const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
        if (emailExists) {
          return res.status(400).json({ success: false, message: 'Email address is already in use by another user' });
        }
        changes.push(`email from ${user.email} to ${email.toLowerCase()}`);
        user.email = email.toLowerCase();
      }

      if (name && name !== user.name) {
        changes.push(`name from "${user.name}" to "${name}"`);
        user.name = name;
      }

      if (designation !== undefined && designation !== user.designation) {
        changes.push(`designation to "${designation}"`);
        user.designation = designation;
      }

      if (mobileNumber !== undefined && mobileNumber !== user.mobileNumber) {
        changes.push(`mobile number`);
        user.mobileNumber = mobileNumber;
      }

      if (role && role !== user.role) {
        const allowedRoles = ['admin', 'lead_gen', 'sales', 'marketing', 'manager', 'employee'];
        if (allowedRoles.includes(role)) {
          changes.push(`role from ${user.role} to ${role}`);
          user.role = role;
        }
      }

      const validSystemModules = ['lead_generation', 'leads', 'candidates', 'marketing'];
      if (user.role === 'admin') {
        user.allowedModules = validSystemModules;
      } else if (Array.isArray(allowedModules)) {
        const filteredModules = allowedModules.filter((m) => validSystemModules.includes(m));
        changes.push(`modules to [${filteredModules.join(', ')}]`);
        user.allowedModules = filteredModules;
      }

      if (status && status !== user.status) {
        changes.push(`status from ${user.status || 'Active'} to ${status}`);
        user.status = status;
        user.isActive = status === 'Active';
      }

      await user.save();

      const action = status !== undefined && status !== user.status
        ? (status === 'Inactive' ? 'DEACTIVATE_EMPLOYEE' : 'ACTIVATE_EMPLOYEE')
        : 'UPDATE_EMPLOYEE';

      await createAuditLog({
        req,
        action,
        targetEmployee: user,
        details: changes.length > 0 ? `Updated ${changes.join(', ')}` : 'Employee details updated',
      });

      res.json({
        success: true,
        message: 'Employee updated successfully',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          mobileNumber: user.mobileNumber,
          designation: user.designation,
          role: user.role,
          allowedModules: user.allowedModules,
          status: user.status,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// DELETE /api/users/:id - Admin delete employee account
router.delete('/:id', async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own administrator account',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    await createAuditLog({
      req,
      action: 'DELETE_EMPLOYEE',
      targetEmployee: user,
      details: `Admin deleted employee "${user.name}" (${user.email})`,
    });

    res.json({
      success: true,
      message: `Employee "${user.name}" has been permanently deleted`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users/:id/reset-password - Admin reset employee password
router.post(
  '/:id/reset-password',
  [body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')],
  validate,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('+password');
      if (!user) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      user.password = req.body.newPassword;
      user.passwordChangedAt = new Date();
      await user.save();

      await createAuditLog({
        req,
        action: 'RESET_PASSWORD',
        targetEmployee: user,
        details: `Admin reset password for employee "${user.name}" (${user.email})`,
      });

      res.json({
        success: true,
        message: `Password reset successfully for employee ${user.name}`,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
