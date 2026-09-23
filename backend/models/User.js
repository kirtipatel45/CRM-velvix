import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    mobileNumber: { type: String, trim: true },
    designation: { type: String, trim: true, default: '' },
    role: {
      type: String,
      enum: ['admin', 'lead_gen', 'sales', 'marketing', 'manager', 'employee'],
      default: 'employee',
    },
    allowedModules: {
      type: [String],
      enum: ['lead_generation', 'leads', 'candidates', 'marketing'],
      default: ['lead_generation', 'leads'],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    isActive: { type: Boolean, default: true },
    accountStatus: {
      type: String,
      enum: ['invited', 'active', 'disabled'],
      default: 'active',
    },
    mustResetPassword: {
      type: Boolean,
      default: false,
    },
    tempCredential: {
      tokenHash: { type: String, select: false },
      expiresAt: { type: Date },
      used: { type: Boolean, default: false },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastLogin: { type: Date },
    passwordChangedAt: { type: Date },
    resetPasswordOtp: { type: String },
    resetPasswordOtpExpire: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (this.role === 'admin') {
    this.allowedModules = ['lead_generation', 'leads', 'candidates', 'marketing'];
  }
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.matchToken = async function (enteredToken) {
  if (!this.tempCredential?.tokenHash) return false;
  return bcrypt.compare(enteredToken, this.tempCredential.tokenHash);
};

const User = mongoose.model('User', userSchema);
export default User;
