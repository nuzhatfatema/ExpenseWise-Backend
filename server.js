// ==============================================================================
// File: server.js
// Description: Main application entry point for the ExpenseWise Backend API.
//              Sets up Express, connects to local MongoDB, applies middleware,
//              mounts API routes, and starts the HTTP server.
// ==============================================================================

// Step 1: Load environment variables from .env file into process.env
const dotenv = require('dotenv');
dotenv.config();

// Step 2: Import essential external modules
const express = require('express'); // Express web application framework
const cors = require('cors');       // Cross-Origin Resource Sharing middleware

// Step 3: Import database connection configuration
const connectDB = require('./config/db');

// Step 4: Import all route modules
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const incomeRoutes = require('./routes/incomeRoutes');

// Step 5: Import custom error-handling middleware functions
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Step 6: Initialize the Express application
const app = express();

// Step 7: Connect to the local MongoDB database
connectDB();

// Step 8: Apply standard global middleware
// Enable CORS so frontend applications (e.g. React/Vue/HTML) on different ports can communicate with this API
app.use(cors());

// Parse incoming requests with JSON payloads (req.body)
app.use(express.json());

// Parse URL-encoded request bodies (for standard HTML form data)
app.use(express.urlencoded({ extended: true }));

// Step 9: Base / Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to ExpenseWise API – Personal Budget Tracker with Analytics',
    version: '1.0.0',
    status: 'Server is running healthy',
  });
});

// Step 10: Mount application routes
app.use('/api/auth', authRoutes);           // Authentication (register, login, profile)
app.use('/api/categories', categoryRoutes); // Category management
app.use('/api/expenses', expenseRoutes);     // Expense tracking & receipt uploads
app.use('/api/income', incomeRoutes);       // Income tracking & net savings
app.use('/api/budgets', budgetRoutes);       // Monthly budget limit & alerts
app.use('/api/analytics', analyticsRoutes); // Financial charts & aggregated data

// Step 11: Mount custom error handling middleware
// notFound triggers when request URL doesn't match any route
app.use(notFound);

// errorHandler catches any errors thrown inside route handlers or controllers
app.use(errorHandler);

// Step 12: Define server port and start listening for HTTP requests
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[Server] ExpenseWise Backend running on http://localhost:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});
