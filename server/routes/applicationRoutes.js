const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/applicationController");
const { authenticate, authorize } = require("../middleware/auth");

// ========== USER ROUTES ==========

// POST /api/applications/courier - Submit courier application
router.post("/courier", authenticate, applicationController.submitApplication);

// GET /api/applications/my-applications - Get user's own applications
router.get("/my-applications", authenticate, applicationController.getMyApplications);

// ========== ADMIN ROUTES ==========

// GET /api/applications - Get all applications (Admin only)
router.get("/", authenticate, authorize("admin"), applicationController.getAllApplications);

// GET /api/applications/:id - Get single application (Admin only)
router.get("/:id", authenticate, authorize("admin"), applicationController.getApplicationById);

// PUT /api/applications/:id/approve - Approve application (Admin only)
router.put("/:id/approve", authenticate, authorize("admin"), applicationController.approveApplication);

// PUT /api/applications/:id/reject - Reject application (Admin only)
router.put("/:id/reject", authenticate, authorize("admin"), applicationController.rejectApplication);

module.exports = router;
