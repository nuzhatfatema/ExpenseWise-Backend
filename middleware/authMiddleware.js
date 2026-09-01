// ==============================================================================
// File: middleware/authMiddleware.js
// Description: Middleware to protect routes and verify JSON Web Tokens (JWT).
//              Ensures only authenticated users can access protected endpoints.
// ==============================================================================

// Import jsonwebtoken to verify JWT tokens
const jwt = require('jsonwebtoken');

// Import the User model to fetch user details from database
const User = require('../models/User');

/**
 * protect: Express middleware function that checks incoming HTTP requests
 * for a valid JWT Bearer token in the "Authorization" header.
 */
const protect = async (req, res, next) => {
  let token;

  // Step 1: Check if the Authorization header exists and begins with "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Step 2: Extract the token string (format: "Bearer <token>")
      // Splitting by space gives: ["Bearer", "<token>"]
      token = req.headers.authorization.split(' ')[1];

      // Step 3: Verify the token using our secret key
      // jwt.verify decodes the payload if valid; throws error if invalid/expired
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mySuperSecretExpenseWiseKey_2026_jwt');

      // Step 4: Find the user in MongoDB using the id stored inside the token payload
      // .select('-password') excludes the hashed password from being loaded into req.user
      req.user = await User.findById(decoded.id).select('-password');

      // If user no longer exists in database, return 401 Unauthorized
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User belonging to this token no longer exists',
        });
      }

      // Step 5: Everything is valid! Call next() to proceed to the controller
      next();
    } catch (error) {
      // If token is invalid or expired, return 401 Unauthorized
      console.error('[Auth Middleware Error]:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed or expired',
      });
    }
  }

  // If no token was found in the Authorization header
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided in Authorization header',
    });
  }
};

// Export the protect middleware
module.exports = { protect };
