import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

const createAuditLog = async ({ req, action, targetEmployee, details }) => {
  try {
    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action,
      targetEmployeeId: targetEmployee?._id,
      targetEmployeeName: targetEmployee?.name,
      details,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
    });
  } catch (err) {
    console.error('AuditLog error:', err);
  }
};

// All user management routes require Authentication AND Admin role
router.use(protect, authorize('admin'));

// GET /api/users/audit-logs - View audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users - List employees with search & filters
router.get('/', async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const andConditions = [];

    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { mobileNumber: { $regex: search, $options: 'i' } },
        ],
      });
    }

    if (role && role !== 'all') {
      andConditions.push({ role });
    }

    if (status && status !== 'all') {
      if (status === 'Active') {
        andConditions.push({
          $or: [{ status: 'Active' }, { status: { $exists: false } }],
        });
      } else {
        andConditions.push({ status });
      }
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const users = await User.find(query)
      .select('-password')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/:id - Get single employee
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'name email');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users - Admin create new employee
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email address is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').notEmpty().withMessage('Role is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, email, password, role, status, mobileNumber } = req.body;

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email address is already in use' });
      }

      const allowedRoles = ['admin', 'lead_gen', 'sales', 'marketing', 'manager'];
      const normalizedRole = allowedRoles.includes(role) ? role : 'lead_gen';
      const userStatus = status === 'Inactive' ? 'Inactive' : 'Active';

      const newUser = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        mobileNumber: mobileNumber || '',
        role: normalizedRole,
        status: userStatus,
        isActive: userStatus === 'Active',
        createdBy: req.user._id,
      });

      await createAuditLog({
        req,
        action: 'CREATE_EMPLOYEE',
        targetEmployee: newUser,
        details: `Created employee "${newUser.name}" (${newUser.email}) with role ${newUser.role} and status ${newUser.status}`,
      });

      res.status(201).json({
        success: true,
        message: 'Employee account created successfully',
        data: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          mobileNumber: newUser.mobileNumber,
          role: newUser.role,
          status: newUser.status,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/users/:id - Admin update employee details / status / role
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('+password');
      if (!user) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      const { name, email, mobileNumber, role, status } = req.body;
      const changes = [];

      if (email && email.toLowerCase() !== user.email) {
        const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
        if (emailExists) {
          return res.status(400).json({ success: false, message: 'Email address is already in use by another user' });
        }
        changes.push(`email from ${user.email} to ${email.toLowerCase()}`);
        user.email = email.toLowerCase();
      }

      if (name && name !== user.name) {
        changes.push(`name from "${user.name}" to "${name}"`);
        user.name = name;
      }

      if (mobileNumber !== undefined && mobileNumber !== user.mobileNumber) {
        changes.push(`mobile number`);
        user.mobileNumber = mobileNumber;
      }

      if (role && role !== user.role) {
        const allowedRoles = ['admin', 'lead_gen', 'sales', 'marketing', 'manager'];
        if (allowedRoles.includes(role)) {
          changes.push(`role from ${user.role} to ${role}`);
          user.role = role;
        }
      }

      if (status && status !== user.status) {
        changes.push(`status from ${user.status || 'Active'} to ${status}`);
        user.status = status;
        user.isActive = status === 'Active';
      }

      await user.save();

      const action = status !== undefined && status !== user.status
        ? (status === 'Inactive' ? 'DEACTIVATE_EMPLOYEE' : 'ACTIVATE_EMPLOYEE')
        : 'UPDATE_EMPLOYEE';

      await createAuditLog({
        req,
        action,
        targetEmployee: user,
        details: changes.length > 0 ? `Updated ${changes.join(', ')}` : 'Employee details updated',
      });

      res.json({
        success: true,
        message: 'Employee updated successfully',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          mobileNumber: user.mobileNumber,
          role: user.role,
          status: user.status,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// POST /api/users/:id/reset-password - Admin reset employee password
router.post(
  '/:id/reset-password',
  [body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')],
  validate,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('+password');
      if (!user) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      user.password = req.body.newPassword;
      user.passwordChangedAt = new Date();
      await user.save();

      await createAuditLog({
        req,
        action: 'RESET_PASSWORD',
        targetEmployee: user,
        details: `Admin reset password for employee "${user.name}" (${user.email})`,
      });

      res.json({
        success: true,
        message: `Password reset successfully for employee ${user.name}`,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
