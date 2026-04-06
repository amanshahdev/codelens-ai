/**
 * routes/users.js — User Management Routes
 *
 * GET /api/users            — All users (reviewer only)
 * GET /api/users/me/profile — Current user profile
 * GET /api/users/:id        — Specific user profile
 */

const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserProfile,
  getMyProfile,
} = require('../controllers/usersController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', authorize('reviewer'), getUsers);
router.get('/me/profile', getMyProfile);
router.get('/:id', getUserProfile);

module.exports = router;
