/**
 * routes/auth.js — Authentication Routes
 *
 * POST /api/auth/register  — Create new account
 * POST /api/auth/login     — Obtain JWT
 * GET  /api/auth/me        — Current user info (protected)
 * PUT  /api/auth/profile   — Update name/bio (protected)
 * PUT  /api/auth/password  — Change password (protected)
 */

const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;
