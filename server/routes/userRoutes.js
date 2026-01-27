const express = require("express");
const router = express.Router();
const User = require("../models/user");
const wrapAsync = require("../utils/wrapAsync");
const { authenticate, authorize } = require("../middleware/auth");
const ExpressError = require("../utils/expressError");

// All routes here require admin access
router.use(authenticate, authorize("admin"));

// GET /api/users - Get all users (excludes soft-deleted)
router.get("/", wrapAsync(async (req, res) => {
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
}));

// GET /api/users/couriers - Get all available couriers (excludes soft-deleted)
router.get("/couriers", wrapAsync(async (req, res) => {
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
}));

// GET /api/users/:id - Get single user
router.get("/:id", wrapAsync(async (req, res) => {
    const user = await User.findById(req.params.id);
    
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({ success: true, user });
}));

// PUT /api/users/:id - Update user (Admin)
router.put("/:id", wrapAsync(async (req, res) => {
    const { name, phone, address, role, isActive, isAvailable } = req.body;
    
    const user = await User.findByIdAndUpdate(
        req.params.id,
        { name, phone, address, role, isActive, isAvailable, updatedAt: Date.now() },
        { new: true, runValidators: true }
    );
    
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({
        success: true,
        message: "User updated successfully!",
        user
    });
}));

// PUT /api/users/:id/role - Change user role
router.put("/:id/role", wrapAsync(async (req, res) => {
    const { role } = req.body;
    
    if (!["user", "courier", "admin"].includes(role)) {
        return res.status(400).json({ success: false, message: "Invalid role" });
    }
    
    const user = await User.findByIdAndUpdate(
        req.params.id,
        { role, updatedAt: Date.now() },
        { new: true }
    );
    
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({
        success: true,
        message: `User role changed to ${role}`,
        user
    });
}));

// PUT /api/users/:id/toggle-active - Toggle user active status
router.put("/:id/toggle-active", wrapAsync(async (req, res) => {
    const user = await User.findById(req.params.id);
    
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    res.json({
        success: true,
        message: user.isActive ? "User activated" : "User deactivated",
        user
    });
}));

// DELETE /api/users/:id - Soft delete user with industry-standard rules
router.delete("/:id", wrapAsync(async (req, res) => {
    const Order = require("../models/order");
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    
    // Prevent self-deletion
    if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ 
            success: false, 
            message: "You cannot delete your own account" 
        });
    }
    
    // ADMIN: Block deletion if last admin
    if (user.role === "admin") {
        const adminCount = await User.countDocuments({ 
            role: "admin", 
            isActive: true,
            deletedAt: null 
        });
        
        if (adminCount <= 1) {
            return res.status(400).json({ 
                success: false, 
                message: "Cannot delete the last admin. Promote another user to admin first." 
            });
        }
    }
    
    // USER: Check for active orders (not delivered/cancelled)
    if (user.role === "user") {
        const activeOrders = await Order.countDocuments({
            user: user._id,
            status: { $nin: ["Delivered", "Cancelled"] }
        });
        
        if (activeOrders > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot delete user. They have ${activeOrders} active order(s). Wait until orders are delivered or cancel them first.` 
            });
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
}));

// GET /api/users/stats/summary - Get user statistics
router.get("/stats/summary", wrapAsync(async (req, res) => {
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
}));

// PUT /api/users/:id/restore - Restore a soft-deleted user
router.put("/:id/restore", wrapAsync(async (req, res) => {
    const user = await User.findById(req.params.id);
    
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    
    if (!user.deletedAt) {
        return res.status(400).json({ success: false, message: "User is not deleted" });
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
}));

module.exports = router;
