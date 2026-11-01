// Middleware to protect admin routes
module.exports = function adminAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    res.locals.isAdmin = true;
    return next();
  }
  
  // Store the attempted URL so we can redirect back after login
  if (req.originalUrl !== '/admin/login' && req.originalUrl !== '/admin/logout') {
    req.session.returnTo = req.originalUrl;
  }
  
  return res.redirect('/admin/login');
};
