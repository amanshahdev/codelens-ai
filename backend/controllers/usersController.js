/**
 * controllers/usersController.js — User Management
 *
 * WHAT: Handles user listing and profile management, primarily for the reviewer role.
 *
 * HOW:  getUsers() returns a paginated list of all users (reviewer only).
 *       getUserProfile() returns a user's public profile and submission history.
 *
 * WHY:  Reviewers need visibility into all developer submissions; this controller
 *       provides that access without mixing it into auth logic.
 */

const User = require('../models/User');
const CodeSubmission = require('../models/CodeSubmission');
const { createError } = require('../middleware/errorHandler');

// ── GET /api/users — List all users (reviewer only) ──────────────────────────
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({ isActive: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name email role stats createdAt'),
      User.countDocuments({ isActive: true }),
    ]);

    res.json({ success: true, users, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/:id — Get user profile ─────────────────────────────────────
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return next(createError('User not found', 404));

    // Developers can only view their own profile
    if (
      req.user.role !== 'reviewer' &&
      req.params.id !== req.user._id.toString()
    ) {
      return next(createError('Not authorised', 403));
    }

    const recentSubmissions = await CodeSubmission.find({ user: user._id })
      .populate('analysis', 'overallScore grade')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title language status linesOfCode createdAt');

    res.json({ success: true, user, recentSubmissions });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/me/profile — Current user's own profile ───────────────────
exports.getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const recentSubmissions = await CodeSubmission.find({ user: req.user._id })
      .populate('analysis', 'overallScore grade')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title language status linesOfCode createdAt');

    res.json({ success: true, user, recentSubmissions });
  } catch (err) {
    next(err);
  }
};
