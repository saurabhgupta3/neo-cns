const CourierApplication = require("../models/courierApplication");
const User = require("../models/user");
const ExpressError = require("../utils/expressError");

// @desc    Submit courier application
// @route   POST /api/applications/courier
// @access  Private
const submitApplication = async (req, res, next) => {
    try {
        const user = req.user;
        
        // Check if user is already a courier
        if (user.role === "courier") {
            return next(new ExpressError(400, "You are already a courier."));
        }
        
        // Check for existing pending application
        const existingApplication = await CourierApplication.findOne({
            user: user._id,
            status: "pending"
        });
        
        if (existingApplication) {
            return next(new ExpressError(400, "You already have a pending application. Please wait for review."));
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
            return next(new ExpressError(400, 
                `Your previous application was rejected. You can reapply in ${daysLeft} day(s).`
            ));
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
    } catch (error) {
        next(error);
    }
};

// @desc    Get user's own applications
// @route   GET /api/applications/my-applications
// @access  Private
const getMyApplications = async (req, res, next) => {
    try {
        const applications = await CourierApplication.find({ user: req.user._id })
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: applications.length,
            applications
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all applications
// @route   GET /api/applications
// @access  Private (Admin only)
const getAllApplications = async (req, res, next) => {
    try {
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
    } catch (error) {
        next(error);
    }
};

// @desc    Get single application
// @route   GET /api/applications/:id
// @access  Private (Admin only)
const getApplicationById = async (req, res, next) => {
    try {
        const application = await CourierApplication.findById(req.params.id)
            .populate("user", "name email phone address createdAt")
            .populate("reviewedBy", "name");
        
        if (!application) {
            return next(new ExpressError(404, "Application not found"));
        }
        
        res.json({
            success: true,
            application
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve application
// @route   PUT /api/applications/:id/approve
// @access  Private (Admin only)
const approveApplication = async (req, res, next) => {
    try {
        const { adminNotes } = req.body;
        
        const application = await CourierApplication.findById(req.params.id)
            .populate("user", "name email");
        
        if (!application) {
            return next(new ExpressError(404, "Application not found"));
        }
        
        if (application.status !== "pending") {
            return next(new ExpressError(400, `Application has already been ${application.status}.`));
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
    } catch (error) {
        next(error);
    }
};

// @desc    Reject application
// @route   PUT /api/applications/:id/reject
// @access  Private (Admin only)
const rejectApplication = async (req, res, next) => {
    try {
        const { adminNotes } = req.body;
        
        const application = await CourierApplication.findById(req.params.id)
            .populate("user", "name email");
        
        if (!application) {
            return next(new ExpressError(404, "Application not found"));
        }
        
        if (application.status !== "pending") {
            return next(new ExpressError(400, `Application has already been ${application.status}.`));
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
    } catch (error) {
        next(error);
    }
};

module.exports = {
    submitApplication,
    getMyApplications,
    getAllApplications,
    getApplicationById,
    approveApplication,
    rejectApplication
};
