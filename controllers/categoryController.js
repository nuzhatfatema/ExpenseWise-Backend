// ==============================================================================
// File: controllers/categoryController.js
// Description: Controller for Category CRUD operations (Create, Read, Update, Delete).
//              Ensures users can only manage their own personalized categories.
// ==============================================================================

// Import Category and Expense models
const Category = require('../models/Category');
const Expense = require('../models/Expense');

/**
 * @desc    Create a new category for the logged-in user
 * @route   POST /api/categories
 * @access  Private (Protected by JWT)
 */
const createCategory = async (req, res, next) => {
  try {
    // Step 1: Extract category name from request body
    const { name } = req.body;

    // Step 2: Validate category name
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a category name',
      });
    }

    // Step 3: Check if this user already has a category with this name (case-insensitive)
    const existingCategory = await Category.findOne({
      user: req.user._id,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists for your account',
      });
    }

    // Step 4: Create the new category linked to the authenticated user
    const category = await Category.create({
      name: name.trim(),
      user: req.user._id,
    });

    // Step 5: Return the created category
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all categories for the logged-in user
 * @route   GET /api/categories
 * @access  Private (Protected by JWT)
 */
const getCategories = async (req, res, next) => {
  try {
    // Find only the categories that belong to the logged-in user
    // Sort alphabetically by category name
    const categories = await Category.find({ user: req.user._id }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing category
 * @route   PUT /api/categories/:id
 * @access  Private (Protected by JWT)
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Step 1: Validate input
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide an updated category name',
      });
    }

    // Step 2: Find the category by ID
    const category = await Category.findById(id);

    // If category not found
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Step 3: Ownership Check - Verify category belongs to the logged-in user
    if (category.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this category',
      });
    }

    // Step 4: Update the category name
    category.name = name.trim();
    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a category
 * @route   DELETE /api/categories/:id
 * @access  Private (Protected by JWT)
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Step 1: Find the category by ID
    const category = await Category.findById(id);

    // If category does not exist
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Step 2: Ownership Check - Verify category belongs to the logged-in user
    if (category.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this category',
      });
    }

    // Step 3: Optional check - see if any expenses are using this category
    const expensesCount = await Expense.countDocuments({ category: id, user: req.user._id });
    if (expensesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${expensesCount} expense(s) are linked to this category. Please reassign or delete those expenses first.`,
      });
    }

    // Step 4: Delete the category
    await Category.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Export category controller functions
module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
};
