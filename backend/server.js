import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import leadGenerationRoutes from './routes/leadGeneration.js';
import salesRoutes from './routes/sales.js';
import marketingRoutes from './routes/marketing.js';
import dashboardRoutes from './routes/dashboard.js';
import notificationRoutes from './routes/notifications.js';
import { startFollowUpCronJob } from './jobs/followUpReminder.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();
startFollowUpCronJob();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CRM Velvix API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/lead-generation', leadGenerationRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
