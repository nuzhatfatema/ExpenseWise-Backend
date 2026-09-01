// ==============================================================================
// File: controllers/authController.js
// Description: Controller handling user registration, login, and profile fetching.
//              Uses bcryptjs for password hashing and jsonwebtoken for JWT generation.
// ==============================================================================

// Import bcryptjs to hash and compare passwords securely
const bcrypt = require('bcryptjs');

// Import jsonwebtoken to generate signed authentication tokens
const jwt = require('jsonwebtoken');

// Import User Mongoose Model
const User = require('../models/User');

// Import Node.js built-in crypto module for generating secure random tokens & SHA-256 hashes
const crypto = require('crypto');

// Import Nodemailer helper for emailing password reset links
const { sendEmail } = require('../config/nodemailer');

/**
 * Helper Function: generateToken
 * Creates a signed JWT token containing the user's MongoDB ID.
 * @param {string} id - The MongoDB _id of the user
 * @returns {string} - Signed JWT token valid for 30 days
 */
const generateToken = (id) => {
  return jwt.sign(
    { id: id },
    process.env.JWT_SECRET || 'mySuperSecretExpenseWiseKey_2026_jwt',
    { expiresIn: '30d' } // Token expires after 30 days
  );
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public (no token required)
 */
const registerUser = async (req, res, next) => {
  try {
    // Step 1: Destructure user input from the request body
    const { name, email, password } = req.body;

    // Step 2: Validate required fields (Simple beginner-friendly validation)
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, and password',
      });
    }

    // Step 3: Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Step 4: Check if a user with this email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists',
      });
    }

    // Step 5: Hash the password with bcryptjs
    // Generate salt with 10 rounds of hashing complexity
    const salt = await bcrypt.genSalt(10);
    // Hash plain text password using generated salt
    const hashedPassword = await bcrypt.hash(password, salt);

    // Step 6: Create the new user in MongoDB
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    // Step 7: Respond with created user details and signed JWT token
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    // Pass unexpected errors to our global error handling middleware
    next(error);
  }
};

/**
 * @desc    Authenticate user & login
 * @route   POST /api/auth/login
 * @access  Public (no token required)
 */
const loginUser = async (req, res, next) => {
  try {
    // Step 1: Destructure email and password from request body
    const { email, password } = req.body;

    // Step 2: Validate required input fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    // Step 3: Find user by email in the database
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Step 4: If user doesn't exist, return 401 Invalid credentials
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Step 5: Check if the provided password matches the hashed password in database
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Step 6: Passwords match! Return user profile and signed JWT token
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently logged-in user profile
 * @route   GET /api/auth/profile
 * @access  Private (Requires valid JWT token)
 */
const getUserProfile = async (req, res, next) => {
  try {
    // req.user was populated by the authMiddleware (protect)
    res.status(200).json({
      success: true,
      data: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send password reset link to user's email
 * @route   POST /api/auth/forgot-password
 * @access  Public (no token required)
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Step 1: Validate email input
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered email address',
      });
    }

    // Step 2: Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account with that email address exists',
      });
    }

    // Step 3: Generate a secure random reset token (32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Step 4: Hash the reset token using SHA-256 before saving to database
    // (Never store plain tokens in the database to prevent database-leak exploits!)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token on user and set expiration to 10 minutes from now
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Step 5: Construct the password reset link
    // Read CLIENT_URL from environment variables (defaults to active production Vercel frontend URL)
    const clientUrl = (process.env.CLIENT_URL || 'https://expensewise-frontend.vercel.app').replace(/\/+$/, '');
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    // Step 6: Compose and send email via Nodemailer
    const emailSubject = 'Password Reset Request - ExpenseWise';
    const emailText = `Hello ${user.name},\n\nYou requested a password reset for your ExpenseWise account. Please click the following link to reset your password:\n\n${resetUrl}\n\nThis link will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nExpenseWise Team`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #2563eb; margin-top: 0;">Password Reset Request</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>You requested a password reset for your <strong>ExpenseWise</strong> account.</p>
        <p>Click the button below to choose a new password. This reset link is valid for <strong>10 minutes</strong>.</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">If the button doesn't work, copy and paste this URL into your browser:<br/><a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
      </div>
    `;

    // Send the email
    await sendEmail({
      to: user.email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset link has been sent to your email address.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password using valid reset token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public (no token required)
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Step 1: Validate new password input
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new password of at least 6 characters',
      });
    }

    // Step 2: Hash the incoming raw token from URL to match the hashed token in database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Step 3: Find user matching the hashed token where token hasn't expired yet
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token. Please request a new link.',
      });
    }

    // Step 4: Hash the new password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Step 5: Clear the reset token fields so the token cannot be reused
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // Save updated user in MongoDB
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// Export controller functions
module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
};
