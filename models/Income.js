// ==============================================================================
// File: models/Income.js
// Description: Defines the Income schema for tracking individual income entries.
//              Contains user ownership, source, amount, date, note, and timestamps.
// ==============================================================================

// Step 1: Import Mongoose to define the schema and model
const mongoose = require('mongoose');

/**
 * Income Schema:
 * Stores individual earnings and income records received by a user.
 */
const incomeSchema = new mongoose.Schema(
  {
    // Reference to the user who received this income (Ownership)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Income must belong to a user'],
    },

    // Source of income (e.g., Salary, Freelance, Business, Investment, Bonus, Other)
    source: {
      type: String,
      required: [true, 'Please provide the source of income'],
      trim: true,
    },

    // Income amount (must be a positive number greater than 0)
    amount: {
      type: Number,
      required: [true, 'Please provide the income amount'],
      min: [0.01, 'Amount must be greater than 0'],
    },

    // Date when the income was received (defaults to current date/time)
    date: {
      type: Date,
      default: Date.now,
      required: [true, 'Please provide the date of the income'],
    },

    // Optional text note/description describing the income
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    // Automatically manage createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// Step 2: Create the Mongoose Model from the schema
const Income = mongoose.model('Income', incomeSchema);

// Step 3: Export Income model
module.exports = Income;
