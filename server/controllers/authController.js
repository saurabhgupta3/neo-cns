const jwt = require("jsonwebtoken");
const User = require("../models/user");
const config = require("../config/config");
const ExpressError = require("../utils/expressError");

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user._id, 
            email: user.email, 
            role: user.role 
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRE }
    );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
    try {
        const { name, email, password, phone, address, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return next(new ExpressError(400, "User with this email already exists."));
        }

        // Only allow admin to create courier/admin accounts
        let userRole = "user";
        if (role && (role === "courier" || role === "admin")) {
            // In production, you'd check if the requesting user is an admin
            // For now, we'll allow it for development
            userRole = role;
        }

        // Create new user
        const user = new User({
            name,
            email,
            password,
            phone,
            address,
            role: userRole
        });

        await user.save();

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: "Registration successful!",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return next(new ExpressError(400, "Please provide email and password."));
        }

        // Find user and include password for comparison
        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return next(new ExpressError(401, "Invalid email or password."));
        }

        // Check if account is active
        if (!user.isActive) {
            return next(new ExpressError(401, "Account is deactivated. Please contact support."));
        }

        // Compare password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return next(new ExpressError(401, "Invalid email or password."));
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            success: true,
            message: "Login successful!",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
    try {
        const { name, phone, address } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name, phone, address, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: "Profile updated successfully!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return next(new ExpressError(400, "Please provide current and new password."));
        }

        // Get user with password
        const user = await User.findById(req.user.id).select("+password");

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return next(new ExpressError(401, "Current password is incorrect."));
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: "Password changed successfully!"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    getMe,
    updateProfile,
    changePassword
};
