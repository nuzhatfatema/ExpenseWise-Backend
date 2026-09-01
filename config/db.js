// ==============================================================================
// File: config/db.js
// Description: Establishes connection to the local MongoDB database using Mongoose.
// ==============================================================================

// Import the Mongoose library which helps us interact with MongoDB in Node.js
const mongoose = require('mongoose');

/**
 * connectDB: Asynchronous function to connect to local MongoDB.
 * Uses try...catch block to handle successful connections and errors gracefully.
 */
const connectDB = async () => {
  try {
    // Read the database URI from the .env file (or fallback to local default)
    const connUri = process.env.MONGO_URI || 'mongodb://localhost:27017/expensewise';

    // Attempt to connect to MongoDB with Mongoose
    const conn = await mongoose.connect(connUri);

    // Log success message showing which host we connected to
    console.log(`[Database] MongoDB Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    // If connection fails, print error message and exit the process with failure code 1
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Export the connectDB function so we can call it in server.js
module.exports = connectDB;
