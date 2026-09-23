import UserActivityLog from '../models/UserActivityLog.js';

/**
 * Log a user activity event asynchronously
 * @param {Object} params
 * @param {Object} params.req - Express request object (contains req.user)
 * @param {String} params.module - 'lead_generation' | 'leads' | 'candidates' | 'marketing' | 'auth'
 * @param {String} params.actionType - 'lead_created' | 'call_logged' | 'candidate_converted' | 'marketing_submitted' | 'login'
 * @param {String} params.title - Short summary of the action
 * @param {String} [params.description] - Detailed description
 * @param {Object} [params.metadata] - Extra structured metadata
 * @param {Object} [params.user] - Optional user override
 */
export const logUserActivity = async ({
  req,
  module,
  actionType,
  title,
  description = '',
  metadata = {},
  user,
}) => {
  try {
    const activeUser = user || req?.user;
    if (!activeUser || !activeUser._id) {
      return null;
    }

    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';

    const log = await UserActivityLog.create({
      userId: activeUser._id,
      userName: activeUser.name || 'Unknown User',
      userRole: activeUser.role || 'employee',
      module,
      actionType,
      title,
      description,
      metadata,
      ipAddress,
      timestamp: new Date(),
    });

    return log;
  } catch (error) {
    console.error('Failed to log user activity:', error.message);
    return null;
  }
};

export default logUserActivity;
