/**
 * models/Analysis.js — AI Analysis Result Schema
 *
 * WHAT: Stores the full AI-generated review for a code submission, including
 *       the overall score, per-category breakdowns, issue list, and recommendations.
 *
 * HOW:  Linked 1-to-1 with a CodeSubmission via the `submission` ObjectId field.
 *       The `categories` subdocument holds granular scores (0-100) for each
 *       review dimension. `issues` is an array of specific findings. The raw
 *       `aiRawResponse` preserves the model output for debugging.
 *
 * WHY:  Keeping analysis separate from submissions lets us re-run analysis
 *       (e.g., with a newer model) without touching the original code document.
 */

const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
  severity: {
    type: String,
    enum: ['critical', 'warning', 'info', 'suggestion'],
    required: true,
  },
  line: { type: Number, default: null },
  message: { type: String, required: true },
  suggestion: { type: String, default: '' },
  category: {
    type: String,
    enum: ['security', 'performance', 'maintainability', 'style', 'logic', 'other'],
    default: 'other',
  },
});

const AnalysisSchema = new mongoose.Schema(
  {
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodeSubmission',
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    grade: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'F'],
      required: true,
    },
    categories: {
      codeQuality: { type: Number, min: 0, max: 100, default: 0 },
      security: { type: Number, min: 0, max: 100, default: 0 },
      performance: { type: Number, min: 0, max: 100, default: 0 },
      maintainability: { type: Number, min: 0, max: 100, default: 0 },
      bestPractices: { type: Number, min: 0, max: 100, default: 0 },
    },
    summary: {
      type: String,
      required: true,
    },
    issues: [IssueSchema],
    recommendations: [{ type: String }],
    positives: [{ type: String }],
    aiModel: {
      type: String,
      default: 'rule-based-v1',
    },
    processingTimeMs: {
      type: Number,
      default: 0,
    },
    aiRawResponse: {
      type: String, // stored for debugging; not exposed to frontend
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

AnalysisSchema.index({ user: 1, createdAt: -1 });

// ── Static: Compute letter grade from score ───────────────────────────────────
AnalysisSchema.statics.computeGrade = function (score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
};

module.exports = mongoose.model('Analysis', AnalysisSchema);
