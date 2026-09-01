// ==============================================================================
// File: routes/incomeRoutes.js
// Description: Express Router defining income endpoints (/api/income).
//              All endpoints are protected and require a valid JWT token.
// ==============================================================================

// Step 1: Import Express framework
const express = require('express');

// Step 2: Create a new router instance
const router = express.Router();

// Step 3: Import Income controller CRUD functions
const {
  createIncome,
  getIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome,
} = require('../controllers/incomeController');

// Step 4: Import authentication protection middleware
const { protect } = require('../middleware/authMiddleware');

// Step 5: Protect all income routes with JWT verification
router.use(protect);

/**
 * Route: POST /api/income  - Create a new income entry
 * Route: GET  /api/income  - Fetch all income entries for logged-in user
 */
router.route('/')
  .post(createIncome)
  .get(getIncomes);

/**
 * Route: GET    /api/income/:id - Get single income entry by ID
 * Route: PUT    /api/income/:id - Update income entry by ID
 * Route: DELETE /api/income/:id - Delete income entry by ID
 */
router.route('/:id')
  .get(getIncomeById)
  .put(updateIncome)
  .delete(deleteIncome);

// Step 6: Export router to be mounted in server.js
module.exports = router;
