import express from 'express';
import LeadGeneration from '../models/LeadGeneration.js';
import Sales from '../models/Sales.js';
import Candidate from '../models/Candidate.js';
import Marketing from '../models/Marketing.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', protect, async (req, res) => {
  try {
    const { date, timeframe } = req.query;
    let targetDate = null;
    let dateFilter = {};

    if (timeframe !== 'all') {
      targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0, 0, 0, 0);
      const tomorrow = new Date(targetDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateFilter = { entryDate: { $gte: targetDate, $lt: tomorrow } };
    }

    // Fetch collections in parallel
    const [
      leadGenFiltered,
      salesFiltered,
      marketingFiltered,
      allLeadGen,
      allSales,
      allMarketing,
      allCandidates,
      allUsers,
    ] = await Promise.all([
      LeadGeneration.find(dateFilter),
      Sales.find(dateFilter),
      Marketing.find(dateFilter),
      LeadGeneration.find(),
      Sales.find(),
      Marketing.find(),
      Candidate.find(),
      User.find({ isActive: true }).select('name email role designation allowedModules createdAt'),
    ]);

    const isFiltered = timeframe !== 'all';
    const activeLeadGen = isFiltered ? leadGenFiltered : allLeadGen;
    const activeSales = isFiltered ? salesFiltered : allSales;
    const activeMarketing = isFiltered ? marketingFiltered : allMarketing;

    // 1. Executive Top-Level KPIs
    const totalLeadsSourced = activeLeadGen.reduce((acc, doc) => {
      const profileCount = Array.isArray(doc.linkedInProfiles) ? doc.linkedInProfiles.length : 0;
      return acc + (doc.totalLeadsGenerated || profileCount || 0);
    }, 0);

    const filteredLeadsSourced = leadGenFiltered.reduce((acc, doc) => {
      const profileCount = Array.isArray(doc.linkedInProfiles) ? doc.linkedInProfiles.length : 0;
      return acc + (doc.totalLeadsGenerated || profileCount || 0);
    }, 0);

    // Call metrics
    let totalCalls = activeSales.reduce((s, r) => s + (r.dailyCallCount || 0), 0);
    let totalTalkTimeMinutes = activeSales.reduce((s, r) => s + (r.callDurationMinutes || 0), 0);

    // Also include live callLogs from LeadGeneration
    let totalLogsCount = 0;
    let totalLogsDurationSeconds = 0;
    activeLeadGen.forEach((lg) => {
      if (Array.isArray(lg.callLogs)) {
        lg.callLogs.forEach((cl) => {
          if (!isFiltered || (targetDate && cl.callDate && new Date(cl.callDate) >= targetDate && new Date(cl.callDate) < new Date(targetDate.getTime() + 86400000))) {
            totalLogsCount += 1;
            totalLogsDurationSeconds += cl.callDurationSeconds || 0;
          } else if (!isFiltered) {
            totalLogsCount += 1;
            totalLogsDurationSeconds += cl.callDurationSeconds || 0;
          }
        });
      }
    });

    const combinedCalls = totalCalls + totalLogsCount;
    const combinedTalkTimeMinutes = totalTalkTimeMinutes + Math.round(totalLogsDurationSeconds / 60);

    // Conversions
    const totalCandidatesCount = allCandidates.length;
    let totalConvertedFromLeads = 0;
    activeLeadGen.forEach((lg) => {
      if (Array.isArray(lg.convertedCandidateIds)) {
        totalConvertedFromLeads += lg.convertedCandidateIds.length;
      } else if (lg.convertedToCandidateId) {
        totalConvertedFromLeads += 1;
      }
    });
    
    const effectiveConvertedCandidates = isFiltered
      ? totalConvertedFromLeads
      : Math.max(
          totalConvertedFromLeads,
          allCandidates.filter((c) => c.sourceLeadId).length,
          totalCandidatesCount
        );

    // Conversion rate: Converted Candidates / Total Leads Sourced (or contacted)
    const conversionRate = totalLeadsSourced > 0
      ? ((effectiveConvertedCandidates / totalLeadsSourced) * 100).toFixed(1)
      : '0.0';

    // Marketing applications
    const totalMarketingApps = activeMarketing.reduce((s, r) => s + (r.totalApplications || 0), 0);
    const filteredMarketingApps = marketingFiltered.reduce((s, r) => s + (r.totalApplications || 0), 0);
    const totalInterviews = activeMarketing.reduce((s, r) => s + (r.totalInterviews || 0), 0);

    // 2. Lead Generation Breakdown
    let totalResumeLeads = 0;
    let totalChatLeads = 0;
    let totalAccountsCount = 0;
    const connectionRangeMap = { '50-100': 0, '100-200': 0, '200+': 0 };

    activeLeadGen.forEach((lg) => {
      totalResumeLeads += lg.dailyResumeLeads || 0;
      totalChatLeads += lg.dailyChatLeads || 0;
      totalAccountsCount += lg.linkedInAccountsCount || 0;
      if (Array.isArray(lg.connectionsRange)) {
        lg.connectionsRange.forEach((rng) => {
          if (connectionRangeMap[rng] !== undefined) {
            connectionRangeMap[rng] += 1;
          }
        });
      }
    });

    // 3. Calling & Outreach Outcome Breakdown
    let pickedUp = 0;
    let callCut = 0;
    let voicemail = 0;
    let notAnswered = 0;
    let interested = 0;
    let callBackLater = 0;
    let notInterested = 0;

    // From Sales documents
    activeSales.forEach((s) => {
      voicemail += s.voiceMailCount || 0;
      notAnswered += s.notAnsweredCalls || 0;
      notInterested += s.notInterestedCalls || 0;
      interested += s.interestedCandidates || 0;
      // Estimate picked up from remainder
      const answered = Math.max(0, (s.dailyCallCount || 0) - (s.notAnsweredCalls || 0) - (s.voiceMailCount || 0));
      pickedUp += answered;
    });

    // From live call logs in LeadGeneration
    activeLeadGen.forEach((lg) => {
      if (Array.isArray(lg.callLogs)) {
        lg.callLogs.forEach((cl) => {
          if (cl.outcome === 'picked_up') pickedUp++;
          else if (cl.outcome === 'call_cut') callCut++;
          else if (cl.outcome === 'voicemail') voicemail++;
          else if (cl.outcome === 'not_answered') notAnswered++;

          if (cl.interestStatus === 'Interested') interested++;
          else if (cl.interestStatus === 'Call Back Later') callBackLater++;
          else if (cl.interestStatus === 'Not Interested') notInterested++;
        });
      }
    });

    // 4. Candidate & Bench Breakdown
    const benchStats = {
      total: allCandidates.length,
      active: allCandidates.filter((c) => c.accountStatus === 'active').length,
      invited: allCandidates.filter((c) => c.accountStatus === 'invited').length,
      atsResumeReady: allCandidates.filter((c) => c.atsResume && c.atsResume.filename).length,
      rawResumeUploaded: allCandidates.filter((c) => c.resume && c.resume.filename).length,
      visaBreakdown: {},
      skillsBreakdown: {},
    };

    allCandidates.forEach((c) => {
      const visa = c.visaStatus || 'Not Specified';
      benchStats.visaBreakdown[visa] = (benchStats.visaBreakdown[visa] || 0) + 1;

      if (c.primarySkill) {
        const skill = c.primarySkill.trim();
        benchStats.skillsBreakdown[skill] = (benchStats.skillsBreakdown[skill] || 0) + 1;
      }
    });

    // 5. Marketing & Interview Pipeline Stages Breakdown
    const interviewStageSummary = {
      'Round 1': { scheduled: 0, completed: 0 },
      'Round 2': { scheduled: 0, completed: 0 },
      'Round 3': { scheduled: 0, completed: 0 },
      'Client Round': { scheduled: 0, completed: 0 },
      'Final Round': { scheduled: 0, completed: 0 },
    };

    let totalScreeningCalls = 0;
    let totalAssessments = 0;
    let longApplicationsTotal = 0;
    let easyApplicationsTotal = 0;

    activeMarketing.forEach((m) => {
      totalScreeningCalls += m.screeningCallsCompleted || 0;
      totalAssessments += m.assessmentsReceived || 0;
      longApplicationsTotal += m.longApplicationsSubmitted || 0;
      easyApplicationsTotal += m.easyApplicationsSubmitted || 0;

      if (Array.isArray(m.interviewStages)) {
        m.interviewStages.forEach((stg) => {
          if (interviewStageSummary[stg.stage]) {
            interviewStageSummary[stg.stage].scheduled += stg.scheduled || 0;
            interviewStageSummary[stg.stage].completed += stg.completed || 0;
          }
        });
      }
    });

    // 6. Employee Performance Leaderboard
    const leaderboard = allUsers
      .filter((u) => u.role !== 'admin')
      .map((emp) => {
        const empName = emp.name;
        // Check lead gen stats
        const empLeadGen = activeLeadGen.filter((lg) => lg.employeeName === empName || (lg.createdBy && lg.createdBy.toString() === emp._id.toString()));
        const leadsSourced = empLeadGen.reduce((acc, doc) => acc + (doc.totalLeadsGenerated || (doc.linkedInProfiles?.length || 0)), 0);

        // Check sales stats
        const empSales = activeSales.filter((s) => s.salesExecutiveName === empName || (s.createdBy && s.createdBy.toString() === emp._id.toString()));
        const callsMade = empSales.reduce((acc, s) => acc + (s.dailyCallCount || 0), 0);
        const conversions = empSales.reduce((acc, s) => acc + (s.interestedCandidates || 0), 0);

        // Check marketing stats
        const empMarketing = activeMarketing.filter((m) => m.employeeName === empName || (m.createdBy && m.createdBy.toString() === emp._id.toString()));
        const apps = empMarketing.reduce((acc, m) => acc + (m.totalApplications || 0), 0);
        const interviews = empMarketing.reduce((acc, m) => acc + (m.totalInterviews || 0), 0);

        return {
          id: emp._id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          designation: emp.designation || 'Specialist',
          allowedModules: emp.allowedModules || [],
          leadsSourced,
          callsMade,
          conversions,
          applications: apps,
          interviews,
          targetStatus: empLeadGen.some((l) => l.targetsNotMet) || empSales.some((s) => s.targetsNotMet) ? 'Attention Needed' : 'On Track',
        };
      });

    // 7. System Health & Target Bottleneck Alerts
    const alerts = [];
    const leadGenAlerts = leadGenFiltered.filter((r) => r.targetsNotMet).length;
    const salesAlerts = salesFiltered.filter((r) => r.targetsNotMet).length;

    if (leadGenAlerts > 0) {
      alerts.push({
        id: 'leadgen-target',
        title: 'Lead Gen Target Missed',
        message: `${leadGenAlerts} lead generation entries missed their daily target quota today.`,
        severity: 'warning',
      });
    }

    if (salesAlerts > 0) {
      alerts.push({
        id: 'sales-target',
        title: 'Calling Quota Missed',
        message: `${salesAlerts} outreach entries fell below the minimum call volume/duration targets.`,
        severity: 'warning',
      });
    }

    const missingAtsCount = allCandidates.filter((c) => !c.atsResume || !c.atsResume.filename).length;
    if (missingAtsCount > 0) {
      alerts.push({
        id: 'missing-ats',
        title: 'Pending ATS Resumes',
        message: `${missingAtsCount} onboarded candidate(s) are awaiting an ATS-formatted resume from recruiters.`,
        severity: 'info',
      });
    }

    res.json({
      success: true,
      data: {
        executiveKpis: {
          totalLeadsSourced,
          filteredLeadsSourced,
          totalCalls: combinedCalls,
          totalTalkTimeMinutes: combinedTalkTimeMinutes,
          totalCandidates: totalCandidatesCount,
          convertedCandidates: effectiveConvertedCandidates,
          conversionRate,
          totalMarketingApplications: totalMarketingApps,
          filteredMarketingApplications: filteredMarketingApps,
          totalInterviews,
        },
        leadGenStats: {
          totalSourced: totalLeadsSourced,
          resumeLeads: totalResumeLeads,
          chatLeads: totalChatLeads,
          accountsCount: totalAccountsCount,
          connectionRanges: connectionRangeMap,
          alertsCount: leadGenAlerts,
        },
        callingStats: {
          totalCalls: combinedCalls,
          outcomes: {
            pickedUp,
            notAnswered,
            voicemail,
            callCut,
          },
          interestLevels: {
            interested,
            callBackLater,
            notInterested,
          },
          alertsCount: salesAlerts,
        },
        benchStats,
        marketingStats: {
          totalApplications: totalMarketingApps,
          longApplications: longApplicationsTotal,
          easyApplications: easyApplicationsTotal,
          screeningCalls: totalScreeningCalls,
          assessments: totalAssessments,
          totalInterviews,
          interviewStages: interviewStageSummary,
        },
        leaderboard,
        alerts,
        // Legacy support
        today: {
          leadGeneration: { count: leadGenFiltered.length, totalLeads: filteredLeadsSourced, alerts: leadGenAlerts },
          sales: { count: salesFiltered.length, totalCalls: salesFiltered.reduce((s, r) => s + (r.dailyCallCount || 0), 0), alerts: salesAlerts },
          marketing: { count: marketingFiltered.length, totalApplications: filteredMarketingApps, totalInterviews: marketingFiltered.reduce((s, r) => s + (r.totalInterviews || 0), 0) },
        },
        totals: {
          leadGeneration: allLeadGen.length,
          sales: allSales.length,
          marketing: allMarketing.length,
          candidates: allCandidates.length,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard stats aggregation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

