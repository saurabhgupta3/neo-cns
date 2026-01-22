const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const ExpressError = require("../utils/expressError");

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(", ");
        return next(new ExpressError(400, errorMessages));
    }
    next();
};

// Validation rules
const registerValidation = [
    body("name")
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({ min: 2, max: 50 }).withMessage("Name must be 2-50 characters"),
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please provide a valid email"),
    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("phone")
        .optional()
        .matches(/^[0-9]{10}$/).withMessage("Phone must be a valid 10-digit number")
];

const loginValidation = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please provide a valid email"),
    body("password")
        .notEmpty().withMessage("Password is required")
];

// Routes
// POST /api/auth/register - Register a new user
router.post("/register", registerValidation, handleValidationErrors, authController.register);

// POST /api/auth/login - Login user
router.post("/login", loginValidation, handleValidationErrors, authController.login);

// GET /api/auth/me - Get current user (Protected)
router.get("/me", authenticate, authController.getMe);

// PUT /api/auth/profile - Update profile (Protected)
router.put("/profile", authenticate, authController.updateProfile);

// PUT /api/auth/change-password - Change password (Protected)
router.put("/change-password", authenticate, authController.changePassword);

module.exports = router;
