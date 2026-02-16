const Order = require("../models/order");
const { calculateDistance, calculatePrice } = require("../utils/distanceService");
const { predictETA } = require("../utils/etaService");
const ExpressError = require("../utils/expressError");

// @desc    Get all orders (role-based filtering)
// @route   GET /api/orders
// @access  Private
const getAllOrders = async (req, res, next) => {
    try {
        let query = {};
        
        if (req.user.role === "user") {
            query.user = req.user._id;
        } else if (req.user.role === "courier") {
            query.courier = req.user._id;
        }
        // Admin sees all orders (no filter)
        
        const orders = await Order.find(query)
            .populate("user", "name email")
            .populate("courier", "name phone")
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id)
            .populate("user", "name email phone")
            .populate("courier", "name phone");
        
        if (!order) {
            return next(new ExpressError(404, "Order not found"));
        }
        
        // Check if user has permission to view this order
        if (req.user.role === "user" && order.user._id.toString() !== req.user._id.toString()) {
            return next(new ExpressError(403, "Not authorized to view this order"));
        }
        
        res.json({ success: true, order });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Users and Admins only)
const createOrder = async (req, res, next) => {
    try {
        const orderData = req.body;
        
        // Calculate distance and price (async - uses real distance API)
        let distanceResult;
        try {
            distanceResult = await calculateDistance(orderData.pickupAddress, orderData.deliveryAddress);
            orderData.distance = distanceResult.distance; // Road distance for display
            orderData.distanceMethod = distanceResult.method; // Track which method was used
            orderData.price = calculatePrice(orderData.weight, orderData.distance);
            
            console.log(`✅ Order distance: ${orderData.distance} km (via ${distanceResult.method})`);
            console.log(`📍 Haversine distance (for ML): ${distanceResult.haversineDistance.toFixed(2)} km`);
        } catch (distanceError) {
            console.error('❌ Distance calculation failed:', distanceError.message);
            return next(new ExpressError(400, distanceError.message));
        }
        
        // Predict ETA using ML service (uses Haversine distance to match training data)
        try {
            const etaResult = await predictETA({
                distance: distanceResult.haversineDistance, // Pure Haversine - matches training data
                weight: parseFloat(orderData.weight) || 1,
                hourOfDay: new Date().getHours(),
                trafficLevel: 2 // Default medium traffic
            });
            
            orderData.estimatedDeliveryTime = etaResult.estimatedDeliveryTime;
            orderData.etaPredictionConfidence = etaResult.confidence;
            orderData.etaMinutes = etaResult.etaMinutes;
            orderData.etaMethod = etaResult.method;
            
            console.log(`✅ ETA predicted: ${etaResult.etaFormatted} (${etaResult.method})`);
        } catch (etaError) {
            console.log('⚠️ ETA prediction failed, will be calculated later:', etaError.message);
            // ETA is optional, don't fail the order creation
        }
        
        // Attach user to order
        orderData.user = req.user._id;
        
        // Initialize status history
        orderData.statusHistory = [{
            status: "Pending",
            timestamp: new Date(),
            note: "Order created"
        }];
        
        const newOrder = new Order(orderData);
        await newOrder.save();
        
        // Populate user info before sending response
        await newOrder.populate("user", "name email");
        
        res.status(201).json({
            success: true,
            message: "Order created successfully!",
            order: newOrder,
            eta: orderData.etaMinutes ? {
                minutes: orderData.etaMinutes,
                formatted: formatETA(orderData.etaMinutes),
                estimatedDelivery: orderData.estimatedDeliveryTime,
                confidence: orderData.etaPredictionConfidence,
                method: orderData.etaMethod
            } : null
        });
    } catch (error) {
        next(error);
    }
};

// Helper function to format ETA
function formatETA(minutes) {
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
}

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private
const updateOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const orderData = req.body;
        
        const order = await Order.findById(id);
        
        if (!order) {
            return next(new ExpressError(404, "Order not found"));
        }
        
        // Check permission
        if (req.user.role === "user" && order.user.toString() !== req.user._id.toString()) {
            return next(new ExpressError(403, "Not authorized to update this order"));
        }
        
        // Users can only update certain fields
        if (req.user.role === "user") {
            // Users can only update if order is still pending
            if (order.status !== "Pending") {
                return next(new ExpressError(400, "Cannot update order after it has been confirmed"));
            }
        }
        
        // Recalculate distance and price if addresses changed
        if (orderData.pickupAddress || orderData.deliveryAddress) {
            try {
                const distanceResult = await calculateDistance(
                    orderData.pickupAddress || order.pickupAddress,
                    orderData.deliveryAddress || order.deliveryAddress
                );
                orderData.distance = distanceResult.distance;
                orderData.distanceMethod = distanceResult.method;
                orderData.price = calculatePrice(orderData.weight || order.weight, orderData.distance);
            } catch (distanceError) {
                return next(new ExpressError(400, distanceError.message));
            }
        }
        
        const updatedOrder = await Order.findByIdAndUpdate(id, orderData, { new: true, runValidators: true })
            .populate("user", "name email")
            .populate("courier", "name phone");
        
        res.json({
            success: true,
            message: "Order updated successfully!",
            order: updatedOrder
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin/Courier only)
const updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;
        
        const validStatuses = ["Pending", "Confirmed", "Picked Up", "In Transit", "Out for Delivery", "Delivered", "Cancelled"];
        
        if (!validStatuses.includes(status)) {
            return next(new ExpressError(400, "Invalid status"));
        }
        
        const order = await Order.findById(id);
        
        if (!order) {
            return next(new ExpressError(404, "Order not found"));
        }
        
        // Add to status history
        order.statusHistory.push({
            status,
            timestamp: new Date(),
            note: note || `Status updated to ${status}`,
            updatedBy: req.user._id
        });
        
        order.status = status;
        
        // Set actual delivery time if delivered
        if (status === "Delivered") {
            order.actualDeliveryTime = new Date();
        }
        
        await order.save();
        await order.populate("user", "name email");
        await order.populate("courier", "name phone");
        
        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            order
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Assign courier to order
// @route   PUT /api/orders/:id/assign
// @access  Private (Admin only)
const assignCourier = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { courierId } = req.body;
        
        const order = await Order.findByIdAndUpdate(
            id,
            { 
                courier: courierId,
                status: "Confirmed",
                $push: {
                    statusHistory: {
                        status: "Confirmed",
                        timestamp: new Date(),
                        note: "Courier assigned",
                        updatedBy: req.user._id
                    }
                }
            },
            { new: true }
        )
        .populate("user", "name email")
        .populate("courier", "name phone");
        
        if (!order) {
            return next(new ExpressError(404, "Order not found"));
        }
        
        res.json({
            success: true,
            message: "Courier assigned successfully!",
            order
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private
const deleteOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const order = await Order.findById(id);
        
        if (!order) {
            return next(new ExpressError(404, "Order not found"));
        }
        
        // Only admin or order owner can delete
        if (req.user.role !== "admin" && order.user.toString() !== req.user._id.toString()) {
            return next(new ExpressError(403, "Not authorized to delete this order"));
        }
        
        // Users can only delete pending orders
        if (req.user.role === "user" && order.status !== "Pending") {
            return next(new ExpressError(400, "Cannot delete order after it has been confirmed"));
        }
        
        await Order.findByIdAndDelete(id);
        
        res.json({
            success: true,
            message: "Order deleted successfully!"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrder,
    updateOrderStatus,
    assignCourier,
    deleteOrder
};
