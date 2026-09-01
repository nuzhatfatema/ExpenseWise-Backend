// ==============================================================================
// File: config/nodemailer.js
// Description: Nodemailer transporter setup for sending email notifications
//              (e.g., Budget limit breach alerts, Password reset links).
// ==============================================================================

// Step 1: Import Nodemailer library
const nodemailer = require('nodemailer');

/**
 * createTransporter:
 * Initializes an SMTP transport object using Gmail credentials from .env.
 */
const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  // If no credentials configured yet, create a test transporter or log notice
  if (!user || !pass || user.includes('your_email') || pass.includes('your_password')) {
    console.log('[Nodemailer Notice]: Gmail credentials not configured in .env (EMAIL_USER / EMAIL_PASS). Emails will be logged to console in development.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user || 'noreply.expensewise@gmail.com',
      pass: pass || 'sampleapppassword',
    },
  });
};

/**
 * sendEmail:
 * Reusable helper function to send an email.
 * @param {Object} options - { to, subject, text, html }
 * @returns {Promise<Object>}
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = createTransporter();

    // Define email message options
    const mailOptions = {
      from: `"ExpenseWise App" <${process.env.EMAIL_USER || 'noreply@expensewise.com'}>`,
      to,
      subject,
      text: text || '',
      html: html || `<p>${text}</p>`,
    };

    // If credentials are placeholder values in local development, avoid throwing unhandled rejection
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your_email')) {
      console.log('================ [MOCK EMAIL SENT] ================');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content:\n${text}`);
      console.log('===================================================');
      return { success: true, messageId: 'mock-email-id-dev' };
    }

    // Send the actual email through Gmail SMTP
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent]: Message ID ${info.messageId} to ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Nodemailer Error]: Failed to send email:', error.message);
    // Return failure object instead of crashing the server request
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
};
