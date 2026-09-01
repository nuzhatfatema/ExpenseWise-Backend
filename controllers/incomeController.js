// ==============================================================================
// File: controllers/incomeController.js
// Description: Controller for Income CRUD operations.
//              Handles income creation, listing, single view, editing, deletion,
//              and user ownership verification.
// ==============================================================================

// Step 1: Import the Income Mongoose model
const Income = require('../models/Income');

/**
 * @desc    Create a new income entry
 * @route   POST /api/income
 * @access  Private (Protected by JWT)
 */
const createIncome = async (req, res, next) => {
  try {
    // Destructure required and optional fields from request body
    const { source, amount, date, note } = req.body;

    // Step 1: Validate required source field
    if (!source || !source.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an income source (e.g. Salary, Freelance, Investment)',
      });
    }

    // Step 2: Validate numeric amount
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the income amount',
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Income amount must be a positive number greater than zero',
      });
    }

    // Step 3: Parse optional date or default to current timestamp
    const incomeDate = date ? new Date(date) : new Date();

    // Step 4: Create new income document in MongoDB linked to logged-in user
    const newIncome = await Income.create({
      user: req.user._id,
      source: source.trim(),
      amount: numericAmount,
      date: incomeDate,
      note: note ? note.trim() : '',
    });

    // Step 5: Send success response with created income document
    res.status(201).json({
      success: true,
      message: 'Income entry added successfully',
      data: newIncome,
    });
  } catch (error) {
    // Forward any unexpected errors to global error handler
    next(error);
  }
};

/**
 * @desc    Get all income entries for the logged-in user (with optional date filters)
 * @route   GET /api/income
 * @access  Private (Protected by JWT)
 */
const getIncomes = async (req, res, next) => {
  try {
    // Start base query filtered by logged-in user ownership
    const query = { user: req.user._id };

    // Optional Filter: Specific Month and Year
    if (req.query.month && req.query.year) {
      const month = Number(req.query.month);
      const year = Number(req.query.year);
      const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }
    // Optional Filter: Custom Date Range
    else if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) {
        query.date.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Fetch incomes sorted by date descending (newest first)
    const incomes = await Income.find(query).sort({ date: -1 });

    // Calculate total sum of all returned income entries
    const totalAmount = incomes.reduce((sum, item) => sum + item.amount, 0);

    // Send response with list and summary numbers
    res.status(200).json({
      success: true,
      count: incomes.length,
      totalAmount: Number(totalAmount.toFixed(2)),
      data: incomes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single income entry by ID
 * @route   GET /api/income/:id
 * @access  Private (Protected by JWT)
 */
const getIncomeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find income by MongoDB ID
    const income = await Income.findById(id);

    // If income not found in database
    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Income entry not found',
      });
    }

    // Ownership Check: Ensure income belongs to logged-in user
    if (income.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this income entry',
      });
    }

    // Return income record
    res.status(200).json({
      success: true,
      data: income,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing income entry
 * @route   PUT /api/income/:id
 * @access  Private (Protected by JWT)
 */
const updateIncome = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { source, amount, date, note } = req.body;

    // Step 1: Find existing income entry
    const income = await Income.findById(id);

    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Income entry not found',
      });
    }

    // Step 2: Ownership Check
    if (income.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this income entry',
      });
    }

    // Step 3: Update source if provided
    if (source !== undefined && source.trim()) {
      income.source = source.trim();
    }

    // Step 4: Update amount if provided
    if (amount !== undefined) {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number greater than zero',
        });
      }
      income.amount = numericAmount;
    }

    // Step 5: Update date if provided
    if (date) {
      income.date = new Date(date);
    }

    // Step 6: Update note if provided
    if (note !== undefined) {
      income.note = note.trim();
    }

    // Step 7: Save updated document to database
    await income.save();

    res.status(200).json({
      success: true,
      message: 'Income entry updated successfully',
      data: income,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an income entry
 * @route   DELETE /api/income/:id
 * @access  Private (Protected by JWT)
 */
const deleteIncome = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Step 1: Find income entry
    const income = await Income.findById(id);

    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Income entry not found',
      });
    }

    // Step 2: Ownership Check
    if (income.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this income entry',
      });
    }

    // Step 3: Delete document from MongoDB
    await Income.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Income entry deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Export controller methods
module.exports = {
  createIncome,
  getIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome,
};
