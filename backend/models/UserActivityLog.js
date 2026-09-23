import mongoose from 'mongoose';

const userActivityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userRole: {
      type: String,
      default: 'employee',
    },
    module: {
      type: String,
      enum: ['lead_generation', 'leads', 'candidates', 'marketing', 'auth', 'user_management'],
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: [
        'lead_created',
        'lead_updated',
        'call_logged',
        'candidate_converted',
        'marketing_submitted',
        'login',
        'status_change',
        'other',
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    metadata: {
      leadSource: { type: String, default: '' },
      profileCount: { type: Number, default: 0 },
      profileNames: { type: [String], default: [] },
      callOutcome: { type: String, default: '' },
      callDuration: { type: String, default: '' },
      callDurationSeconds: { type: Number, default: 0 },
      interestStatus: { type: String, default: '' },
      candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', default: null },
      candidateName: { type: String, default: '' },
      candidateEmail: { type: String, default: '' },
      longApplications: { type: Number, default: 0 },
      easyApplications: { type: Number, default: 0 },
      totalApplications: { type: Number, default: 0 },
      extra: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    ipAddress: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

userActivityLogSchema.index({ userId: 1, timestamp: -1 });
userActivityLogSchema.index({ actionType: 1, timestamp: -1 });
userActivityLogSchema.index({ module: 1, timestamp: -1 });

const UserActivityLog = mongoose.model('UserActivityLog', userActivityLogSchema);
export default UserActivityLog;
