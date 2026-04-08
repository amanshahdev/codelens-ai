/**
 * controllers/codeController.js — Code Submission CRUD
 *
 * WHAT: Manages creating, reading, updating and deleting code submissions.
 *       Also triggers the AI analysis pipeline after a submission is saved.
 *
 * HOW:  submitCode() saves the submission document then calls the analysis
 *       service asynchronously (fire-and-forget pattern so the HTTP response
 *       returns quickly). The analysis result is stored separately in MongoDB
 *       and linked back to the submission via the `analysis` field.
 *
 * WHY:  Async analysis keeps the POST /api/code endpoint snappy (<200ms) even
 *       when the AI service takes several seconds.
 */

const fs = require("fs");
const path = require("path");
const CodeSubmission = require("../models/CodeSubmission");
const Analysis = require("../models/Analysis");
const User = require("../models/User");
const { analyzeCode } = require("../config/aiService");
const { createError } = require("../middleware/errorHandler");

// ── Helper: trigger AI analysis (async, non-blocking) ────────────────────────
async function triggerAnalysis(submission) {
  try {
    // Mark as analyzing
    submission.status = "analyzing";
    await submission.save();

    console.log(
      `[Analysis] Starting analysis for submission ${submission._id} (${submission.language})`,
    );
    const result = await analyzeCode(submission.code, submission.language);

    // Create Analysis document
    const analysis = await Analysis.create({
      submission: submission._id,
      user: submission.user,
      overallScore: result.overallScore,
      grade: result.grade,
      categories: result.categories,
      summary: result.summary,
      issues: result.issues,
      recommendations: result.recommendations,
      positives: result.positives,
      aiModel: result.aiModel,
      processingTimeMs: result.processingTimeMs,
      aiRawResponse: JSON.stringify(result.metrics || {}),
    });

    // Link analysis back to submission and mark complete
    submission.analysis = analysis._id;
    submission.status = "completed";
    await submission.save();

    // Update user stats
    const userSubmissions = await CodeSubmission.find({
      user: submission.user,
      status: "completed",
    }).select("_id");

    const analyses = await Analysis.find({
      user: submission.user,
    }).select("overallScore");

    const avgScore =
      analyses.length > 0
        ? Math.round(
            analyses.reduce((s, a) => s + a.overallScore, 0) / analyses.length,
          )
        : 0;

    await User.findByIdAndUpdate(submission.user, {
      "stats.totalSubmissions": userSubmissions.length,
      "stats.avgScore": avgScore,
      "stats.lastActive": Date.now(),
    });

    console.log(
      `[Analysis] Completed for submission ${submission._id} — Score: ${result.overallScore}/100`,
    );
  } catch (err) {
    console.error("[Analysis] Failed for submission", submission._id);
    console.error("[Analysis] Error:", err.message);
    console.error("[Analysis] Stack:", err.stack);
    submission.status = "failed";
    await submission.save();
  }
}

// ── POST /api/code — Submit code ──────────────────────────────────────────────
exports.submitCode = async (req, res, next) => {
  try {
    const { title, description, language, code, tags, isPublic } = req.body;

    if (!title || !language) {
      return next(createError("Title and language are required", 400));
    }

    let finalCode = code;
    let submissionType = "snippet";
    let fileName = "";
    let filePath = "";

    // If a file was uploaded via multer
    if (req.file) {
      submissionType = "file";
      fileName = req.file.originalname;
      filePath = req.file.path;
      finalCode = fs.readFileSync(req.file.path, "utf-8");
    }

    if (!finalCode || finalCode.trim().length < 5) {
      return next(
        createError(
          "Code content is required and must be at least 5 characters",
          400,
        ),
      );
    }

    const submission = await CodeSubmission.create({
      user: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : "",
      language: language.toLowerCase(),
      code: finalCode,
      submissionType,
      fileName,
      filePath,
      tags: tags
        ? Array.isArray(tags)
          ? tags
          : tags.split(",").map((t) => t.trim())
        : [],
      isPublic: isPublic === true || isPublic === "true",
      status: "pending",
    });

    // Respond immediately — analysis runs in background
    res.status(201).json({
      success: true,
      message: "Code submitted successfully. AI analysis is in progress.",
      submission: {
        _id: submission._id,
        title: submission.title,
        language: submission.language,
        status: submission.status,
        linesOfCode: submission.linesOfCode,
        createdAt: submission.createdAt,
      },
    });

    // Fire-and-forget: analyse asynchronously
    triggerAnalysis(submission).catch(console.error);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/code — List submissions for current user ─────────────────────────
exports.getSubmissions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip = (page - 1) * limit;
    const { status, language } = req.query;

    const filter = { user: req.user._id };
    if (status) filter.status = status;
    if (language) filter.language = language;

    const [submissions, total] = await Promise.all([
      CodeSubmission.find(filter)
        .populate("analysis", "overallScore grade categories summary createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-code -filePath"), // exclude heavy fields from list view
      CodeSubmission.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: submissions.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      submissions,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/code/:id — Single submission with full code ──────────────────────
exports.getSubmission = async (req, res, next) => {
  try {
    const submission = await CodeSubmission.findById(req.params.id)
      .populate("analysis")
      .populate("user", "name email role");

    if (!submission) {
      return next(createError("Submission not found", 404));
    }

    // Ownership check (reviewers can see all; developers only own)
    if (
      req.user.role !== "reviewer" &&
      submission.user._id.toString() !== req.user._id.toString()
    ) {
      return next(createError("Not authorised to view this submission", 403));
    }

    res.json({ success: true, submission });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/code/:id ──────────────────────────────────────────────────────
exports.deleteSubmission = async (req, res, next) => {
  try {
    const submission = await CodeSubmission.findById(req.params.id);

    if (!submission) {
      return next(createError("Submission not found", 404));
    }

    if (submission.user.toString() !== req.user._id.toString()) {
      return next(createError("Not authorised to delete this submission", 403));
    }

    // Delete linked analysis
    if (submission.analysis) {
      await Analysis.findByIdAndDelete(submission.analysis);
    }

    // Delete uploaded file if present
    if (submission.filePath && fs.existsSync(submission.filePath)) {
      fs.unlinkSync(submission.filePath);
    }

    await submission.deleteOne();

    res.json({ success: true, message: "Submission deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/code/:id/reanalyze — Re-run AI analysis ────────────────────────
exports.reanalyzeSubmission = async (req, res, next) => {
  try {
    const submission = await CodeSubmission.findById(req.params.id);

    if (!submission) {
      return next(createError("Submission not found", 404));
    }

    if (submission.user.toString() !== req.user._id.toString()) {
      return next(createError("Not authorised", 403));
    }

    if (submission.status === "analyzing") {
      return next(createError("Analysis already in progress", 400));
    }

    // Delete old analysis if exists
    if (submission.analysis) {
      await Analysis.findByIdAndDelete(submission.analysis);
      submission.analysis = null;
    }

    submission.status = "pending";
    await submission.save();

    res.json({ success: true, message: "Re-analysis started" });

    triggerAnalysis(submission).catch(console.error);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/code/reviewer/all — Reviewer: see all submissions ────────────────
exports.getAllSubmissions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      CodeSubmission.find()
        .populate("user", "name email role")
        .populate("analysis", "overallScore grade")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-code -filePath"),
      CodeSubmission.countDocuments(),
    ]);

    res.json({
      success: true,
      submissions,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};
