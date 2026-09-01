// ==============================================================================
// File: routes/budgetRoutes.js
// Description: Express Router defining budget endpoints (/api/budgets).
// ==============================================================================

// Import Express framework
const express = require('express');

// Create a new router instance
const router = express.Router();

// Import Budget controller functions
const {
  setBudget,
  getBudgetStatus,
} = require('../controllers/budgetController');

// Import authentication protection middleware
const { protect } = require('../middleware/authMiddleware');

// Protect ALL budget routes so only authenticated users can access them
router.use(protect);

/**
 * Route: POST /api/budgets
 * Description: Set or update the monthly spending budget limit
 * Access: Private
 */
router.post('/', setBudget);

/**
 * Route: GET /api/budgets/status
 * Description: Get budget vs spending status (budget limit, spent, remaining, isExceeded)
 * Access: Private
 */
router.get('/status', getBudgetStatus);

// Export router to be mounted in server.js
module.exports = router;
