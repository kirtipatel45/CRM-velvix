import mongoose from 'mongoose';
import { INTERVIEW_STAGES } from '../utils/calculations.js';

const candidateSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      default: null,
    },
    candidateName: { type: String, required: true, trim: true },
    candidateEmail: { type: String, trim: true, default: '' },
    jobTitle: { type: String, trim: true, default: '' },
    experienceYears: { type: Number, min: 0, default: 0 },
    experienceMonths: { type: Number, min: 0, max: 11, default: 0 },
    selectedSkills: [
      {
        skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
        name: { type: String, trim: true },
        category: { type: String, trim: true },
      },
    ],
  },
  { _id: true }
);

const marketingSchema = new mongoose.Schema(
  {
    teamLeaderName: { type: String, trim: true, default: 'General' },
    employeeName: { type: String, trim: true, default: '' },
    candidates: [candidateSchema],
    selectedSkills: [
      {
        skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
        candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
        name: { type: String, trim: true },
        category: { type: String, trim: true },
      },
    ],
    longApplicationsSubmitted: { type: Number, min: 0, default: 0 },
    easyApplicationsSubmitted: { type: Number, min: 0, default: 0 },
    totalApplications: { type: Number, default: 0 },
    assessmentsReceived: { type: Number, min: 0, default: 0 },
    screeningCallsCompleted: { type: Number, min: 0, default: 0 },
    totalInterviews: { type: Number, min: 0, default: 0 },
    interviewStages: [
      {
        stage: { type: String, enum: INTERVIEW_STAGES },
        scheduled: { type: Number, min: 0, default: 0 },
        completed: { type: Number, min: 0, default: 0 },
      },
    ],
    entryDate: { type: Date, required: true, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

marketingSchema.index({ entryDate: -1, employeeName: 1 });
marketingSchema.index({ createdBy: 1, entryDate: -1 });

const Marketing = mongoose.model('Marketing', marketingSchema);
export default Marketing;
