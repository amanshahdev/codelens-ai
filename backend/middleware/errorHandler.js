/**
 * middleware/errorHandler.js — Centralised Error Handler
 *
 * WHAT: Express error-handling middleware (4-param signature) that normalises
 *       all errors into a consistent JSON shape { success, message, errors? }.
 *
 * HOW:  Handles Mongoose-specific errors (cast errors, duplicate keys,
 *       validation failures) and generic errors. In development mode it also
 *       includes the stack trace to aid debugging.
 *
 * WHY:  Without a central handler, each controller must handle its own try/catch
 *       formatting—a recipe for inconsistency. This keeps controllers lean.
 */

exports.errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 404;
    message = `Resource not found. Invalid: ${err.path}`;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value for field: ${field}. That ${field} is already in use.`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // JWT errors (belt-and-suspenders — auth middleware already handles these)
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  const response = { success: false, message };
  if (errors) response.errors = errors;
  if (process.env.NODE_ENV === 'development') response.stack = err.stack;

  console.error(`[Error ${statusCode}] ${message}`, process.env.NODE_ENV === 'development' ? err.stack : '');

  res.status(statusCode).json(response);
};

// Convenience: create an error with a custom status code
exports.createError = (message, statusCode = 500) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};
