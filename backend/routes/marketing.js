import express from 'express';
import { body, validationResult } from 'express-validator';
import Marketing from '../models/Marketing.js';
import { protect } from '../middleware/auth.js';
import xlsx from 'xlsx';
import { INTERVIEW_STAGES } from '../utils/calculations.js';

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
      'TL Name': r.teamLeaderName,
      'Recruiter Name': r.employeeName,
      'Date': r.entryDate ? r.entryDate.toISOString().split('T')[0] : '',
      'Candidates': r.candidates ? r.candidates.length : 0,
      'Total Applications': r.totalApplications,
      'Assessments': r.assessmentsReceived,
      'Screening Calls': r.screeningCallsCompleted,
      'Total Interviews': r.totalInterviews,
      'Notes': r.notes || ''
    }));

    const ws = xlsx.utils.json_to_sheet(exportData);
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

const applyMetrics = (body) => {
  const longApps = body.longApplicationsSubmitted || 0;
  const easyApps = body.easyApplicationsSubmitted || 0;
  const totalApplications = longApps + easyApps;

  let interviewStages = body.interviewStages || [];
  if (interviewStages.length === 0) {
    interviewStages = INTERVIEW_STAGES.map((stage) => ({
      stage,
      scheduled: 0,
      completed: 0,
    }));
  }

  const totalInterviews =
    body.totalInterviews ??
    interviewStages.reduce((sum, s) => sum + (s.completed || 0), 0);

  return {
    ...body,
    totalApplications,
    totalInterviews,
    interviewStages,
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

router.get('/:id', protect, async (req, res) => {
  try {
    const record = await Marketing.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post(
  '/',
  protect,
  [
    body('teamLeaderName').trim().notEmpty().withMessage('Team leader name is required'),
    body('employeeName').trim().notEmpty().withMessage('Employee name is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const data = applyMetrics(req.body);
      const record = await Marketing.create({
        ...data,
        createdBy: req.user._id,
      });
      res.status(201).json({ success: true, data: record });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.put('/:id', protect, async (req, res) => {
  try {
    const data = applyMetrics(req.body);
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
