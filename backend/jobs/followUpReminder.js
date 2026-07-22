import cron from 'node-cron';
import Sales from '../models/Sales.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/email.js';

export const startFollowUpCronJob = () => {
  // Run every minute for testing. For production, you could use '0 8 * * *' (every day at 8:00 AM)
  cron.schedule('* * * * *', async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Find sales records with a followUpDate for today and that haven't been sent a reminder yet
      const recordsToRemind = await Sales.find({
        followUpDate: { $gte: todayStart, $lte: todayEnd },
        followUpReminderSent: false,
      });

      for (const record of recordsToRemind) {
        const user = await User.findById(record.createdBy);
        
        if (user) {
          const title = "Follow-up Reminder";
          const message = `Reminder: You have a scheduled follow-up today for the sales entry regarding ${record.salesExecutiveName}.`;
          
          // 1. Send Email
          sendEmail({
            email: user.email,
            subject: title,
            message: `Hello ${user.name},\n\n${message}\n\nPlease ensure you follow up promptly!`,
          }).catch(err => console.error("Cron email error:", err));
          
          // 2. Create in-app notification
          await Notification.create({
            userId: user._id,
            title,
            message,
            type: "info",
          });
          
          // 3. Mark as sent so we don't spam
          record.followUpReminderSent = true;
          await record.save();
        }
      }
    } catch (error) {
      console.error('Error in follow-up cron job:', error);
    }
  });
};
