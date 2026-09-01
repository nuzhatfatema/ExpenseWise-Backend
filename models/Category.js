// ==============================================================================
// File: models/Category.js
// Description: Defines the Category schema for categorizing expenses (e.g. Food, Travel, Rent).
//              Each category is linked to the specific user who created it.
// ==============================================================================

// Import Mongoose to define the schema and model
const mongoose = require('mongoose');

/**
 * Category Schema:
 * Stores custom expense categories created by users.
 */
const categorySchema = new mongoose.Schema(
  {
    // The name of the category (e.g., "Food", "Rent", "Entertainment", "Groceries")
    name: {
      type: String,
      required: [true, 'Please provide a category name'], // Mandatory field
      trim: true,                                         // Removes leading/trailing spaces
    },

    // Reference to the User who created this category (Ownership)
    user: {
      type: mongoose.Schema.Types.ObjectId, // Stores MongoDB ObjectId of the user
      ref: 'User',                          // References the "User" model
      required: [true, 'Category must belong to a user'],
    },
  },
  {
    // Automatically manage createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// Create the Mongoose Model from the schema
const Category = mongoose.model('Category', categorySchema);

// Export Category model
module.exports = Category;
