require('dotenv').config();
const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  adminPassword: process.env.ADMIN_PASSWORD,
sessionSecret: process.env.SESSION_SECRET,
  siteName: process.env.SITE_NAME || 'StudyVault',
  siteDescription: 'Free, fast, and high-quality study notes for school and college students.',
  contactEmail: process.env.CONTACT_EMAIL || 'support@studyvault.local',
  dmcaEmail: process.env.DMCA_EMAIL || 'dmca@studyvault.local',
  
  // Storage & Limits
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
  maxImageSizeMB: 2,
  allowedNoteExtensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip'],
  allowedImageExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  
  storage: {
    baseDir: path.join(__dirname, 'storage'),
    notesDir: path.join(__dirname, 'storage', 'notes'),
    previewsDir: path.join(__dirname, 'storage', 'previews')
  },
  
  dbPath: path.join(__dirname, 'database', 'database.sqlite'),

  // Pagination & Display Counts
  pagination: {
    latestCount: 8,
    popularCount: 8,
    perPage: 12,
    suggestedCount: 6,
    relatedCount: 4,
    searchLimit: 5
  },

  // Adsterra Popunder Monetization
  adsterra: {
    enabled: process.env.ADSTERRA_ENABLED !== 'false',
    // Example script URL or embed code configured for easy admin updates
    scriptTag: process.env.ADSTERRA_SCRIPT || '<!-- Adsterra Popunder Script Placeholder (Active in production) -->'
  }
};
