const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect routes and authenticate requests via JWT
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      // Extract token from "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if admin user
      if (decoded.role === 'admin') {
        req.user = {
          role: 'admin',
          email: decoded.email,
        };
        return next();
      }

      // Find regular user in database
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({
          message: 'Not authorized, user not found.',
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('JWT verification error:', error.message);
      return res.status(401).json({
        message: 'Not authorized, token invalid or expired.',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      message: 'Not authorized, no token provided.',
    });
  }
};

/**
 * Middleware factory to authorize specific roles
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'donor', 'rescuer')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role '${req.user ? req.user.role : 'unauthenticated'}' is not authorized to access this resource.`,
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorizeRoles,
};
