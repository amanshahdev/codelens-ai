/**
 * controllers/analysisController.js — Analysis Result Retrieval
 *
 * WHAT: Exposes endpoints for reading AI analysis results and platform-wide stats.
 *
 * HOW:  getAnalysis() returns the analysis linked to a specific submission.
 *       getUserStats() aggregates scores and counts for the dashboard cards.
 *       getLeaderboard() is available to reviewers for a platform-wide view.
 *
 * WHY:  Separating read operations for analysis results keeps codeController
 *       focused on submission lifecycle and makes it easy to add analytics later.
 */

const Analysis = require('../models/Analysis');
const CodeSubmission = require('../models/CodeSubmission');
const User = require('../models/User');
const { createError } = require('../middleware/errorHandler');

// ── GET /api/analysis/:submissionId — Get analysis for a submission ───────────
exports.getAnalysis = async (req, res, next) => {
  try {
    const submission = await CodeSubmission.findById(req.params.submissionId).select('user');
    if (!submission) return next(createError('Submission not found', 404));

    // Access control
    if (
      req.user.role !== 'reviewer' &&
      submission.user.toString() !== req.user._id.toString()
    ) {
      return next(createError('Not authorised', 403));
    }

    const analysis = await Analysis.findOne({ submission: req.params.submissionId });
    if (!analysis) {
      return res.json({ success: true, analysis: null, message: 'Analysis not yet available' });
    }

    res.json({ success: true, analysis });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/analysis/user/stats — Dashboard stats for current user ───────────
exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [submissions, analyses] = await Promise.all([
      CodeSubmission.find({ user: userId }).select('status language createdAt'),
      Analysis.find({ user: userId }).select('overallScore grade categories createdAt'),
    ]);

    const totalSubmissions = submissions.length;
    const completedSubmissions = submissions.filter((s) => s.status === 'completed').length;
    const pendingSubmissions = submissions.filter((s) => s.status === 'pending' || s.status === 'analyzing').length;

    const avgScore = analyses.length > 0
      ? Math.round(analyses.reduce((s, a) => s + a.overallScore, 0) / analyses.length)
      : 0;

    const highestScore = analyses.length > 0
      ? Math.max(...analyses.map((a) => a.overallScore))
      : 0;

    // Language breakdown
    const languageCounts = {};
    for (const sub of submissions) {
      languageCounts[sub.language] = (languageCounts[sub.language] || 0) + 1;
    }

    // Grade distribution
    const gradeDist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const a of analyses) {
      if (gradeDist[a.grade] !== undefined) gradeDist[a.grade]++;
    }

    // Score over time (last 10)
    const recentScores = analyses
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .reverse()
      .map((a) => ({
        date: a.createdAt,
        score: a.overallScore,
        grade: a.grade,
      }));

    // Average category scores
    let avgCategories = { codeQuality: 0, security: 0, performance: 0, maintainability: 0, bestPractices: 0 };
    if (analyses.length > 0) {
      for (const a of analyses) {
        for (const key of Object.keys(avgCategories)) {
          avgCategories[key] += a.categories[key] || 0;
        }
      }
      for (const key of Object.keys(avgCategories)) {
        avgCategories[key] = Math.round(avgCategories[key] / analyses.length);
      }
    }

    res.json({
      success: true,
      stats: {
        totalSubmissions,
        completedSubmissions,
        pendingSubmissions,
        avgScore,
        highestScore,
        languageCounts,
        gradeDist,
        recentScores,
        avgCategories,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/analysis/reviewer/leaderboard — Top submissions (reviewer only) ──
exports.getLeaderboard = async (req, res, next) => {
  try {
    const topAnalyses = await Analysis.find()
      .populate({
        path: 'submission',
        select: 'title language user',
        populate: { path: 'user', select: 'name email' },
      })
      .sort({ overallScore: -1 })
      .limit(20)
      .select('overallScore grade summary categories createdAt');

    res.json({ success: true, leaderboard: topAnalyses });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/analysis/recent — Recent analyses for the user ──────────────────
exports.getRecentAnalyses = async (req, res, next) => {
  try {
    const analyses = await Analysis.find({ user: req.user._id })
      .populate('submission', 'title language linesOfCode createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('overallScore grade summary createdAt');

    res.json({ success: true, analyses });
  } catch (err) {
    next(err);
  }
};
