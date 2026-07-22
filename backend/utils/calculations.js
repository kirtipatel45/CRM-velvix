// Lead Generation targets
export const LEAD_GEN_TARGETS = {
  resumeLeads: 30,
  chatLeads: 3,
};

// Sales targets
export const SALES_TARGETS = {
  callCount: 100,
  callDurationMinutes: 150, // 2h 30m
};

export const CONNECTION_RANGES = ['0-50', '50-100', '100-200', '200+'];

export const INTERVIEW_STAGES = ['Round 1', 'Round 2', 'Round 3'];

export function calculateLeadGenerationMetrics(data) {
  const resumeLeads = data.dailyResumeLeads || 0;
  const chatLeads = data.dailyChatLeads || 0;
  const totalLeads = resumeLeads + chatLeads;

  const resumeLeadRatio = totalLeads > 0 ? (resumeLeads / totalLeads) * 100 : 0;
  const chatLeadRatio = totalLeads > 0 ? (chatLeads / totalLeads) * 100 : 0;
  const combinedTotalRatio = totalLeads > 0 ? 100 : 0;

  const targetsNotMet =
    resumeLeads < LEAD_GEN_TARGETS.resumeLeads ||
    chatLeads < LEAD_GEN_TARGETS.chatLeads;

  return {
    totalLeadsGenerated: totalLeads,
    resumeLeadRatio: Math.round(resumeLeadRatio * 100) / 100,
    chatLeadRatio: Math.round(chatLeadRatio * 100) / 100,
    combinedTotalRatio,
    targetsNotMet,
    targetAlerts: {
      resumeLeads: resumeLeads < LEAD_GEN_TARGETS.resumeLeads,
      chatLeads: chatLeads < LEAD_GEN_TARGETS.chatLeads,
    },
  };
}

export function calculateSalesMetrics(data) {
  const assigned = data.dailyAssignedLeadsCount || 0;
  const extra = data.extraSelfSourcedLeads || 0;
  const totalAssignedLeads = assigned + extra;

  const callDurationMinutes = parseDurationToMinutes(data.dailyCallDuration);
  const callCount = data.dailyCallCount || 0;

  const targetsNotMet =
    callCount < SALES_TARGETS.callCount ||
    callDurationMinutes < SALES_TARGETS.callDurationMinutes;

  return {
    totalAssignedLeads,
    callDurationMinutes,
    targetsNotMet,
    targetAlerts: {
      callCount: callCount < SALES_TARGETS.callCount,
      callDuration: callDurationMinutes < SALES_TARGETS.callDurationMinutes,
    },
  };
}

export function parseDurationToMinutes(duration) {
  if (typeof duration === 'number') return duration;
  if (!duration) return 0;

  const str = String(duration).trim();
  const hourMinMatch = str.match(/(\d+)\s*h(?:ours?)?\s*(\d+)?\s*m?(?:in(?:utes?)?)?/i);
  if (hourMinMatch) {
    const hours = parseInt(hourMinMatch[1], 10) || 0;
    const mins = parseInt(hourMinMatch[2], 10) || 0;
    return hours * 60 + mins;
  }

  const colonMatch = str.match(/^(\d+):(\d+)$/);
  if (colonMatch) {
    return parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
  }

  const num = parseInt(str, 10);
  return isNaN(num) ? 0 : num;
}

export function formatMinutesToDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}
