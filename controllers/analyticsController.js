// ==============================================================================
// File: controllers/analyticsController.js
// Description: Controller providing aggregated financial data for analytics and charts.
//              Groups expenses by category (for Pie Charts) and by month (for Bar Charts).
// ==============================================================================

// Import Mongoose for ObjectId conversions and models
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const Income = require('../models/Income');

/**
 * Helper function: getDateRangeForPeriod
 * Calculates UTC date range for periods: 'this_month' (default), 'last_month', or 'this_year'.
 */
const getDateRangeForPeriod = (period) => {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1; // 1-12

  if (period === 'last_month') {
    let targetMonth = currentMonth - 1;
    let targetYear = currentYear;
    if (targetMonth === 0) {
      targetMonth = 12;
      targetYear -= 1;
    }
    const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    const startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(targetYear, targetMonth - 1, lastDay, 23, 59, 59, 999));
    return {
      period: 'last_month',
      periodLabel: 'Last Month',
      startDate,
      endDate,
      month: targetMonth,
      year: targetYear,
    };
  }

  if (period === 'this_year') {
    const startDate = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));
    return {
      period: 'this_year',
      periodLabel: 'This Year',
      startDate,
      endDate,
      month: currentMonth,
      year: currentYear,
    };
  }

  // Default: 'this_month'
  const lastDay = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
  const startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(currentYear, currentMonth - 1, lastDay, 23, 59, 59, 999));
  return {
    period: 'this_month',
    periodLabel: 'This Month',
    startDate,
    endDate,
    month: currentMonth,
    year: currentYear,
  };
};

/**
 * @desc    Get expense data grouped by category (Ideal for Pie Charts)
 * @route   GET /api/analytics/category
 * @access  Private (Protected by JWT)
 */
