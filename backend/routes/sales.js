import express from 'express';
import { body, validationResult } from 'express-validator';
import Sales from '../models/Sales.js';
import { protect } from '../middleware/auth.js';
import xlsx from 'xlsx';
import {
  calculateSalesMetrics,
  formatMinutesToDuration,
  SALES_TARGETS,
} from '../utils/calculations.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

const applyMetrics = (body) => {
  const metrics = calculateSalesMetrics(body);
  return {
    ...body,
    ...metrics,
    dailyCallDuration: body.dailyCallDuration || formatMinutesToDuration(metrics.callDurationMinutes),
  };
};

router.get('/export', protect, async (req, res) => {
  try {
    const { date, salesExecutiveName } = req.query;
    const filter = {};
    if (salesExecutiveName) filter.salesExecutiveName = new RegExp(salesExecutiveName, 'i');
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.entryDate = { $gte: start, $lte: end };
    }

    const records = await Sales.find(filter).sort({ createdAt: -1 }).lean();
    
    const exportData = records.map(r => ({
      'Sales Executive': r.salesExecutiveName,
      'Date': r.entryDate ? r.entryDate.toISOString().split('T')[0] : '',
      'Assigned Leads': r.dailyAssignedLeadsCount,
      'Self Sourced': r.extraSelfSourcedLeads,
      'Total Leads': r.totalAssignedLeads,
      'Call Count': r.dailyCallCount,
      'Call Duration (mins)': r.callDurationMinutes,
      'Not Answered': r.notAnsweredCalls,
      'Not Interested': r.notInterestedCalls,
      'Voicemail': r.voiceMailCount,
      'Follow Ups': r.followUpsRequired,
      'Interested': r.interestedCandidates,
      'Targets Met': !r.targetsNotMet ? 'Yes' : 'No',
      'Notes': r.notes || ''
    }));

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Sales');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename="sales.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/targets', protect, (req, res) => {
  res.json({
    success: true,
    data: {
      ...SALES_TARGETS,
      callDurationFormatted: '2h 30m',
    },
  });
});

router.get('/', protect, async (req, res) => {
  try {
    const { date, salesExecutiveName, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (salesExecutiveName) filter.salesExecutiveName = new RegExp(salesExecutiveName, 'i');
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.entryDate = { $gte: start, $lte: end };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      Sales.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Sales.countDocuments(filter),
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
    const record = await Sales.findById(req.params.id);
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
    body('salesExecutiveName').trim().notEmpty().withMessage('Sales executive name is required'),
    body('dailyCallCount').isInt({ min: 0 }).withMessage('Call count must be a number'),
  ],
  validate,
  async (req, res) => {
    try {
      const data = applyMetrics(req.body);
      const record = await Sales.create({
        ...data,
        createdBy: req.user._id,
      });
      
      if (record.targetsNotMet) {
        const dateStr = record.entryDate ? new Date(record.entryDate).toLocaleDateString() : 'today';
        sendEmail({
          email: req.user.email,
          subject: 'Daily Targets Not Met - Sales',
          message: `Hello ${req.user.name},\n\nYou did not meet your daily sales targets for ${dateStr}.\n\nPlease review your activity and ensure you are on track.`,
        }).catch(err => console.error("Email error:", err));
      }

      res.status(201).json({ success: true, data: record });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.put('/:id', protect, async (req, res) => {
  try {
    const data = applyMetrics(req.body);
    const record = await Sales.findByIdAndUpdate(
      req.params.id,
      { ...data },
      { new: true, runValidators: true }
    );

    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    if (record.targetsNotMet) {
      const dateStr = record.entryDate ? new Date(record.entryDate).toLocaleDateString() : 'today';
      sendEmail({
        email: req.user.email,
        subject: 'Daily Targets Not Met - Sales (Updated)',
        message: `Hello ${req.user.name},\n\nYou recently updated an entry for ${dateStr} and still did not meet your daily sales targets.\n\nPlease review your activity and ensure you are on track.`,
      }).catch(err => console.error("Email error:", err));
    }

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const record = await Sales.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
