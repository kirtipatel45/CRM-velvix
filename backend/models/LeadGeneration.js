import mongoose from 'mongoose';
import { CONNECTION_RANGES } from '../utils/calculations.js';

const leadGenerationSchema = new mongoose.Schema(
  {
    employeeName: { type: String, required: true, trim: true },
    linkedInAccountsCount: { type: Number, required: true, min: 0, default: 0 },
    linkedInProfileNames: { type: String, trim: true, default: '' },
    connectionsRange: [
      { type: String, enum: CONNECTION_RANGES },
    ],
    dailyResumeLeads: { type: Number, required: true, min: 0, default: 0 },
    dailyChatLeads: { type: Number, required: true, min: 0, default: 0 },
    totalLeadsGenerated: { type: Number, default: 0 },
    resumeLeadRatio: { type: Number, default: 0 },
    chatLeadRatio: { type: Number, default: 0 },
    combinedTotalRatio: { type: Number, default: 0 },
    targetsNotMet: { type: Boolean, default: false },
    targetAlerts: {
      resumeLeads: { type: Boolean, default: false },
      chatLeads: { type: Boolean, default: false },
    },
    entryDate: { type: Date, required: true, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

leadGenerationSchema.index({ entryDate: -1, employeeName: 1 });

const LeadGeneration = mongoose.model('LeadGeneration', leadGenerationSchema);
export default LeadGeneration;
