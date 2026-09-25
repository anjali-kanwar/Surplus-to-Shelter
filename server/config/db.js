const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/food-rescue-app';
  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection warning: ${error.message}`);
    console.warn('[MongoDB] Running in offline/fallback mode. Please ensure MongoDB service is active for database persistence.');
  }
};

module.exports = connectDB;

