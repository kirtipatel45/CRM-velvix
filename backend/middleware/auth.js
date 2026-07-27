import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const getSecret = () => process.env.JWT_SECRET || 'crm_velvix_secure_fallback_jwt_secret_key_2026';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, getSecret());
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || !req.user.isActive || req.user.status === 'Inactive') {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated' });
    }
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized for this action' });
    }
    next();
  };
};

export const generateToken = (id) => {
  return jwt.sign({ id }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};
