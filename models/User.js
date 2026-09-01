// ==============================================================================
// File: models/User.js
// Description: Defines the User schema for storing registered users.
// ==============================================================================

// Import Mongoose to define the schema and model
const mongoose = require('mongoose');

/**
 * User Schema:
 * Defines the structure of documents stored in the "users" collection.
 */
const userSchema = new mongoose.Schema(
  {
    // Full name of the user
    name: {
      type: String,
      required: [true, 'Please provide your full name'], // Mandatory field
      trim: true,                                       // Removes whitespace around string
    },

    // Email address used for authentication (must be unique)
    email: {
      type: String,
      required: [true, 'Please provide an email address'], // Mandatory field
      unique: true,                                        // Ensures no two users have the same email
      lowercase: true,                                     // Automatically converts email to lowercase
      trim: true,                                          // Removes whitespace around email
    },

    // Hashed password (never store plain text passwords!)
    password: {
      type: String,
      required: [true, 'Please provide a password'], // Mandatory field
      minlength: [6, 'Password must be at least 6 characters long'],
    },

    // Password Reset Token (Hashed SHA-256 string for secure password recovery)
    resetPasswordToken: {
      type: String,
      default: null,
    },

    // Expiry timestamp for the password reset token (valid for 10 minutes)
    resetPasswordExpire: {
      type: Date,
      default: null,
    },
  },
  {
    // timestamps: Automatically adds `createdAt` and `updatedAt` date fields to each document
    timestamps: true,
  }
);

// Create the Mongoose Model from the schema
// Mongoose will map this to the "users" collection in MongoDB
const User = mongoose.model('User', userSchema);

// Export the User model for use in auth controllers and middleware
module.exports = User;
