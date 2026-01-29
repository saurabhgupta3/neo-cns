const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authenticate, authorize } = require("../middleware/auth");

// GET /api/orders - Get all orders (role-based filtering)
router.get("/", authenticate, orderController.getAllOrders);

// GET /api/orders/:id - Get single order
router.get("/:id", authenticate, orderController.getOrderById);

// POST /api/orders - Create new order (Users and Admins only)
router.post("/", authenticate, authorize("user", "admin"), orderController.createOrder);

// PUT /api/orders/:id - Update order
router.put("/:id", authenticate, orderController.updateOrder);

// PUT /api/orders/:id/status - Update order status (Admin/Courier only)
router.put("/:id/status", authenticate, authorize("admin", "courier"), orderController.updateOrderStatus);

// PUT /api/orders/:id/assign - Assign courier to order (Admin only)
router.put("/:id/assign", authenticate, authorize("admin"), orderController.assignCourier);

// DELETE /api/orders/:id - Delete order
router.delete("/:id", authenticate, orderController.deleteOrder);

module.exports = router;
