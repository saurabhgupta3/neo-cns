const express = require("express");
const router = express.Router();
const User = require("../models/user");
const wrapAsync = require("../utils/wrapAsync");
const { authenticate, authorize } = require("../middleware/auth");
const ExpressError = require("../utils/expressError");

// All routes here require admin access
router.use(authenticate, authorize("admin"));

// GET /api/users - Get all users
router.get("/", wrapAsync(async (req, res) => {
    const { role, search } = req.query;
    
    let query = {};
    
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

// GET /api/users/couriers - Get all available couriers
router.get("/couriers", wrapAsync(async (req, res) => {
    const couriers = await User.find({ 
        role: "courier", 
        isActive: true,
        isAvailable: true 
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

// DELETE /api/users/:id - Delete user
router.delete("/:id", wrapAsync(async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({
        success: true,
        message: "User deleted successfully!"
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

module.exports = router;
