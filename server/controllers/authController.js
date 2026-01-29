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

// @desc    Delete own account (self-delete request)
// @route   DELETE /api/auth/delete-account
// @access  Private
const deleteAccount = async (req, res, next) => {
    try {
        const { password } = req.body;
        const Order = require("../models/order");

        // Require password confirmation for security
        if (!password) {
            return next(new ExpressError(400, "Please provide your password to confirm account deletion."));
        }

        // Get user with password
        const user = await User.findById(req.user.id).select("+password");

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return next(new ExpressError(401, "Password is incorrect. Account deletion cancelled."));
        }

        // Check for active orders
        const activeOrders = await Order.countDocuments({
            user: user._id,
            status: { $nin: ["Delivered", "Cancelled"] }
        });

        if (activeOrders > 0) {
            return next(new ExpressError(400, 
                `Cannot delete account. You have ${activeOrders} active order(s). Please wait until all orders are delivered or cancel them first.`
            ));
        }

        // For couriers, unassign their active orders
        if (user.role === "courier") {
            await Order.updateMany(
                { 
                    courier: user._id,
                    status: { $nin: ["Delivered", "Cancelled"] }
                },
                { 
                    $set: { courier: null },
                    $push: {
                        statusHistory: {
                            status: "Pending",
                            timestamp: new Date(),
                            note: "Courier account deleted",
                            updatedBy: user._id
                        }
                    }
                }
            );
        }

        // Prevent admin self-deletion if last admin
        if (user.role === "admin") {
            const adminCount = await User.countDocuments({ 
                role: "admin", 
                isActive: true,
                deletedAt: null 
            });

            if (adminCount <= 1) {
                return next(new ExpressError(400, 
                    "Cannot delete account. You are the last admin. Promote another user to admin first."
                ));
            }
        }

        // Perform soft delete
        user.isActive = false;
        user.deletedAt = new Date();
        await user.save();

        res.json({
            success: true,
            message: "Your account has been deleted successfully. We're sorry to see you go!"
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Forgot password - send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const crypto = require("crypto");
        const { sendPasswordResetEmail } = require("../utils/emailService");

        console.log("📧 Forgot password request for:", email);

        if (!email) {
            return next(new ExpressError(400, "Please provide your email address."));
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        console.log("👤 User found:", user ? user.email : "No user found");

        // Always return success to prevent email enumeration attacks
        if (!user) {
            console.log("⚠️ No user found with this email");
            return res.json({
                success: true,
                message: "If an account with that email exists, a password reset link has been sent."
            });
        }

        // Check if account is deleted
        if (user.deletedAt) {
            console.log("⚠️ User account is deleted");
            return res.json({
                success: true,
                message: "If an account with that email exists, a password reset link has been sent."
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        console.log("🔑 Token generated");
        
        // Hash the token for storage (don't store plain token in DB)
        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        // Set token and expiry (1 hour)
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
        await user.save({ validateBeforeSave: false });
        console.log("💾 Token saved to database");

        // Send email with the plain token (user receives this)
        try {
            console.log("📤 Sending email to:", user.email);
            await sendPasswordResetEmail(user.email, resetToken, user.name);
            console.log("✅ Email sent successfully");
        } catch (emailError) {
            console.error("❌ Email sending failed:", emailError.message);
            // If email fails, clear the reset token
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save({ validateBeforeSave: false });
            
            return next(new ExpressError(500, "Error sending email. Please try again later."));
        }

        res.json({
            success: true,
            message: "If an account with that email exists, a password reset link has been sent."
        });
    } catch (error) {
        console.error("❌ Forgot password error:", error);
        next(error);
    }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        const crypto = require("crypto");

        if (!password) {
            return next(new ExpressError(400, "Please provide a new password."));
        }

        if (password.length < 6) {
            return next(new ExpressError(400, "Password must be at least 6 characters."));
        }

        // Hash the token to compare with stored hash
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Find user with valid token
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        }).select("+resetPasswordToken +resetPasswordExpires");

        if (!user) {
            return next(new ExpressError(400, "Invalid or expired reset token. Please request a new one."));
        }

        // Update password and clear reset token
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({
            success: true,
            message: "Password has been reset successfully! You can now login with your new password."
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
    changePassword,
    deleteAccount,
    forgotPassword,
    resetPassword
};
