const User = require("../models/user");
const Order = require("../models/order");
const ExpressError = require("../utils/expressError");

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
const getAllUsers = async (req, res, next) => {
    try {
        const { role, search, includeDeleted } = req.query;
        
        let query = {};
        
        // Exclude soft-deleted users unless explicitly requested
        if (!includeDeleted) {
            query.deletedAt = null;
        }
        
        if (role) {
            query.role = role;
        }
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }
        
        const users = await User.find(query).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all available couriers
// @route   GET /api/users/couriers
// @access  Private (Admin only)
const getAvailableCouriers = async (req, res, next) => {
    try {
        const couriers = await User.find({ 
            role: "courier", 
            isActive: true,
            isAvailable: true,
            deletedAt: null
        });
        
        res.json({
            success: true,
            count: couriers.length,
            couriers
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin only)
const getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return next(new ExpressError(404, "User not found"));
        }
        
        res.json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin only)
const updateUser = async (req, res, next) => {
    try {
        const { name, phone, address, role, isActive, isAvailable } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { name, phone, address, role, isActive, isAvailable, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );
        
        if (!user) {
            return next(new ExpressError(404, "User not found"));
        }
        
        res.json({
            success: true,
            message: "User updated successfully!",
            user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Change user role
// @route   PUT /api/users/:id/role
// @access  Private (Admin only)
const changeUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        
        if (!["user", "courier", "admin"].includes(role)) {
            return next(new ExpressError(400, "Invalid role"));
        }
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role, updatedAt: Date.now() },
            { new: true }
        );
        
        if (!user) {
            return next(new ExpressError(404, "User not found"));
        }
        
        res.json({
            success: true,
            message: `User role changed to ${role}`,
            user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle user active status
// @route   PUT /api/users/:id/toggle-active
// @access  Private (Admin only)
const toggleUserActive = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return next(new ExpressError(404, "User not found"));
        }
        
        user.isActive = !user.isActive;
        await user.save();
        
        res.json({
            success: true,
            message: user.isActive ? "User activated" : "User deactivated",
            user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Soft delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return next(new ExpressError(404, "User not found"));
        }
        
        // Prevent self-deletion
        if (user._id.toString() === req.user._id.toString()) {
            return next(new ExpressError(400, "You cannot delete your own account"));
        }
        
        // ADMIN: Block deletion if last admin
        if (user.role === "admin") {
            const adminCount = await User.countDocuments({ 
                role: "admin", 
                isActive: true,
                deletedAt: null 
            });
            
            if (adminCount <= 1) {
                return next(new ExpressError(400, "Cannot delete the last admin. Promote another user to admin first."));
            }
        }
        
        // USER: Check for active orders (not delivered/cancelled)
        if (user.role === "user") {
            const activeOrders = await Order.countDocuments({
                user: user._id,
                status: { $nin: ["Delivered", "Cancelled"] }
            });
            
            if (activeOrders > 0) {
                return next(new ExpressError(400, 
                    `Cannot delete user. They have ${activeOrders} active order(s). Wait until orders are delivered or cancel them first.`
                ));
            }
        }
        
        // COURIER: Unassign all active orders before deletion
        if (user.role === "courier") {
            const unassignResult = await Order.updateMany(
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
                            note: "Courier removed - account deleted",
                            updatedBy: req.user._id
                        }
                    }
                }
            );
            
            // Log how many orders were unassigned
            console.log(`Unassigned ${unassignResult.modifiedCount} orders from courier ${user.name}`);
        }
        
        // Perform soft delete
        user.isActive = false;
        user.deletedAt = new Date();
        await user.save();
        
        res.json({
            success: true,
            message: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} "${user.name}" has been deleted successfully.`,
            deletedUser: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user statistics
// @route   GET /api/users/stats/summary
// @access  Private (Admin only)
const getUserStats = async (req, res, next) => {
    try {
        const stats = await User.aggregate([
            {
                $group: {
                    _id: "$role",
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        
        res.json({
            success: true,
            stats: {
                total: totalUsers,
                active: activeUsers,
                byRole: stats
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Restore soft-deleted user
// @route   PUT /api/users/:id/restore
// @access  Private (Admin only)
const restoreUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return next(new ExpressError(404, "User not found"));
        }
        
        if (!user.deletedAt) {
            return next(new ExpressError(400, "User is not deleted"));
        }
        
        // Restore the user
        user.isActive = true;
        user.deletedAt = null;
        await user.save();
        
        res.json({
            success: true,
            message: `User "${user.name}" has been restored successfully.`,
            user
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllUsers,
    getAvailableCouriers,
    getUserById,
    updateUser,
    changeUserRole,
    toggleUserActive,
    deleteUser,
    getUserStats,
    restoreUser
};
