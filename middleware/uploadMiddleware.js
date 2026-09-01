// ==============================================================================
// File: middleware/uploadMiddleware.js
// Description: Configures Multer to handle multipart/form-data for receipt image uploads.
//              Uses memory storage so files are processed directly as memory buffers.
// ==============================================================================

// Import Multer library for file uploading
const multer = require('multer');

/**
 * Storage Strategy:
 * MemoryStorage keeps the uploaded file in memory as a Buffer (req.file.buffer).
 * This avoids writing temporary files to the local hard disk before sending to Cloudinary.
 */
const storage = multer.memoryStorage();

/**
 * File Filter:
 * Ensures users only upload valid image files (JPEG, JPG, PNG, WEBP).
 */
const fileFilter = (req, file, cb) => {
  // Check the mime type of the incoming file
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    // Accept file: cb(null, true)
    cb(null, true);
  } else {
    // Reject file with a friendly error message
    cb(new Error('Invalid file type! Only JPG, JPEG, PNG, and WEBP image files are allowed.'), false);
  }
};

/**
 * Multer Upload Instance:
 * Set memory storage, file filter, and 5MB size limit.
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes maximum file size limit
  },
});

// Export configured upload middleware
module.exports = upload;
