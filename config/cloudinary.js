// ==============================================================================
// File: config/cloudinary.js
// Description: Configures the Cloudinary SDK using credentials from the .env file.
//              Cloudinary allows us to upload and host receipt images in the cloud.
// ==============================================================================

// Import the Cloudinary v2 SDK
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Your Cloudinary cloud name
  api_key: process.env.CLOUDINARY_API_KEY,       // Your Cloudinary API key
  api_secret: process.env.CLOUDINARY_API_SECRET, // Your Cloudinary API secret
  secure: true,                                  // Always use HTTPS for secure image URLs
});

// Export configured cloudinary instance so controllers can perform uploads/deletions
module.exports = cloudinary;
