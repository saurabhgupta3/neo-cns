const express = require("express");
const router = express.Router();
const CourierApplication = require("../models/courierApplication");
const User = require("../models/user");
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/expressError");
const { authenticate, authorize } = require("../middleware/auth");

// ========== USER ROUTES ==========

// POST /api/applications/courier - Submit courier application
router.post("/courier", authenticate, wrapAsync(async (req, res) => {
    const user = req.user;
    
    // Check if user is already a courier
    if (user.role === "courier") {
        throw new ExpressError(400, "You are already a courier.");
    }
    
    // Check for existing pending application
    const existingApplication = await CourierApplication.findOne({
        user: user._id,
        status: "pending"
    });
    
    if (existingApplication) {
        throw new ExpressError(400, "You already have a pending application. Please wait for review.");
    }
    
    // Check for recently rejected application (cooldown period: 7 days)
    const recentRejection = await CourierApplication.findOne({
        user: user._id,
        status: "rejected",
        reviewedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    
    if (recentRejection) {
        const daysLeft = Math.ceil(
            (7 * 24 * 60 * 60 * 1000 - (Date.now() - recentRejection.reviewedAt)) / (24 * 60 * 60 * 1000)
        );
        throw new ExpressError(400, 
            `Your previous application was rejected. You can reapply in ${daysLeft} day(s).`
        );
    }
    
    const { vehicleType, vehicleNumber, drivingLicense, experience, workHours, motivation } = req.body;
    
    const application = new CourierApplication({
        user: user._id,
        vehicleType,
        vehicleNumber,
        drivingLicense,
        experience,
        workHours,
        motivation
    });
    
    await application.save();
    
    res.status(201).json({
        success: true,
        message: "Your courier application has been submitted successfully! We'll review it shortly.",
        application
    });
}));

// GET /api/applications/my-applications - Get user's own applications
router.get("/my-applications", authenticate, wrapAsync(async (req, res) => {
    const applications = await CourierApplication.find({ user: req.user._id })
        .sort({ createdAt: -1 });
    
    res.json({
        success: true,
        count: applications.length,
        applications
    });
}));

// ========== ADMIN ROUTES ==========

// GET /api/applications - Get all applications (Admin only)
router.get("/", authenticate, authorize("admin"), wrapAsync(async (req, res) => {
    const { status } = req.query;
    
    let query = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
        query.status = status;
    }
    
    const applications = await CourierApplication.find(query)
        .populate("user", "name email phone address")
        .populate("reviewedBy", "name")
        .sort({ createdAt: -1 });
    
    res.json({
        success: true,
        count: applications.length,
        applications
    });
}));

// GET /api/applications/:id - Get single application (Admin only)
router.get("/:id", authenticate, authorize("admin"), wrapAsync(async (req, res) => {
    const application = await CourierApplication.findById(req.params.id)
        .populate("user", "name email phone address createdAt")
        .populate("reviewedBy", "name");
    
    if (!application) {
        throw new ExpressError(404, "Application not found");
    }
    
    res.json({
        success: true,
        application
    });
}));

// PUT /api/applications/:id/approve - Approve application (Admin only)
router.put("/:id/approve", authenticate, authorize("admin"), wrapAsync(async (req, res) => {
    const { adminNotes } = req.body;
    
    const application = await CourierApplication.findById(req.params.id)
        .populate("user", "name email");
    
    if (!application) {
        throw new ExpressError(404, "Application not found");
    }
    
    if (application.status !== "pending") {
        throw new ExpressError(400, `Application has already been ${application.status}.`);
    }
    
    // Update application status
    application.status = "approved";
    application.adminNotes = adminNotes;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    await application.save();
    
    // Update user role to courier
    await User.findByIdAndUpdate(application.user._id, { 
        role: "courier",
        isAvailable: true
    });
    
    res.json({
        success: true,
        message: `Application approved! ${application.user.name} is now a courier.`,
        application
    });
}));

// PUT /api/applications/:id/reject - Reject application (Admin only)
router.put("/:id/reject", authenticate, authorize("admin"), wrapAsync(async (req, res) => {
    const { adminNotes } = req.body;
    
    const application = await CourierApplication.findById(req.params.id)
        .populate("user", "name email");
    
    if (!application) {
        throw new ExpressError(404, "Application not found");
    }
    
    if (application.status !== "pending") {
        throw new ExpressError(400, `Application has already been ${application.status}.`);
    }
    
    // Update application status
    application.status = "rejected";
    application.adminNotes = adminNotes || "Application did not meet requirements.";
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    await application.save();
    
    res.json({
        success: true,
        message: `Application rejected.`,
        application
    });
}));

module.exports = router;
