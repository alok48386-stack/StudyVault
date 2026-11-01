const express = require('express');
const session = require('express-session');
const path = require('path');
const config = require('./config');
const { formatBytes, formatDate } = require('./utils/helpers');

// Initialize database schema check
require('./database/db');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration (for admin panel authentication)
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Expose configuration and formatting helpers to all templates
app.use((req, res, next) => {
  res.locals.siteName = config.siteName;
  res.locals.siteDescription = config.siteDescription;
  res.locals.contactEmail = config.contactEmail;
  res.locals.dmcaEmail = config.dmcaEmail;
  res.locals.adsterra = config.adsterra;
  res.locals.formatBytes = formatBytes;
  res.locals.formatDate = formatDate;
  res.locals.isAdmin = !!(req.session && req.session.isAdmin);
  next();
});

// Serve static assets from /public
app.use(express.static(path.join(__dirname, 'public')));

// Serve preview graphics and files from /storage
app.use('/storage', express.static(config.storage.baseDir));

// Routes
const publicRoutes = require('./routes/public');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 - Page Not Found | ' + config.siteName,
    message: `The requested URL "${req.originalUrl}" was not found on this server.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).render('404', {
    title: '500 - Server Error | ' + config.siteName,
    message: 'An unexpected internal error occurred. Please try again shortly.'
  });
});

// Start Express Server
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`===================================================`);
    console.log(` StudyVault - Student Notes Sharing Platform`);
    console.log(` Running on: http://localhost:${config.port}`);
    console.log(` Admin Panel: http://localhost:${config.port}/admin`);
    console.log(`===================================================`);
  });
}

module.exports = app;
