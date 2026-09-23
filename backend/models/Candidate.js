import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const candidateSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, trim: true, default: '' },
    sourceLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeadGeneration',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    convertedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    convertedAt: {
      type: Date,
      default: Date.now,
    },
    accountStatus: {
      type: String,
      enum: ['invited', 'active', 'disabled'],
      default: 'invited',
    },
    mustResetPassword: {
      type: Boolean,
      default: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    tempCredential: {
      tokenHash: { type: String, select: false },
      expiresAt: { type: Date },
      used: { type: Boolean, default: false },
    },
    // Onboarding Fields
    currentCity: {
      type: String,
      trim: true,
      default: '',
    },
    preferredJobCities: {
      type: [String],
      default: [],
    },
    preferredJobTitles: {
      type: [String],
      default: [],
    },
    visaStatus: {
      type: String,
      trim: true,
      default: '',
    },
    primarySkill: {
      type: String,
      trim: true,
      default: '',
    },
    experienceYears: {
      type: Number,
      default: 0,
    },
    jobExperiences: [
      {
        jobTitle: { type: String, trim: true, default: '' },
        experience: { type: String, trim: true, default: '' },
      },
    ],
    resume: {
      originalName: { type: String },
      filename: { type: String },
      path: { type: String },
      mimetype: { type: String },
      size: { type: Number },
      uploadedAt: { type: Date },
    },
    atsResume: {
      originalName: { type: String },
      filename: { type: String },
      path: { type: String },
      mimetype: { type: String },
      size: { type: Number },
      uploadedAt: { type: Date },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    onboardedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

candidateSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(enteredPassword, this.passwordHash);
};

candidateSchema.methods.matchToken = async function (enteredToken) {
  if (!this.tempCredential?.tokenHash) return false;
  return bcrypt.compare(enteredToken, this.tempCredential.tokenHash);
};

const Candidate = mongoose.model('Candidate', candidateSchema);
export default Candidate;
