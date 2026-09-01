// ==============================================================================
// File: models/Expense.js
// Description: Defines the Expense schema for tracking individual financial expenses.
//              Contains amount, category reference, date, notes, receipt URL, and user ownership.
// ==============================================================================

// Import Mongoose to define the schema and model
const mongoose = require('mongoose');

/**
 * Expense Schema:
 * Stores individual transaction records made by a user.
 */
const expenseSchema = new mongoose.Schema(
  {
    // Reference to the user who made this expense (Ownership)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Expense must belong to a user'],
    },

    // Reference to the category this expense belongs to (e.g., Food, Travel)
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please select a category for this expense'],
    },

    // Expense amount (must be positive number)
    amount: {
      type: Number,
      required: [true, 'Please provide the expense amount'],
      min: [0.01, 'Amount must be greater than 0'],
    },

    // Date when the expense occurred (defaults to current date/time)
    date: {
      type: Date,
      default: Date.now,
      required: [true, 'Please provide the date of the expense'],
    },

    // Optional text note/description describing the purchase
    note: {
      type: String,
      trim: true,
      default: '',
    },

    // Optional Cloudinary secure URL for uploaded receipt image
    receiptUrl: {
      type: String,
      default: null,
    },

    // Optional Cloudinary public_id used to delete the receipt from Cloudinary if expense is deleted
    receiptPublicId: {
      type: String,
      default: null,
    },
  },
  {
    // Automatically manage createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// Create the Mongoose Model from the schema
const Expense = mongoose.model('Expense', expenseSchema);

// Export Expense model
module.exports = Expense;
