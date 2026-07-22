import express from 'express';
import { body, validationResult } from 'express-validator';
import LeadGeneration from '../models/LeadGeneration.js';
import { protect } from '../middleware/auth.js';
import xlsx from 'xlsx';
import {
  calculateLeadGenerationMetrics,
  CONNECTION_RANGES,
  LEAD_GEN_TARGETS,
} from '../utils/calculations.js';

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

const applyMetrics = (body) => {
  const metrics = calculateLeadGenerationMetrics(body);
  return { ...body, ...metrics };
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

    const records = await LeadGeneration.find(filter).sort({ createdAt: -1 }).lean();
    
    const exportData = records.map(r => ({
      'Employee Name': r.employeeName,
      'Date': r.entryDate ? r.entryDate.toISOString().split('T')[0] : '',
      'LinkedIn Accounts': r.linkedInAccountsCount,
      'Resume Leads': r.dailyResumeLeads,
      'Chat Leads': r.dailyChatLeads,
      'Total Leads': r.totalLeadsGenerated,
      'Resume Ratio (%)': r.resumeLeadRatio,
      'Chat Ratio (%)': r.chatLeadRatio,
      'Targets Met': !r.targetsNotMet ? 'Yes' : 'No',
      'Notes': r.notes || ''
    }));

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Lead Generation');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename="lead-generation.xlsx"');
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
      LeadGeneration.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
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
    const record = await LeadGeneration.findById(req.params.id);
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
    body('employeeName').trim().notEmpty().withMessage('Employee name is required'),
    body('dailyResumeLeads').isInt({ min: 0 }).withMessage('Resume leads must be a number'),
    body('dailyChatLeads').isInt({ min: 0 }).withMessage('Chat leads must be a number'),
  ],
  validate,
  async (req, res) => {
    try {
      const data = applyMetrics(req.body);
      const record = await LeadGeneration.create({
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
    const record = await LeadGeneration.findByIdAndUpdate(req.params.id, data, {
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
    const record = await LeadGeneration.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
