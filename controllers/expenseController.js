// ==============================================================================
// File: controllers/expenseController.js
// Description: Controller for Expense CRUD operations.
//              Handles expense creation, editing, deletion, ownership verification,
//              Cloudinary receipt uploads, and monthly budget alert checks.
// ==============================================================================

// Import Expense, Category, Budget, and User models
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const User = require('../models/User');

// Import Cloudinary configuration for receipt image uploading and deletion
const cloudinary = require('../config/cloudinary');

// Import json2csv Parser for CSV export
const { Parser } = require('json2csv');

// Import PDFKit for PDF report generation
const PDFDocument = require('pdfkit');

// Import Nodemailer helper for email notifications
const { sendEmail } = require('../config/nodemailer');

/**
 * Helper function: uploadToCloudinary
 * Converts a Multer memory buffer to a base64 Data URI and uploads it to Cloudinary.
 * @param {Object} file - The req.file object provided by Multer
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
const uploadToCloudinary = async (file) => {
  // Convert buffer to Base64 Data URI string
  const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

  // Upload image to Cloudinary in the "expensewise_receipts" folder
  const uploadResult = await cloudinary.uploader.upload(base64Image, {
    folder: 'expensewise_receipts',
    resource_type: 'image',
  });

  return {
    secure_url: uploadResult.secure_url,
    public_id: uploadResult.public_id,
  };
};

/**
 * Helper function: parseDateSafe
 * Converts string dates (YYYY-MM-DD) or Date objects into timezone-safe UTC Date instances.
 */
const parseDateSafe = (d) => {
  if (!d) return new Date();
  if (typeof d === 'string') {
    const parts = d.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
      }
    }
  }
  return new Date(d);
};

/**
 * Helper function: checkMonthlyBudgetStatus
 * Calculates whether total expenses for a given month and year exceed the user's budget.
 */
const checkMonthlyBudgetStatus = async (userId, targetDate) => {
  const expenseDate = parseDateSafe(targetDate);
  const month = expenseDate.getUTCMonth() + 1; // 1-12
  const year = expenseDate.getUTCFullYear();

  console.log(`[Budget Check] Evaluating budget for User: ${userId} | Target Date: ${targetDate} | Month: ${month}/${year}`);

  // Find budget record for this month & year
  const budget = await Budget.findOne({ user: userId, month, year });
  if (!budget) {
    console.log(`[Budget Check] No budget record found for User: ${userId} for ${month}/${year}`);
    return {
      hasBudget: false,
      isExceeded: false,
      message: 'No budget set for this month',
    };
  }

  // Calculate start and end of the target month in UTC to encompass all timezone inputs
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));

  // Sum all expenses for this user in this month
  const monthlyExpenses = await Expense.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate },
  });

  const totalSpent = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);
  const isExceeded = totalSpent > budget.amount;
  const remaining = budget.amount - totalSpent;

  console.log(`[Budget Check] Result -> Budget Limit: ₹${budget.amount}, Total Spent: ₹${totalSpent}, isExceeded: ${isExceeded}`);

  return {
    hasBudget: true,
    month,
    year,
    budgetLimit: budget.amount,
    totalSpent: Number(totalSpent.toFixed(2)),
    remainingBudget: Number(remaining.toFixed(2)),
    isExceeded,
    message: isExceeded
      ? `Budget Alert: You have exceeded your monthly budget for ${month}/${year} by ₹${(totalSpent - budget.amount).toFixed(2)}!`
      : `You are within your monthly budget for ${month}/${year}. Remaining: ₹${remaining.toFixed(2)}`,
  };
};

/**
 * @desc    Create a new expense (with optional receipt image upload to Cloudinary)
 * @route   POST /api/expenses
 * @access  Private (Protected by JWT)
 */
