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
    if (decoded.scope === 'candidate' || decoded.scope === 'candidate-reset-password' || !decoded.id) {
      return res.status(403).json({ success: false, message: 'Access denied: Candidate tokens cannot access employee resources' });
    }
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || !req.user.isActive || req.user.status === 'Inactive') {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated' });
    }

    // Dynamic fallback for legacy users without explicit allowedModules array
    if (!req.user.allowedModules || req.user.allowedModules.length === 0) {
      if (req.user.role === 'admin') {
        req.user.allowedModules = ['lead_generation', 'leads', 'candidates', 'marketing'];
      } else if (req.user.role === 'lead_gen') {
        req.user.allowedModules = ['lead_generation', 'leads'];
      } else if (req.user.role === 'sales') {
        req.user.allowedModules = ['leads'];
      } else if (req.user.role === 'marketing') {
        req.user.allowedModules = ['candidates', 'marketing'];
      } else {
        req.user.allowedModules = ['lead_generation', 'leads'];
      }
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

export const authorizeModule = (...requiredModules) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    if (req.user.role === 'admin') {
      return next();
    }
    const userModules = req.user.allowedModules || [];
    const hasAccess = requiredModules.some((mod) => userModules.includes(mod));
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: `Access denied: You do not have permission for module (${requiredModules.join(' or ')})`,
      });
    }
    next();
  };
};

export const generateToken = (id) => {
  return jwt.sign({ id }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};
