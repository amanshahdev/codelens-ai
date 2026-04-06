/**
 * routes/analysis.js — Analysis Result Routes
 *
 * GET /api/analysis/user/stats           — Dashboard stats for current user
 * GET /api/analysis/recent               — Recent analyses for current user
 * GET /api/analysis/reviewer/leaderboard — Top submissions (reviewer only)
 * GET /api/analysis/:submissionId        — Full analysis for a submission
 */

const express = require('express');
const router = express.Router();
const {
  getAnalysis,
  getUserStats,
  getLeaderboard,
  getRecentAnalyses,
} = require('../controllers/analysisController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/user/stats', getUserStats);
router.get('/recent', getRecentAnalyses);
router.get('/reviewer/leaderboard', authorize('reviewer'), getLeaderboard);
router.get('/:submissionId', getAnalysis);

module.exports = router;
