// ==============================================================================
// File: models/Budget.js
// Description: Defines the Budget schema for setting and tracking monthly spending limits.
//              Each budget belongs to a specific user for a specific month & year.
// ==============================================================================

// Import Mongoose to define the schema and model
const mongoose = require('mongoose');

/**
 * Budget Schema:
 * Stores monthly budget limits set by a user for specific month/year.
 */
const budgetSchema = new mongoose.Schema(
  {
    // Reference to the user setting the budget (Ownership)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Budget must belong to a user'],
    },

    // Month number (1 = January, 12 = December)
    month: {
      type: Number,
      required: [true, 'Please provide the budget month (1-12)'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12'],
    },

    // Year (e.g., 2026)
    year: {
      type: Number,
      required: [true, 'Please provide the budget year (e.g. 2026)'],
      min: [2000, 'Year must be valid'],
    },

    // Budget amount limit set by the user
    amount: {
      type: Number,
      required: [true, 'Please provide the monthly budget limit amount'],
      min: [0, 'Budget amount cannot be negative'],
    },
  },
  {
    // Automatically manage createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// Create a compound index so a user cannot have duplicate budget records for the exact same month & year
budgetSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

// Create the Mongoose Model from the schema
const Budget = mongoose.model('Budget', budgetSchema);

// Export Budget model
module.exports = Budget;
