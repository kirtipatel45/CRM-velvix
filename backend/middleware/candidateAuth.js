import jwt from 'jsonwebtoken';
import Candidate from '../models/Candidate.js';

const getSecret = () => process.env.JWT_SECRET || 'crm_velvix_secure_fallback_jwt_secret_key_2026';

// Scoped candidate JWT generation
export const generateCandidateToken = (candidateId, email) => {
  return jwt.sign(
    {
      candidateId,
      email,
      scope: 'candidate',
      role: 'candidate',
    },
    getSecret(),
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Short-lived reset token (15 mins) for set-password step
export const generateCandidateResetToken = (candidateId, email) => {
  return jwt.sign(
    {
      candidateId,
      email,
      scope: 'candidate-reset-password',
    },
    getSecret(),
    { expiresIn: '15m' }
  );
};

// Middleware: Candidate full portal access
export const protectCandidate = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no candidate token provided' });
  }

  try {
    const decoded = jwt.verify(token, getSecret());

    if (decoded.scope !== 'candidate' || !decoded.candidateId) {
      return res.status(403).json({ success: false, message: 'Invalid token scope for candidate portal' });
    }

    const candidate = await Candidate.findById(decoded.candidateId);
    if (!candidate) {
      return res.status(401).json({ success: false, message: 'Candidate account not found' });
    }

    if (candidate.accountStatus !== 'active') {
      return res.status(403).json({ success: false, message: 'Candidate account is not active' });
    }

    if (candidate.mustResetPassword) {
      return res.status(403).json({
        success: false,
        mustResetPassword: true,
        message: 'Password reset required before accessing portal',
      });
    }

    req.candidate = candidate;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
  }
};

// Middleware: Scoped token for set-password endpoint only
export const protectCandidateReset = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no reset token provided' });
  }

  try {
    const decoded = jwt.verify(token, getSecret());

    if (decoded.scope !== 'candidate-reset-password' || !decoded.candidateId) {
      return res.status(403).json({ success: false, message: 'Invalid token scope for password reset' });
    }

    const candidate = await Candidate.findById(decoded.candidateId).select('+passwordHash +tempCredential.tokenHash');
    if (!candidate) {
      return res.status(401).json({ success: false, message: 'Candidate account not found' });
    }

    req.candidate = candidate;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired or token invalid. Please log in again.' });
  }
};

// In-memory rate limiter for auth endpoints
const rateLimitMap = new Map();

export const createRateLimiter = ({ windowMs = 15 * 60 * 1000, max = 10, message = 'Too many requests, please try again later' } = {}) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const key = `${req.path}_${ip}`;
    const now = Date.now();

    const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    rateLimitMap.set(key, record);

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    next();
  };
};