const createExpense = async (req, res, next) => {
  try {
    const { amount, category, date, note } = req.body;

    // Step 1: Validate required fields
    if (!amount || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both amount and category ID',
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense amount must be a positive number greater than zero',
      });
    }

    // Step 2: Verify that the chosen category exists and belongs to the logged-in user
    const existingCategory = await Category.findOne({
      _id: category,
      user: req.user._id,
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Selected category does not exist or does not belong to your account',
      });
    }

    // Step 3: Handle optional receipt image upload via Cloudinary
    let receiptUrl = null;
    let receiptPublicId = null;

    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file);
        receiptUrl = uploadResult.secure_url;
        receiptPublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error('[Cloudinary Upload Error]:', uploadError.message);
        return res.status(500).json({
          success: false,
          message: `Failed to upload receipt image to Cloudinary: ${uploadError.message}. Make sure your Cloudinary credentials in .env are valid.`,
        });
      }
    }

    // Step 4: Create the expense in MongoDB with timezone-safe UTC date
    const expenseDate = parseDateSafe(date);

    const newExpense = await Expense.create({
      user: req.user._id,
      category,
      amount: numericAmount,
      date: expenseDate,
      note: note ? note.trim() : '',
      receiptUrl,
      receiptPublicId,
    });

    // Populate the category field so the response includes the category name
    const populatedExpense = await Expense.findById(newExpense._id).populate('category', 'name');

    // Step 5: Check if this new expense causes the monthly budget limit to be exceeded
    const budgetStatus = await checkMonthlyBudgetStatus(req.user._id, expenseDate);

    // Step 6: If monthly budget is exceeded, send email notification via Nodemailer
    if (budgetStatus.isExceeded) {
      try {
        const user = await User.findById(req.user._id);
        console.log(`[Budget Alert Email] Triggering email alert to: ${user?.email}`);
        if (user && user.email) {
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          const monthName = monthNames[budgetStatus.month - 1] || `Month ${budgetStatus.month}`;
          const emailSubject = `Budget Alert: Monthly Budget Exceeded for ${monthName}`;
          const emailText = `Hello ${user.name},\n\nYou have exceeded your budget of ₹${budgetStatus.budgetLimit} for ${monthName}. Total spent: ₹${budgetStatus.totalSpent}.\n\nPlease review your expenses in ExpenseWise.\n\nBest regards,\nExpenseWise Team`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px;">
              <h2 style="color: #ef4444; margin-top: 0;">Budget Alert: Limit Exceeded</h2>
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>You have exceeded your monthly budget of <strong>₹${budgetStatus.budgetLimit.toLocaleString('en-IN')}</strong> for <strong>${monthName}</strong>.</p>
              <p style="color: #b91c1c; font-weight: bold; font-size: 16px;">Total spent: ₹${budgetStatus.totalSpent.toLocaleString('en-IN')}</p>
              <p>Please log in to your ExpenseWise account to review and manage your expenses.</p>
              <br />
              <p style="color: #64748b; font-size: 13px;">ExpenseWise – Personal Budget Tracker with Analytics</p>
            </div>
          `;

          const emailResult = await sendEmail({
            to: user.email,
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
          });
          console.log(`[Budget Alert Email] sendEmail result:`, emailResult);
        } else {
          console.error('[Budget Alert Email] User email not found for ID:', req.user._id);
        }
      } catch (emailErr) {
        console.error('[Budget Email Alert Error]:', emailErr.message, emailErr.stack);
      }
    }

    // Step 7: Return the created expense along with the budget check status
    res.status(201).json({
      success: true,
      message: 'Expense added successfully',
      data: populatedExpense,
      budgetAlert: budgetStatus,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all expenses for the logged-in user (with optional filters)
 * @route   GET /api/expenses
 * @access  Private (Protected by JWT)
 */
const getExpenses = async (req, res, next) => {
  try {
    // Build query object starting with logged-in user ownership
    const query = { user: req.user._id };

    // Optional Filter: By Category ID
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Optional Filter: Date Range (startDate and endDate)
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) {
        const sParts = req.query.startDate.split('-');
        if (sParts.length === 3) {
          query.date.$gte = new Date(Date.UTC(Number(sParts[0]), Number(sParts[1]) - 1, Number(sParts[2]), 0, 0, 0, 0));
        } else {
          const start = new Date(req.query.startDate);
          start.setHours(0, 0, 0, 0);
          query.date.$gte = start;
        }
      }
      if (req.query.endDate) {
        const eParts = req.query.endDate.split('-');
        if (eParts.length === 3) {
          query.date.$lte = new Date(Date.UTC(Number(eParts[0]), Number(eParts[1]) - 1, Number(eParts[2]), 23, 59, 59, 999));
        } else {
          const end = new Date(req.query.endDate);
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      }
    } else if (req.query.month && req.query.year) {
      const month = Number(req.query.month);
      const year = Number(req.query.year);
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      query.date = {
        $gte: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
        $lte: new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999)),
      };
    }

    // Optional Filter: Search by Note or Category Name (case-insensitive)
    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');

      // Find any categories belonging to this user whose name matches the search keyword
      const matchedCategories = await Category.find({
        user: req.user._id,
        name: searchRegex,
      });
      const matchedCategoryIds = matchedCategories.map((c) => c._id);

      // Match either the expense note OR the matched category IDs
      query.$or = [
        { note: searchRegex },
        { category: { $in: matchedCategoryIds } },
      ];
    }

    // Count total matching records for pagination
    const totalCount = await Expense.countDocuments(query);

    // Calculate total sum of all matching expenses (unpaginated total)
    const allMatchingExpenses = await Expense.find(query);
    const totalAmount = allMatchingExpenses.reduce((sum, item) => sum + item.amount, 0);

    // Pagination Parameters:
    // If page or limit is provided, paginate; default page=1, limit=10
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || (hasPagination ? 10 : 0);
    const totalPages = limit > 0 ? Math.ceil(totalCount / limit) : 1;

    let queryExec = Expense.find(query)
      .populate('category', 'name')
      .sort({ date: -1 });

    if (limit > 0) {
      const skip = (page - 1) * limit;
      queryExec = queryExec.skip(skip).limit(limit);
    }

    // Fetch expenses from database
    const expenses = await queryExec;

    res.status(200).json({
      success: true,
      count: expenses.length,
      totalCount,
      totalPages,
      currentPage: page,
      totalAmount: Number(totalAmount.toFixed(2)),
      data: expenses,
      expenses, // Backwards compatible with any caller expecting expenses array directly
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single expense by ID
 * @route   GET /api/expenses/:id
 * @access  Private (Protected by JWT)
 */
const getExpenseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find expense by ID and populate category name
    const expense = await Expense.findById(id).populate('category', 'name');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    // Ownership Check: Ensure expense belongs to the logged-in user
    if (expense.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this expense',
      });
    }

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing expense (optionally update receipt image)
 * @route   PUT /api/expenses/:id
 * @access  Private (Protected by JWT)
 */
const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, category, date, note } = req.body;

    // Step 1: Find the existing expense
    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    // Step 2: Ownership Check
    if (expense.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this expense',
      });
    }

    // Step 3: If category is being updated, verify it belongs to user
    if (category) {
      const categoryExists = await Category.findOne({
        _id: category,
        user: req.user._id,
      });

      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: 'Selected category does not exist or does not belong to your account',
        });
      }
      expense.category = category;
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
      expense.amount = numericAmount;
    }

    // Step 5: Update date if provided
    if (date) {
      expense.date = new Date(date);
    }

    // Step 6: Update note if provided
    if (note !== undefined) {
      expense.note = note.trim();
    }

    // Step 7: If a new receipt image file is uploaded, replace the old one
    if (req.file) {
      try {
        // If an old receipt existed on Cloudinary, delete it
        if (expense.receiptPublicId) {
          await cloudinary.uploader.destroy(expense.receiptPublicId);
        }

        // Upload new receipt image to Cloudinary
        const uploadResult = await uploadToCloudinary(req.file);
        expense.receiptUrl = uploadResult.secure_url;
        expense.receiptPublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error('[Cloudinary Update Error]:', uploadError.message);
        return res.status(500).json({
          success: false,
          message: `Failed to update receipt on Cloudinary: ${uploadError.message}`,
        });
      }
    }

    // Step 8: Save updated expense in MongoDB
    await expense.save();

    // Populate category details
    const updatedExpense = await Expense.findById(id).populate('category', 'name');

    // Step 9: Re-check monthly budget status
    const budgetStatus = await checkMonthlyBudgetStatus(req.user._id, expense.date);

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: updatedExpense,
      budgetAlert: budgetStatus,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an expense (and remove associated receipt from Cloudinary)
 * @route   DELETE /api/expenses/:id
 * @access  Private (Protected by JWT)
 */
const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Step 1: Find the expense
    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    // Step 2: Ownership Check
    if (expense.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this expense',
      });
    }

    // Step 3: If a receipt image exists on Cloudinary, delete it
    if (expense.receiptPublicId) {
      try {
        await cloudinary.uploader.destroy(expense.receiptPublicId);
      } catch (cloudinaryError) {
        console.error('[Cloudinary Deletion Error]:', cloudinaryError.message);
        // Continue deleting expense even if Cloudinary image was already deleted
      }
    }

    // Step 4: Delete the expense document from MongoDB
    await Expense.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export all expenses to CSV format for download
 * @route   GET /api/expenses/export/csv
 * @access  Private (Protected by JWT)
 */
const exportExpensesCSV = async (req, res, next) => {
  try {
    // Fetch all user expenses sorted newest first
    const expenses = await Expense.find({ user: req.user._id })
      .populate('category', 'name')
      .sort({ date: -1 });

    // Format expenses into spreadsheet friendly rows
    const formattedData = expenses.map((item) => ({
      Date: new Date(item.date).toLocaleDateString('en-GB'),
      Category: item.category?.name || 'General',
      Amount: item.amount,
      Note: item.note || '',
      Receipt: item.receiptUrl || 'None',
    }));

    // Generate CSV string using json2csv Parser
    const fields = ['Date', 'Category', 'Amount', 'Note', 'Receipt'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(formattedData);

    // Set download headers for CSV file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ExpenseWise_Expenses_Report.csv');

    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export expenses to a styled PDF report, upload to Cloudinary as raw file, and return Cloudinary URL
 * @route   GET /api/expenses/export/pdf
 * @access  Private (Protected by JWT)
 */
const exportExpensesPDF = async (req, res, next) => {
  try {
    // Step 1: Fetch all user expenses & user profile
    const expenses = await Expense.find({ user: req.user._id })
      .populate('category', 'name')
      .sort({ date: -1 });

    const user = await User.findById(req.user._id);
    const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

    // Step 2: Create a new PDF document using PDFKit
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    // Collect data chunks as PDF builds
    doc.on('data', (chunk) => chunks.push(chunk));

    const pdfPromise = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // Step 3: Draw PDF Report Structure & Styling
    // Header Banner (Dark Blue matching ExpenseWise brand)
    doc.fillColor('#002b66').rect(0, 0, 595.28, 70).fill();
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('ExpenseWise', 40, 20);
    doc.fontSize(11).font('Helvetica').text('Personal Budget Tracker & Analytics – Expense Report', 40, 46);

    // User & Metadata Box
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('Generated For: ', 40, 88, { continued: true });
    doc.font('Helvetica').text(`${user ? user.name : 'Valued User'} (${user ? user.email : ''})`);

    doc.font('Helvetica-Bold').text('Date Generated: ', 40, 104, { continued: true });
    doc.font('Helvetica').text(`${new Date().toLocaleDateString('en-GB')}`);

    doc.font('Helvetica-Bold').text('Total Expenses: ', 40, 120, { continued: true });
    doc.font('Helvetica').text(`${expenses.length} transactions | Total: ₹${totalAmount.toLocaleString('en-IN')}`);

    // Table Header Bar
    const tableTop = 148;
    doc.fillColor('#f1f5f9').rect(40, tableTop, 515, 24).fill();
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold');
    doc.text('Date', 50, tableTop + 7);
    doc.text('Category', 140, tableTop + 7);
    doc.text('Note', 250, tableTop + 7);
    doc.text('Amount (₹)', 460, tableTop + 7, { width: 85, align: 'right' });

    // Table Rows
    let yPos = tableTop + 28;
    doc.font('Helvetica').fontSize(9);

    expenses.forEach((item, index) => {
      // If we are reaching the bottom of the page, add a new page
      if (yPos > 740) {
        doc.addPage({ margin: 40, size: 'A4' });
        yPos = 40;
      }

      // Alternating row background for clean readability
      if (index % 2 === 0) {
        doc.fillColor('#f8fafc').rect(40, yPos - 4, 515, 20).fill();
      }

      const formattedDate = new Date(item.date).toLocaleDateString('en-GB');
      const categoryName = item.category?.name || 'General';
      const noteText = item.note ? (item.note.length > 30 ? `${item.note.substring(0, 30)}...` : item.note) : '—';
      const amountText = `₹${item.amount.toLocaleString('en-IN')}`;

      doc.fillColor('#334155');
      doc.text(formattedDate, 50, yPos);
      doc.text(categoryName.substring(0, 18), 140, yPos);
      doc.text(noteText, 250, yPos);
      doc.font('Helvetica-Bold').text(amountText, 460, yPos, { width: 85, align: 'right' }).font('Helvetica');

      yPos += 22;
    });

    // Summary Grand Total Row
    yPos += 12;
    if (yPos > 740) {
      doc.addPage({ margin: 40, size: 'A4' });
      yPos = 40;
    }
    doc.fillColor('#002b66').rect(40, yPos, 515, 26).fill();
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
    doc.text('Grand Total Spending:', 50, yPos + 7);
    doc.text(`₹${totalAmount.toLocaleString('en-IN')}`, 460, yPos + 7, { width: 85, align: 'right' });

    // Footer
    doc.fontSize(8).fillColor('#94a3b8').text('Generated by ExpenseWise – Personal Budget Tracker with Analytics', 40, 800, { align: 'center' });

    // End PDF Stream
    doc.end();

    // Step 4: Wait for PDF buffer generation
    const pdfBuffer = await pdfPromise;

    // Step 5: Convert to Base64 Data URI and upload to Cloudinary as raw file
    const base64Pdf = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

    const uploadResult = await cloudinary.uploader.upload(base64Pdf, {
      folder: 'expensewise_reports',
      resource_type: 'raw',
      public_id: `expense_report_${req.user._id}_${Date.now()}.pdf`,
    });

    // Step 6: Return the Cloudinary secure URL for sharing via WhatsApp or direct download
    res.status(200).json({
      success: true,
      message: 'Expense report PDF generated and uploaded successfully',
      url: uploadResult.secure_url,
      totalAmount: Number(totalAmount.toFixed(2)),
      count: expenses.length,
    });
  } catch (error) {
    console.error('[Export PDF Error]:', error);
    next(error);
  }
};

// Export expense controller functions
module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  exportExpensesCSV,
  exportExpensesPDF,
};
