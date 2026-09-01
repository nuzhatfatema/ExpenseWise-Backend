// ==============================================================================
// File: controllers/budgetController.js
// Description: Controller for managing monthly spending budgets.
//              Allows users to set budget limits and check if expenses exceed them.
// ==============================================================================

// Import Budget and Expense models
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');

/**
 * @desc    Set or update monthly budget for a specific month and year
 * @route   POST /api/budgets
 * @access  Private (Protected by JWT)
 */
const setBudget = async (req, res, next) => {
  try {
    const currentDate = new Date();
    // Default to current month (1-12) and current year if not provided
    const month = req.body.month ? Number(req.body.month) : currentDate.getMonth() + 1;
    const year = req.body.year ? Number(req.body.year) : currentDate.getFullYear();
    const { amount } = req.body;

    // Step 1: Validate input
    if (amount === undefined || amount === null || amount === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a budget amount',
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Budget amount must be a positive number',
      });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12',
      });
    }

    // Step 2: Check if a budget record already exists for this user, month, and year
    let budget = await Budget.findOne({
      user: req.user._id,
      month: month,
      year: year,
    });

    if (budget) {
      // Update existing budget
      budget.amount = numericAmount;
      await budget.save();
    } else {
      // Create new budget record
      budget = await Budget.create({
        user: req.user._id,
        month: month,
        year: year,
        amount: numericAmount,
      });
    }

    res.status(200).json({
      success: true,
      message: `Monthly budget for ${month}/${year} set to ${numericAmount}`,
      data: budget,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get budget status for a given month/year (calculates spending vs limit)
 * @route   GET /api/budgets/status
 * @access  Private (Protected by JWT)
 */
const getBudgetStatus = async (req, res, next) => {
  try {
    const currentDate = new Date();
    // Use query parameters or default to current month & year
    const month = req.query.month ? Number(req.query.month) : currentDate.getUTCMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : currentDate.getUTCFullYear();

    // Step 1: Calculate the start and end dates of the selected month in UTC
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));

    // Step 2: Find the user's budget setting for this month & year
    const budgetRecord = await Budget.findOne({
      user: req.user._id,
      month: month,
      year: year,
    });

    // Step 3: Find all expenses created by this user within this month range
    const expenses = await Expense.find({
      user: req.user._id,
      date: { $gte: startDate, $lte: endDate },
    });

    // Step 4: Calculate the total sum spent in this month
    const totalSpent = expenses.reduce((accumulator, item) => accumulator + item.amount, 0);

    // Step 5: Determine budget limit and status
    const budgetLimit = budgetRecord ? budgetRecord.amount : 0;
    const hasBudget = budgetRecord !== null;
    const isExceeded = hasBudget ? totalSpent > budgetLimit : false;
    const remainingBudget = hasBudget ? budgetLimit - totalSpent : 0;
    const percentageUsed = hasBudget && budgetLimit > 0
      ? Number(((totalSpent / budgetLimit) * 100).toFixed(2))
      : 0;

    // Step 6: Generate a clear human-readable status message
    let message = '';
    if (!hasBudget) {
      message = `No budget limit set for ${month}/${year}. Total spent so far: ${totalSpent.toFixed(2)}`;
    } else if (isExceeded) {
      const overBy = (totalSpent - budgetLimit).toFixed(2);
      message = `Alert: You have exceeded your budget for ${month}/${year} by $${overBy}!`;
    } else {
      message = `You are within your budget for ${month}/${year}. Remaining balance: $${remainingBudget.toFixed(2)}`;
    }

    // Step 7: Return comprehensive budget status object
    res.status(200).json({
      success: true,
      data: {
        month,
        year,
        hasBudget,
        budgetLimit,
        totalSpent: Number(totalSpent.toFixed(2)),
        remainingBudget: Number(remainingBudget.toFixed(2)),
        percentageUsed,
        isExceeded,
        message,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Export budget controller functions
module.exports = {
  setBudget,
  getBudgetStatus,
};
