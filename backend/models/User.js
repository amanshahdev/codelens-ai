/**
 * models/User.js — User Schema
 *
 * WHAT: Defines the MongoDB document structure for a user account.
 *
 * HOW:  Mongoose schema with pre-save hook that automatically bcrypt-hashes
 *       the password before persisting. Includes a matchPassword instance
 *       method used during login to compare plain vs hashed passwords.
 *
 * WHY:  Encapsulating password logic inside the model keeps controllers clean
 *       and prevents accidental plain-text storage if a new save path is added.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned in queries unless explicitly requested
    },
    role: {
      type: String,
      enum: ['developer', 'reviewer'],
      default: 'developer',
    },
    avatar: {
      type: String,
      default: '', // URL to avatar (gravatar or uploaded)
    },
    bio: {
      type: String,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
      default: '',
    },
    stats: {
      totalSubmissions: { type: Number, default: 0 },
      avgScore: { type: Number, default: 0 },
      lastActive: { type: Date, default: Date.now },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt added automatically
  }
);

// ── Pre-save Hook: Hash password ──────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  // Only hash if password field was actually modified
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance Method: Compare passwords ───────────────────────────────────────
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ── Virtual: Initials for avatar fallback ────────────────────────────────────
UserSchema.virtual('initials').get(function () {
  return this.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

module.exports = mongoose.model('User', UserSchema);
