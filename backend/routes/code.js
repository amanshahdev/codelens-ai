/**
 * routes/code.js — Code Submission Routes
 *
 * POST   /api/code               — Submit new code (snippet or file)
 * GET    /api/code               — List own submissions
 * GET    /api/code/reviewer/all  — All submissions (reviewer only)
 * GET    /api/code/:id           — Single submission with full code
 * DELETE /api/code/:id           — Delete own submission
 * POST   /api/code/:id/reanalyze — Re-run AI analysis
 */

const express = require('express');
const router = express.Router();
const {
  submitCode,
  getSubmissions,
  getSubmission,
  deleteSubmission,
  reanalyzeSubmission,
  getAllSubmissions,
} = require('../controllers/codeController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All code routes require authentication
router.use(protect);

router.post('/', upload.single('file'), submitCode);
router.get('/', getSubmissions);
router.get('/reviewer/all', authorize('reviewer'), getAllSubmissions);
router.get('/:id', getSubmission);
router.delete('/:id', deleteSubmission);
router.post('/:id/reanalyze', reanalyzeSubmission);

module.exports = router;
