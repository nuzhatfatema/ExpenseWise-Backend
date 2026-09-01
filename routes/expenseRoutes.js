// ==============================================================================
// File: routes/expenseRoutes.js
// Description: Express Router defining expense endpoints (/api/expenses).
//              Includes Multer middleware for uploading receipt images to Cloudinary.
// ==============================================================================

// Import Express framework
const express = require('express');

// Create a new router instance
const router = express.Router();

// Import Expense controller functions
const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  exportExpensesCSV,
  exportExpensesPDF,
} = require('../controllers/expenseController');

// Import authentication protection middleware
const { protect } = require('../middleware/authMiddleware');

// Import Multer upload middleware for receipt images (fieldName: 'receipt')
const upload = require('../middleware/uploadMiddleware');

// Protect ALL expense routes so only authenticated users can access them
router.use(protect);

/**
 * Route: GET /api/expenses/export/csv
 * Description: Export expenses as downloadable CSV spreadsheet
 */
router.get('/export/csv', exportExpensesCSV);

/**
 * Route: GET /api/expenses/export/pdf
 * Description: Export expenses as PDF report uploaded to Cloudinary (returns shareable URL)
 */
router.get('/export/pdf', exportExpensesPDF);

/**
 * Route: POST /api/expenses
 * Description: Create a new expense (with optional receipt image upload)
 * Middleware: protect -> upload.single('receipt') -> createExpense
 *
 * Route: GET /api/expenses
 * Description: Fetch all expenses for the user (with optional query filters)
 * Middleware: protect -> getExpenses
 */
router.route('/')
  .post(upload.single('receipt'), createExpense)
  .get(getExpenses);

/**
 * Route: GET /api/expenses/:id    - Get single expense by ID
 * Route: PUT /api/expenses/:id    - Update expense by ID (with optional new receipt image)
 * Route: DELETE /api/expenses/:id - Delete expense by ID
 */
router.route('/:id')
  .get(getExpenseById)
  .put(upload.single('receipt'), updateExpense)
  .delete(deleteExpense);

// Export router to be mounted in server.js
module.exports = router;
