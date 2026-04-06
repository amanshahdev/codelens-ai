/**
 * middleware/auth.js — JWT Authentication Middleware
 *
 * WHAT: Protects routes by verifying the Bearer JWT in the Authorization header.
 *       Attaches the decoded user payload to req.user for downstream handlers.
 *
 * HOW:  Extracts the token, verifies it with jwt.verify() using the shared
 *       JWT_SECRET, then fetches the live user document from MongoDB to ensure
 *       the account still exists (guards against deleted accounts using old tokens).
 *
 * WHY:  Centralising auth here means every protected route gets the same,
 *       tested validation logic—no per-route duplication.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Verify JWT ────────────────────────────────────────────────────────────────
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Confirm user still exists in DB
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists or has been deactivated.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    let message = 'Invalid token. Please log in again.';
    if (err.name === 'TokenExpiredError') {
      message = 'Token expired. Please log in again.';
    }
    return res.status(401).json({ success: false, message });
  }
};

// ── Role-based Guard ──────────────────────────────────────────────────────────
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorised to access this resource.`,
      });
    }
    next();
  };
};