const getCategoryAnalytics = async (req, res, next) => {
  try {
    const { month, year, startDate, endDate, period } = req.query;

    // Step 1: Build the match filter starting with the logged-in user's ObjectId
    const matchFilter = {
      user: new mongoose.Types.ObjectId(req.user._id),
    };

    // Period Filter: 'this_month', 'last_month', 'this_year'
    if (period) {
      const range = getDateRangeForPeriod(period);
      matchFilter.date = { $gte: range.startDate, $lte: range.endDate };
    }
    // Optional Filter: Specific Month and Year
    else if (month && year) {
      const m = Number(month);
      const y = Number(year);
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(y, m - 1, lastDay, 23, 59, 59, 999));
      matchFilter.date = { $gte: startOfMonth, $lte: endOfMonth };
    }
    // Optional Filter: Custom Date Range
    else if (startDate || endDate) {
      matchFilter.date = {};
      if (startDate) {
        const sParts = startDate.split('-');
        matchFilter.date.$gte = sParts.length === 3
          ? new Date(Date.UTC(Number(sParts[0]), Number(sParts[1]) - 1, Number(sParts[2]), 0, 0, 0, 0))
          : new Date(startDate);
      }
      if (endDate) {
        const eParts = endDate.split('-');
        const end = eParts.length === 3
          ? new Date(Date.UTC(Number(eParts[0]), Number(eParts[1]) - 1, Number(eParts[2]), 23, 59, 59, 999))
          : new Date(endDate);
        matchFilter.date.$lte = end;
      }
    }

    // Step 2: Use MongoDB Aggregation Pipeline to group expenses by category
    const categoryBreakdown = await Expense.aggregate([
      // Stage 1: Filter documents to only match this user's expenses (and date range)
      { $match: matchFilter },

      // Stage 2: Group by category ID and calculate total sum and count
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },

      // Stage 3: Join with the categories collection to get the category name
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },

      // Stage 4: Deconstruct categoryDetails array into an object
      {
        $unwind: {
          path: '$categoryDetails',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Stage 5: Project clean output fields
      {
        $project: {
          _id: 1,
          categoryId: '$_id',
          categoryName: { $ifNull: ['$categoryDetails.name', 'Uncategorized'] },
          totalAmount: { $round: ['$totalAmount', 2] },
          count: 1,
        },
      },

      // Stage 6: Sort by highest spending category first
      { $sort: { totalAmount: -1 } },
    ]);

    // Step 3: Calculate grand total to compute percentages for the pie chart
    const grandTotal = categoryBreakdown.reduce((sum, item) => sum + item.totalAmount, 0);

    // Step 4: Add percentage share to each category
    const formattedData = categoryBreakdown.map((item) => ({
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      totalAmount: item.totalAmount,
      count: item.count,
      percentage: grandTotal > 0 ? Number(((item.totalAmount / grandTotal) * 100).toFixed(2)) : 0,
    }));

    res.status(200).json({
      success: true,
      grandTotal: Number(grandTotal.toFixed(2)),
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get expense data grouped by month for a given year (Ideal for Bar Charts)
 * @route   GET /api/analytics/monthly
 * @access  Private (Protected by JWT)
 */
const getMonthlyAnalytics = async (req, res, next) => {
  try {
    // Target year defaults to current year if not specified
    const targetYear = req.query.year ? Number(req.query.year) : new Date().getFullYear();

    // Define full list of month names for the 12 calendar months
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Calculate start and end of the entire year
    const startOfYear = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));

    // Step 1: Aggregate expenses for the entire year grouped by month (1 to 12)
    const monthlyAggregated = await Expense.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user._id),
          date: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      {
        $group: {
          // Extract month (1-12) from date
          _id: { $month: '$date' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 }, // Sort chronologically 1 to 12
      },
    ]);

    // Step 2: Map aggregation results into a dictionary for quick lookup by month number
    const monthlyMap = {};
    monthlyAggregated.forEach((item) => {
      monthlyMap[item._id] = {
        totalAmount: Number(item.totalAmount.toFixed(2)),
        count: item.count,
      };
    });

    // Step 3: Construct full 12-month array so frontend charts receive all months (even months with $0)
    const resultData = monthNames.map((name, index) => {
      const monthNumber = index + 1;
      const dataForMonth = monthlyMap[monthNumber];

      return {
        month: monthNumber,
        monthName: name,
        year: targetYear,
        totalAmount: dataForMonth ? dataForMonth.totalAmount : 0,
        count: dataForMonth ? dataForMonth.count : 0,
      };
    });

    // Step 4: Calculate total spending for the whole year
    const yearlyTotal = resultData.reduce((sum, m) => sum + m.totalAmount, 0);

    res.status(200).json({
      success: true,
      year: targetYear,
      yearlyTotal: Number(yearlyTotal.toFixed(2)),
      data: resultData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard summary statistics (Overall and period-filtered overview)
 * @route   GET /api/analytics/summary
 * @access  Private (Protected by JWT)
 */
const getSummaryStats = async (req, res, next) => {
  try {
    const period = req.query.period || 'this_month';
    const range = getDateRangeForPeriod(period);

    // 1. Lifetime Expenses & Transactions
    const allExpenses = await Expense.find({ user: req.user._id });
    const totalLifetimeExpenses = allExpenses.reduce((sum, item) => sum + item.amount, 0);
    const totalTransactions = allExpenses.length;

    // 2. Lifetime Incomes & Transactions
    const allIncomes = await Income.find({ user: req.user._id });
    const totalLifetimeIncome = allIncomes.reduce((sum, item) => sum + item.amount, 0);
    const totalIncomeTransactions = allIncomes.length;

    // Lifetime Net Savings = Total Lifetime Income - Total Lifetime Expenses
    const lifetimeNetSavings = totalLifetimeIncome - totalLifetimeExpenses;

    // 3. Selected Period expenses
    const periodExpenses = await Expense.find({
      user: req.user._id,
      date: { $gte: range.startDate, $lte: range.endDate },
    });
    const periodSpent = periodExpenses.reduce((sum, item) => sum + item.amount, 0);

    // 4. Selected Period incomes
    const periodIncomes = await Income.find({
      user: req.user._id,
      date: { $gte: range.startDate, $lte: range.endDate },
    });
    const periodIncome = periodIncomes.reduce((sum, item) => sum + item.amount, 0);

    // Selected Period Net Savings = Period Income - Period Expenses
    const periodNetSavings = periodIncome - periodSpent;

    // 5. Budget for the selected period
    let budgetLimit = 0;
    let hasBudget = false;

    if (range.period === 'this_year') {
      const yearBudgets = await Budget.find({ user: req.user._id, year: range.year });
      budgetLimit = yearBudgets.reduce((sum, b) => sum + b.amount, 0);
      hasBudget = yearBudgets.length > 0;
    } else {
      const budgetRecord = await Budget.findOne({
        user: req.user._id,
        month: range.month,
        year: range.year,
      });
      if (budgetRecord) {
        budgetLimit = budgetRecord.amount;
        hasBudget = true;
      }
    }

    const remainingBudget = hasBudget ? budgetLimit - periodSpent : 0;
    const isBudgetExceeded = hasBudget ? periodSpent > budgetLimit : false;

    res.status(200).json({
      success: true,
      data: {
        period: range.period,
        periodLabel: range.periodLabel,
        currentMonth: range.month,
        currentYear: range.year,
        // Period statistics
        periodSpent: Number(periodSpent.toFixed(2)),
        periodExpense: Number(periodSpent.toFixed(2)),
        periodIncome: Number(periodIncome.toFixed(2)),
        periodNetSavings: Number(periodNetSavings.toFixed(2)),
        periodTransactions: periodExpenses.length,
        // Alias properties for backwards compatibility
        currentMonthSpent: Number(periodSpent.toFixed(2)),
        currentMonthExpense: Number(periodSpent.toFixed(2)),
        currentMonthIncome: Number(periodIncome.toFixed(2)),
        currentMonthNetSavings: Number(periodNetSavings.toFixed(2)),
        currentMonthTransactions: periodExpenses.length,
        // Lifetime statistics
        totalLifetimeExpenses: Number(totalLifetimeExpenses.toFixed(2)),
        totalLifetimeIncome: Number(totalLifetimeIncome.toFixed(2)),
        lifetimeNetSavings: Number(lifetimeNetSavings.toFixed(2)),
        totalIncome: Number(totalLifetimeIncome.toFixed(2)),
        totalExpense: Number(totalLifetimeExpenses.toFixed(2)),
        netSavings: Number(lifetimeNetSavings.toFixed(2)),
        totalTransactions,
        totalIncomeTransactions,
        // Budget details
        budgetLimit,
        hasBudget,
        remainingBudget: Number(remainingBudget.toFixed(2)),
        isBudgetExceeded,
        isExceeded: isBudgetExceeded,
        totalSpent: Number(periodSpent.toFixed(2)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Export analytics controller functions
module.exports = {
  getCategoryAnalytics,
  getMonthlyAnalytics,
  getSummaryStats,
};
