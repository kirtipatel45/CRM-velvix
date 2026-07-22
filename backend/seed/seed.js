import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import LeadGeneration from '../models/LeadGeneration.js';
import Sales from '../models/Sales.js';
import Marketing from '../models/Marketing.js';
import { calculateLeadGenerationMetrics, calculateSalesMetrics } from '../utils/calculations.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm-velvix');
    console.log('Connected to MongoDB for seeding...');

    await Promise.all([
      User.deleteMany(),
      LeadGeneration.deleteMany(),
      Sales.deleteMany(),
      Marketing.deleteMany(),
    ]);

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@velvix.com',
      password: 'admin123',
      role: 'admin',
    });

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const leadData = calculateLeadGenerationMetrics({
      dailyResumeLeads: 35,
      dailyChatLeads: 5,
    });

    await LeadGeneration.create({
      employeeName: 'John Doe',
      linkedInAccountsCount: 3,
      linkedInProfileNames: 'john-doe\njohn-doe-recruiter',
      connectionsRange: ['100-200', '200+'],
      dailyResumeLeads: 35,
      dailyChatLeads: 5,
      entryDate: today,
      createdBy: admin._id,
      ...leadData,
    });

    const leadDataLow = calculateLeadGenerationMetrics({
      dailyResumeLeads: 20,
      dailyChatLeads: 2,
    });

    await LeadGeneration.create({
      employeeName: 'Jane Smith',
      linkedInAccountsCount: 2,
      linkedInProfileNames: 'jane-smith',
      connectionsRange: ['50-100'],
      dailyResumeLeads: 20,
      dailyChatLeads: 2,
      entryDate: today,
      createdBy: admin._id,
      ...leadDataLow,
    });

    const salesData = calculateSalesMetrics({
      dailyAssignedLeadsCount: 50,
      extraSelfSourcedLeads: 10,
      dailyCallDuration: '3h 0m',
      dailyCallCount: 120,
    });

    await Sales.create({
      salesExecutiveName: 'Mike Johnson',
      dailyAssignedLeadsCount: 50,
      extraSelfSourcedLeads: 10,
      dailyCallDuration: '3h 0m',
      dailyCallCount: 120,
      notAnsweredCalls: 30,
      notInterestedCalls: 15,
      voiceMailCount: 10,
      followUpsRequired: 5,
      followUpDate: new Date(Date.now() + 86400000),
      interestedCandidates: 8,
      interestedStage: 'Qualified',
      entryDate: today,
      createdBy: admin._id,
      ...salesData,
    });

    const salesDataLow = calculateSalesMetrics({
      dailyAssignedLeadsCount: 40,
      extraSelfSourcedLeads: 5,
      dailyCallDuration: '2h 0m',
      dailyCallCount: 80,
    });

    await Sales.create({
      salesExecutiveName: 'Sarah Wilson',
      dailyAssignedLeadsCount: 40,
      extraSelfSourcedLeads: 5,
      dailyCallDuration: '2h 0m',
      dailyCallCount: 80,
      notAnsweredCalls: 25,
      notInterestedCalls: 20,
      voiceMailCount: 8,
      followUpsRequired: 3,
      interestedCandidates: 4,
      entryDate: today,
      createdBy: admin._id,
      ...salesDataLow,
    });

    await Marketing.create({
      teamLeaderName: 'David Brown',
      employeeName: 'Emily Davis',
      candidates: [
        { candidateName: 'Alex Turner', jobTitle: 'Software Engineer', experienceYears: 3, experienceMonths: 6 },
        { candidateName: 'Lisa Chen', jobTitle: 'Product Manager', experienceYears: 5, experienceMonths: 0 },
      ],
      longApplicationsSubmitted: 12,
      easyApplicationsSubmitted: 8,
      totalApplications: 20,
      assessmentsReceived: 6,
      screeningCallsCompleted: 4,
      totalInterviews: 3,
      interviewStages: [
        { stage: 'Round 1', scheduled: 3, completed: 2 },
        { stage: 'Round 2', scheduled: 2, completed: 1 },
        { stage: 'Round 3', scheduled: 1, completed: 0 },
      ],
      entryDate: today,
      createdBy: admin._id,
    });

    console.log('Seed completed successfully!');
    console.log('Login: admin@velvix.com / admin123');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
