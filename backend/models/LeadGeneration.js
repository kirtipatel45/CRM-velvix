import mongoose from 'mongoose';
import { CONNECTION_RANGES } from '../utils/calculations.js';

const leadGenerationSchema = new mongoose.Schema(
  {
    employeeName: { type: String, required: true, trim: true },
    linkedInAccountsCount: { type: Number, required: true, min: 0, default: 0 },
    linkedInProfileNames: { type: String, trim: true, default: '' },
    linkedInProfiles: [
      {
        profileName: { type: String, trim: true, default: '' },
        url: { type: String, trim: true, default: '' },
        email: { type: String, trim: true, lowercase: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        convertedToCandidateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Candidate',
          default: null,
        },
        convertedAt: { type: Date, default: null },
        lastCallStatus: {
          type: String,
          enum: ['not_called', 'picked_up', 'call_cut', 'voicemail', 'not_answered'],
          default: 'not_called',
        },
        lastCallDuration: { type: String, default: '' },
        isInterested: { type: Boolean, default: false },
        interestStatus: { type: String, default: '' },
        followUpDate: { type: Date, default: null },
        lastCalledAt: { type: Date, default: null },
        callCount: { type: Number, default: 0 },
      },
    ],
    callLogs: [
      {
        profileId: { type: mongoose.Schema.Types.ObjectId, default: null },
        profileName: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        callerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        callerName: { type: String, trim: true, default: '' },
        callDate: { type: Date, default: Date.now },
        callDuration: { type: String, default: '00:00' },
        callDurationSeconds: { type: Number, default: 0 },
        outcome: {
          type: String,
          enum: ['picked_up', 'call_cut', 'voicemail', 'not_answered'],
          required: true,
        },
        isInterested: { type: Boolean, default: false },
        interestStatus: {
          type: String,
          enum: ['Interested', 'Not Interested', 'Call Back Later', 'Pending', 'N/A'],
          default: 'Pending',
        },
        followUpDate: { type: Date, default: null },
        notes: { type: String, trim: true, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    connectionsRange: [
      { type: String, enum: CONNECTION_RANGES },
    ],
    leadSource: {
      type: String,
      trim: true,
      default: 'LinkedIn',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dailyResumeLeads: { type: Number, min: 0, default: 0 },
    dailyChatLeads: { type: Number, min: 0, default: 0 },
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
    convertedToCandidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      default: null,
    },
    convertedCandidateIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
      },
    ],
    convertedAt: { type: Date, default: null },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

leadGenerationSchema.index({ entryDate: -1, employeeName: 1 });
leadGenerationSchema.index({ createdBy: 1, entryDate: -1 });

const LeadGeneration = mongoose.model('LeadGeneration', leadGenerationSchema);
export default LeadGeneration;
