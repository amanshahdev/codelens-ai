/**
 * controllers/authController.js — Authentication Logic
 *
 * WHAT: Handles user registration and login. Issues JWTs on success.
 *
 * HOW:  register() creates a new User document (password auto-hashed by model hook).
 *       login() fetches the user by email (explicitly selecting password), calls
 *       matchPassword(), then signs and returns a JWT if valid.
 *       sendTokenResponse() is a helper that builds the consistent response shape.
 *
 * WHY:  Keeping auth logic separate from routes makes unit testing trivial —
 *       we can call these functions directly without an HTTP layer.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('../middleware/errorHandler');

// ── Helper: Sign JWT and send response ───────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  // Remove password from output (already select:false, but belt-and-suspenders)
  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    stats: user.stats,
    createdAt: user.createdAt,
  };

  res.status(statusCode).json({
    success: true,
    token,
    user: userData,
  });
};

// ── Register ──────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return next(createError('Name, email and password are required', 400));
    }

    // Check for duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return next(createError('An account with that email already exists', 400));
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role === 'reviewer' ? 'reviewer' : 'developer',
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(createError('Email and password are required', 400));
    }

    // Explicitly select password (excluded by default in schema)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return next(createError('Invalid credentials', 401));
    }

    if (!user.isActive) {
      return next(createError('This account has been deactivated. Contact support.', 401));
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(createError('Invalid credentials', 401));
    }

    // Update lastActive
    user.stats.lastActive = Date.now();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ── Get current logged-in user ────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ── Update profile ────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio } = req.body;
    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (bio !== undefined) updateFields.bio = bio.trim();

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ── Change password ───────────────────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(createError('Current and new password are required', 400));
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return next(createError('Current password is incorrect', 401));
    }

    if (newPassword.length < 6) {
      return next(createError('New password must be at least 6 characters', 400));
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};
