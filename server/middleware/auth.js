const jwt = require("jsonwebtoken");
const User = require("../models/user");
const config = require("../config/config");
const ExpressError = require("../utils/expressError");

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(new ExpressError(401, "Access denied. No token provided."));
        }

        const token = authHeader.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(token, config.JWT_SECRET);

        // Find user by id
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return next(new ExpressError(401, "User not found. Token is invalid."));
        }

        // Check if user is soft-deleted
        if (user.deletedAt) {
            return next(new ExpressError(401, "Account has been deleted. Please contact support."));
        }

        if (!user.isActive) {
            return next(new ExpressError(401, "Account is deactivated. Please contact support."));
        }

        // Attach user to request object
        req.user = user;
        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            return next(new ExpressError(401, "Invalid token."));
        }
        if (error.name === "TokenExpiredError") {
            return next(new ExpressError(401, "Token has expired. Please login again."));
        }
        next(error);
    }
};

// Middleware to authorize specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ExpressError(401, "Authentication required."));
        }

        if (!roles.includes(req.user.role)) {
            return next(new ExpressError(403, `Access denied. ${req.user.role} role is not authorized to access this resource.`));
        }

        next();
    };
};

// Optional authentication - doesn't fail if no token, just doesn't attach user
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next();
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, config.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (user && user.isActive) {
            req.user = user;
        }
        
        next();
    } catch (error) {
        // Silently continue without user if token is invalid
        next();
    }
};

module.exports = { authenticate, authorize, optionalAuth };
