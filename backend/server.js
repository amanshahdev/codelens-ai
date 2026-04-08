/**
 * server.js — Main Entry Point
 *
 * WHAT: Bootstraps the entire Express application. Connects to MongoDB,
 *       registers all middleware (CORS, JSON parsing, rate limiting),
 *       mounts route handlers, and starts the HTTP server.
 *
 * HOW:  Loads environment variables via dotenv, initialises Express,
 *       attaches middleware in order (global then route-specific),
 *       and calls connectDB() before listen().
 *
 * WHY:  Centralised startup keeps the codebase predictable — any new route
 *       or middleware is registered here and immediately visible to other devs.
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const codeRoutes = require("./routes/code");
const analysisRoutes = require("./routes/analysis");
const { errorHandler } = require("./middleware/errorHandler");
const connectDB = require("./config/db");

const app = express();

// ── Database ──────────────────────────────────────────────────────────────────
connectDB();

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "https://codelens-ai-one.vercel.app",
    ],
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploaded files statically (local dev only; use cloud storage in prod)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Global rate limiter — 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});
app.use(globalLimiter);

// Tighter limiter for auth endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many auth attempts. Please try again in 15 minutes.",
  },
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/code", codeRoutes);
app.use("/api/analysis", analysisRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "AI Code Review API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res
    .status(404)
    .json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Centralised Error Handler ─────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `\n🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`,
  );
  console.log(`📡 API: http://localhost:${PORT}/api/health\n`);
});

// Graceful shutdown
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err.message);
  process.exit(1);
});
