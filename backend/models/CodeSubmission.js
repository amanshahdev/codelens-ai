/**
 * models/CodeSubmission.js — Code Submission Schema
 *
 * WHAT: Stores every code snippet or file a developer submits for review.
 *
 * HOW:  Each document holds the code content (inline text or file reference),
 *       metadata like language and title, the submitting user's ObjectId, and
 *       a reference to the Analysis document once the AI review is complete.
 *
 * WHY:  Separating submissions from analysis results keeps the schema clean
 *       and lets us re-trigger analysis without duplicating submission data.
 */

const mongoose = require('mongoose');

const CodeSubmissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Submission title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    language: {
      type: String,
      required: [true, 'Programming language is required'],
      enum: ['javascript', 'python', 'java', 'typescript', 'cpp', 'go', 'rust', 'other'],
    },
    submissionType: {
      type: String,
      enum: ['snippet', 'file'],
      default: 'snippet',
    },
    code: {
      type: String,
      required: [true, 'Code content is required'],
      maxlength: [50000, 'Code cannot exceed 50,000 characters'],
    },
    fileName: {
      type: String,
      default: '',
    },
    filePath: {
      type: String, // local path or cloud storage URL
      default: '',
    },
    linesOfCode: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'completed', 'failed'],
      default: 'pending',
    },
    analysis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analysis',
      default: null,
    },
    tags: [{ type: String, trim: true }],
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ── Index for fast user-based queries ─────────────────────────────────────────
CodeSubmissionSchema.index({ user: 1, createdAt: -1 });
CodeSubmissionSchema.index({ status: 1 });

// ── Pre-save: Auto-calculate lines of code ────────────────────────────────────
CodeSubmissionSchema.pre('save', function (next) {
  if (this.isModified('code') && this.code) {
    this.linesOfCode = this.code.split('\n').length;
  }
  next();
});

module.exports = mongoose.model('CodeSubmission', CodeSubmissionSchema);
