// ==============================================================================
// File: middleware/errorMiddleware.js
// Description: Centralized error handling middleware functions for Express.
//              Handles 404 (Not Found) and general runtime application errors.
// ==============================================================================

/**
 * notFound Middleware:
 * Triggers when a client requests a URL route that does not exist in our app.
 */
const notFound = (req, res, next) => {
  // Create a new Error object describing the missing route
  const error = new Error(`Route Not Found - ${req.originalUrl}`);
  // Set HTTP status code to 404
  res.status(404);
  // Pass the error to the next error-handling middleware
  next(error);
};

/**
 * errorHandler Middleware:
 * Catches all errors thrown anywhere in our application routes or controllers.
 * Standardizes the JSON error response sent back to the client.
 */
const errorHandler = (err, req, res, next) => {
  // If the status code was still 200 (OK), default it to 500 (Internal Server Error)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Send structured JSON error response
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Server Error',
    // In development mode, you can inspect the error stack trace
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

// Export error handling middlewares
module.exports = { notFound, errorHandler };
