// ==============================================================================
// File: routes/categoryRoutes.js
// Description: Express Router defining category endpoints (/api/categories).
//              All category routes are protected by JWT authentication.
// ==============================================================================

// Import Express framework
const express = require('express');

// Create a new router instance
const router = express.Router();

// Import Category controller functions
const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

// Import authentication protection middleware
const { protect } = require('../middleware/authMiddleware');

// Apply the protect middleware to ALL category routes below
router.use(protect);

/**
 * Route: POST /api/categories - Create new category
 * Route: GET /api/categories  - Get all categories for logged-in user
 */
router.route('/')
  .post(createCategory)
  .get(getCategories);

/**
 * Route: PUT /api/categories/:id    - Update category by ID
 * Route: DELETE /api/categories/:id - Delete category by ID
 */
router.route('/:id')
  .put(updateCategory)
  .delete(deleteCategory);

// Export router to be mounted in server.js
module.exports = router;
