// ==============================================================================
// File: routes/analyticsRoutes.js
// Description: Express Router defining analytics and aggregation endpoints (/api/analytics).
// ==============================================================================

// Import Express framework
const express = require('express');

// Create a new router instance
const router = express.Router();

// Import Analytics controller functions
const {
  getCategoryAnalytics,
  getMonthlyAnalytics,
  getSummaryStats,
} = require('../controllers/analyticsController');

// Import authentication protection middleware
const { protect } = require('../middleware/authMiddleware');

// Protect ALL analytics routes so only authenticated users can access their financial data
router.use(protect);

/**
 * Route: GET /api/analytics/category
 * Description: Get expense totals grouped by category (for Pie Charts)
 * Access: Private
 */
router.get('/category', getCategoryAnalytics);

/**
 * Route: GET /api/analytics/monthly
 * Description: Get expense totals grouped by month (for Bar Charts)
 * Access: Private
 */
router.get('/monthly', getMonthlyAnalytics);

/**
 * Route: GET /api/analytics/summary
 * Description: Get dashboard summary numbers (lifetime totals, monthly spend, budget status)
 * Access: Private
 */
router.get('/summary', getSummaryStats);

// Export router to be mounted in server.js
module.exports = router;
