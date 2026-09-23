import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateToken, protect } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';
import crypto from 'crypto';
import { logUserActivity } from '../utils/activityLogger.js';

const router = express.Router();

const getSecret = () => process.env.JWT_SECRET || 'crm_velvix_secure_fallback_jwt_secret_key_2026';

export const generateEmployeeResetToken = (id, email) => {
  return jwt.sign({ id, email, scope: 'employee-reset-password' }, getSecret(), {
    expiresIn: '30m',
  });
};

export const protectEmployeeReset = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized: Reset token required' });
  }
  try {
    const decoded = jwt.verify(token, getSecret());
    if (decoded.scope !== 'employee-reset-password' || !decoded.id) {
      return res.status(403).json({ success: false, message: 'Invalid token scope for password setup' });
    }
    const user = await User.findById(decoded.id).select('+password +tempCredential.tokenHash +tempCredential.expiresAt +tempCredential.used');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee user not found' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired password reset session. Please log in again.' });
  }
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Public registration removed - Only Admin can create users via /api/users

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
        '+password +tempCredential.tokenHash +tempCredential.expiresAt +tempCredential.used'
      );
      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (user.status === 'Inactive' || user.isActive === false) {
        return res.status(401).json({ success: false, message: 'Account is deactivated. Please contact admin.' });
      }

      // If user must reset password (temporary credential issued)
      if (user.mustResetPassword || user.accountStatus === 'invited') {
        if (user.tempCredential?.expiresAt && new Date(user.tempCredential.expiresAt) < new Date()) {
          return res.status(400).json({
            success: false,
            isExpired: true,
            message: 'Your temporary password has expired (valid for 72 hours). Please contact your administrator for a new invite.',
          });
        }

        const resetToken = generateEmployeeResetToken(user._id, user.email);

        return res.json({
          success: true,
          mustResetPassword: true,
          resetToken,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            designation: user.designation,
          },
          message: 'Temporary password verified. Please configure your permanent password to proceed.',
        });
      }

      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      // Log Login Activity
      logUserActivity({
        user,
        req,
        module: 'auth',
        actionType: 'login',
        title: `User logged in`,
        description: `${user.name} (${user.role}) logged in successfully.`,
      });

      const allowedModules =
        user.allowedModules && user.allowedModules.length > 0
          ? user.allowedModules
          : user.role === 'admin'
          ? ['lead_generation', 'leads', 'candidates', 'marketing']
          : user.role === 'lead_gen'
          ? ['lead_generation', 'leads']
          : user.role === 'marketing'
          ? ['candidates', 'marketing']
          : ['lead_generation', 'leads'];

      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          allowedModules,
          status: user.status || 'Active',
          mobileNumber: user.mobileNumber || '',
          token: generateToken(user._id),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// POST /api/auth/set-password - Employee sets permanent password after temporary login
router.post(
  '/set-password',
  protectEmployeeReset,
  [
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long'),
  ],
  validate,
  async (req, res) => {
    try {
      const { newPassword } = req.body;
      const user = req.user;

      user.password = newPassword;
      user.mustResetPassword = false;
      user.accountStatus = 'active';
      if (user.tempCredential) {
        user.tempCredential.used = true;
      }
      user.passwordChangedAt = new Date();
      user.lastLogin = new Date();
      await user.save();

      logUserActivity({
        user,
        req,
        module: 'auth',
        actionType: 'first_password_setup',
        title: 'Initial password set',
        description: `${user.name} (${user.role}) completed initial password setup.`,
      });

      const allowedModules =
        user.allowedModules && user.allowedModules.length > 0
          ? user.allowedModules
          : user.role === 'admin'
          ? ['lead_generation', 'leads', 'candidates', 'marketing']
          : user.role === 'lead_gen'
          ? ['lead_generation', 'leads']
          : user.role === 'marketing'
          ? ['candidates', 'marketing']
          : ['lead_generation', 'leads'];

      res.json({
        success: true,
        message: 'Password set successfully! Welcome to Velvix CRM.',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          allowedModules,
          status: user.status || 'Active',
          mobileNumber: user.mobileNumber || '',
          token: generateToken(user._id),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.get('/me', protect, async (req, res) => {
  res.json({ success: true, data: req.user });
});

router.put(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('+password');
      
      if (!(await user.matchPassword(req.body.currentPassword))) {
        return res.status(401).json({ success: false, message: 'Invalid current password' });
      }

      user.password = req.body.newPassword;
      user.passwordChangedAt = new Date();
      await user.save();

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required')],
  validate,
  async (req, res) => {
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        return res.status(404).json({ success: false, message: 'There is no user with that email address.' });
      }

      // Generate 6 digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      user.resetPasswordOtp = otp;
      user.resetPasswordOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save({ validateBeforeSave: false });

      const message = `You requested a password reset. Your OTP is: ${otp}\nThis OTP is valid for 10 minutes.`;

      const emailSent = await sendEmail({
        email: user.email,
        subject: 'Password Reset OTP',
        message,
      });

      if (!emailSent) {
        user.resetPasswordOtp = undefined;
        user.resetPasswordOtpExpire = undefined;
        await user.save({ validateBeforeSave: false });
        return res.status(500).json({ success: false, message: 'Email could not be sent' });
      }

      res.status(200).json({ success: true, message: 'OTP sent to email' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').notEmpty().withMessage('OTP is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      const user = await User.findOne({
        email,
        resetPasswordOtp: otp,
        resetPasswordOtpExpire: { $gt: Date.now() },
      }).select('+password');

      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      user.password = newPassword;
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpire = undefined;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password reset successful',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
