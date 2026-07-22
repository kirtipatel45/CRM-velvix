import express from 'express';
import LeadGeneration from '../models/LeadGeneration.js';
import Sales from '../models/Sales.js';
import Marketing from '../models/Marketing.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const tomorrow = new Date(targetDate);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateFilter = { entryDate: { $gte: targetDate, $lt: tomorrow } };

    const [leadGenToday, salesToday, marketingToday] = await Promise.all([
      LeadGeneration.find(dateFilter),
      Sales.find(dateFilter),
      Marketing.find(dateFilter),
    ]);

    const leadGenAlerts = leadGenToday.filter((r) => r.targetsNotMet).length;
    const salesAlerts = salesToday.filter((r) => r.targetsNotMet).length;

    const totalLeadsGenerated = leadGenToday.reduce((s, r) => s + r.totalLeadsGenerated, 0);
    const totalCalls = salesToday.reduce((s, r) => s + r.dailyCallCount, 0);
    const totalApplications = marketingToday.reduce((s, r) => s + r.totalApplications, 0);
    const totalInterviews = marketingToday.reduce((s, r) => s + r.totalInterviews, 0);

    res.json({
      success: true,
      data: {
        today: {
          leadGeneration: {
            count: leadGenToday.length,
            totalLeads: totalLeadsGenerated,
            alerts: leadGenAlerts,
          },
          sales: {
            count: salesToday.length,
            totalCalls,
            alerts: salesAlerts,
          },
          marketing: {
            count: marketingToday.length,
            totalApplications,
            totalInterviews,
          },
        },
        totals: {
          leadGeneration: await LeadGeneration.countDocuments(),
          sales: await Sales.countDocuments(),
          marketing: await Marketing.countDocuments(),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
