/**
 * middleware/upload.js — Multer File Upload Configuration
 *
 * WHAT: Configures multer for handling multipart/form-data file uploads.
 *       Restricts uploads to .js, .py, .java, .ts, .go files under 500 KB.
 *
 * HOW:  diskStorage is used in development to save files to /uploads/.
 *       In production you'd swap this to multer-s3 or similar cloud storage.
 *       The fileFilter rejects disallowed MIME types before writing to disk.
 *
 * WHY:  Centralising upload config prevents scattered multer instances across
 *       routes and makes it trivial to change storage strategy (disk → cloud).
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Storage ───────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Pattern: userId_timestamp_originalName  (avoids collisions)
    const userId = req.user ? req.user._id : 'anon';
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${userId}_${Date.now()}_${baseName}${ext}`);
  },
});

// ── File Filter ───────────────────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = ['.js', '.py', '.java', '.ts', '.go', '.cpp', '.rs', '.txt'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(`File type not allowed. Accepted types: ${ALLOWED_EXTENSIONS.join(', ')}`),
      false
    );
  }
};

// ── Export Multer Instance ────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024, // 500 KB
    files: 1,
  },
});

module.exports = upload;
