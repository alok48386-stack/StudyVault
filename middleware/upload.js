const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');

// Ensure destination directories exist
if (!fs.existsSync(config.storage.notesDir)) {
  fs.mkdirSync(config.storage.notesDir, { recursive: true });
}
if (!fs.existsSync(config.storage.previewsDir)) {
  fs.mkdirSync(config.storage.previewsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'note_file') {
      cb(null, config.storage.notesDir);
    } else if (file.fieldname === 'preview_image') {
      cb(null, config.storage.previewsDir);
    } else {
      cb(new Error(`Unexpected field: ${file.fieldname}`));
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40);
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    cb(null, `${base ? base + '-' : ''}${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (file.fieldname === 'note_file') {
    if (config.allowedNoteExtensions.includes(ext)) {
      return cb(null, true);
    }
    return cb(new Error(`Invalid note file type. Allowed: ${config.allowedNoteExtensions.join(', ')}`), false);
  }
  
  if (file.fieldname === 'preview_image') {
    if (config.allowedImageExtensions.includes(ext)) {
      return cb(null, true);
    }
    return cb(new Error(`Invalid image type. Allowed: ${config.allowedImageExtensions.join(', ')}`), false);
  }
  
  cb(new Error(`Unexpected upload field: ${file.fieldname}`), false);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.maxFileSizeMB * 1024 * 1024 // 25 MB max by default
  }
});

// Export configured upload fields
module.exports = upload.fields([
  { name: 'note_file', maxCount: 1 },
  { name: 'preview_image', maxCount: 1 }
]);
