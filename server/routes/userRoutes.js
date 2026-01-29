const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate, authorize } = require("../middleware/auth");

// All routes here require admin access
router.use(authenticate, authorize("admin"));

// GET /api/users - Get all users
router.get("/", userController.getAllUsers);

// GET /api/users/couriers - Get all available couriers
router.get("/couriers", userController.getAvailableCouriers);

// GET /api/users/stats/summary - Get user statistics
router.get("/stats/summary", userController.getUserStats);

// GET /api/users/:id - Get single user
router.get("/:id", userController.getUserById);

// PUT /api/users/:id - Update user
router.put("/:id", userController.updateUser);

// PUT /api/users/:id/role - Change user role
router.put("/:id/role", userController.changeUserRole);

// PUT /api/users/:id/toggle-active - Toggle user active status
router.put("/:id/toggle-active", userController.toggleUserActive);

// PUT /api/users/:id/restore - Restore soft-deleted user
router.put("/:id/restore", userController.restoreUser);

// DELETE /api/users/:id - Soft delete user
router.delete("/:id", userController.deleteUser);

module.exports = router;
