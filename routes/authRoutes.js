// ==============================================================================
// File: routes/authRoutes.js
// Description: Express Router defining authentication endpoints (/api/auth).
// ==============================================================================

// Import Express framework
const express = require('express');

// Create a new router instance
const router = express.Router();

// Import controller functions for authentication
const {
  registerUser,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

// Import authentication protection middleware
const { protect } = require('../middleware/authMiddleware');

/**
 * Route: POST /api/auth/register
 * Description: Register a new user account
 * Access: Public
 */
router.post('/register', registerUser);

/**
 * Route: POST /api/auth/login
 * Description: Login user and return JWT token
 * Access: Public
 */
router.post('/login', loginUser);

/**
 * Route: POST /api/auth/forgot-password
 * Description: Request password reset link by email
 * Access: Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * Route: POST /api/auth/reset-password/:token
 * Description: Reset password with token
 * Access: Public
 */
router.post('/reset-password/:token', resetPassword);

/**
 * Route: GET /api/auth/profile
 * Description: Get authenticated user profile details
 * Access: Private (Requires JWT Token)
 */
router.get('/profile', protect, getUserProfile);

// Export router to be mounted in server.js
module.exports = router;
