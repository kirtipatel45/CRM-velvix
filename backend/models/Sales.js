import mongoose from 'mongoose';

const salesSchema = new mongoose.Schema(
  {
    salesExecutiveName: { type: String, required: true, trim: true },
    dailyAssignedLeadsCount: { type: Number, required: true, min: 0, default: 0 },
    extraSelfSourcedLeads: { type: Number, min: 0, default: 0 },
    totalAssignedLeads: { type: Number, default: 0 },
    dailyCallDuration: { type: String, required: true, default: '0h 0m' },
    callDurationMinutes: { type: Number, default: 0 },
    dailyCallCount: { type: Number, required: true, min: 0, default: 0 },
    notAnsweredCalls: { type: Number, min: 0, default: 0 },
    notInterestedCalls: { type: Number, min: 0, default: 0 },
    voiceMailCount: { type: Number, min: 0, default: 0 },
    followUpsRequired: { type: Number, min: 0, default: 0 },
    followUpDate: { type: Date },
    interestedCandidates: { type: Number, min: 0, default: 0 },
    interestedStage: {
      type: String,
      enum: ['New', 'Qualified', 'Proposal', 'Negotiation', 'Closed'],
      default: 'New',
    },
    targetsNotMet: { type: Boolean, default: false },
    targetAlerts: {
      callCount: { type: Boolean, default: false },
      callDuration: { type: Boolean, default: false },
    },
    entryDate: { type: Date, required: true, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

salesSchema.index({ entryDate: -1, salesExecutiveName: 1 });

const Sales = mongoose.model('Sales', salesSchema);
export default Sales;
