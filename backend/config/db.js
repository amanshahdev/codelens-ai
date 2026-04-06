/**
 * config/db.js — MongoDB Connection
 *
 * WHAT: Establishes and manages the Mongoose connection to MongoDB Atlas.
 *
 * HOW:  Uses mongoose.connect() with the URI from .env. Mongoose 8.x handles
 *       connection pooling automatically. We log success/failure so ops teams
 *       can see DB health at startup.
 *
 * WHY:  Separating DB config from server.js keeps concerns isolated and makes
 *       it easy to swap databases (e.g., switch to a local Mongo in testing).
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options are defaults in Mongoose 8 but explicit for clarity
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
