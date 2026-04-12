const Order = require("../models/order");
const {
    calculateDistance,
    calculatePrice,
} = require("../utils/distanceService");

const MAX_PACKAGE_WEIGHT_KG = 500;
const { predictETA } = require("../utils/etaService");
const { checkFraud } = require("../utils/fraudService");
const ExpressError = require("../utils/expressError");

// get all orders
const getAllOrders = async (req, res, next) => {
    try {
        let query = {};

        if (req.user.role === "user") {
            query.user = req.user._id;
        } else if (req.user.role === "courier") {
            query.courier = req.user._id;
        }
        // admin sees all

        const orders = await Order.find(query)
            .populate("user", "name email")
            .populate("courier", "name phone")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: orders.length,
            orders,
        });
    } catch (error) {
        next(error);
    }
};

// get single order
const getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id)
            .populate("user", "name email phone")
            .populate("courier", "name phone");

        if (!order) {
            return next(new ExpressError(404, "Order not found"));
        }

        // check permission
        if (
            req.user.role === "user" &&
            order.user._id.toString() !== req.user._id.toString()
        ) {
            return next(
                new ExpressError(403, "Not authorized to view this order"),
            );
        }

        res.json({ success: true, order });
    } catch (error) {
        next(error);
    }
};

// create new order
const createOrder = async (req, res, next) => {
    try {
        const orderData = req.body;

        const wCreate = parseFloat(orderData.weight);
        if (!Number.isFinite(wCreate) || wCreate < 0.01) {
            return next(new ExpressError(400, "Enter a valid package weight (kg)."));
        }
        if (wCreate > MAX_PACKAGE_WEIGHT_KG) {
            return next(
                new ExpressError(
                    400,
                    `Package weight cannot exceed ${MAX_PACKAGE_WEIGHT_KG} kg.`,
                ),
            );
        }

        // calc distance
        let distanceResult;
        try {
            distanceResult = await calculateDistance(
                orderData.pickupAddress,
                orderData.deliveryAddress,
            );
            orderData.distance = distanceResult.distance;
            orderData.distanceMethod = distanceResult.method;
            orderData.pickupCoordinates = {
                lat: distanceResult.pickupCoords.lat,
                lng: distanceResult.pickupCoords.lng,
            };
            orderData.deliveryCoordinates = {
                lat: distanceResult.deliveryCoords.lat,
                lng: distanceResult.deliveryCoords.lng,
            };
            orderData.price = calculatePrice(
                orderData.weight,
                orderData.distance,
            );

            console.log(
                `✅ Order distance: ${orderData.distance} km (via ${distanceResult.method})`,
            );
            console.log(
                `📍 Haversine distance (for ML): ${distanceResult.haversineDistance.toFixed(2)} km`,
            );
        } catch (distanceError) {
            console.error(
                "❌ Distance calculation failed:",
                distanceError.message,
            );
            return next(new ExpressError(400, distanceError.message));
        }

        // predict ETA
        try {
            const etaResult = await predictETA({
                distance: distanceResult.haversineDistance,
                weight: parseFloat(orderData.weight) || 1,
                hourOfDay: new Date().getHours(),
                trafficLevel: 2,
            });

            orderData.estimatedDeliveryTime = etaResult.estimatedDeliveryTime;
            orderData.etaPredictionConfidence = etaResult.confidence;
            orderData.etaMinutes = etaResult.etaMinutes;
            orderData.etaMethod = etaResult.method;

            console.log(
                `✅ ETA predicted: ${etaResult.etaFormatted} (${etaResult.method})`,
            );
        } catch (etaError) {
            console.log(
                "⚠️ ETA prediction failed, will be calculated later:",
                etaError.message,
            );
            // eta optional
        }

        // check fraud (courier ML: distance, weight, price, payment, hour)
        try {
            const fraudResult = await checkFraud({
                amount: orderData.price,
                distance: orderData.distance,
                weight: parseFloat(orderData.weight) || 1,
                paymentMethod: orderData.paymentMethod || "COD",
                hour: new Date().getHours(),
            });

            orderData.riskScore = fraudResult.riskScore;
            orderData.fraudFlags = fraudResult.fraudFlags;
            orderData.fraudReviewRequired =
                fraudResult.riskScore >= 0.3 || fraudResult.isFraud;

            console.log(
                `\u2705 Fraud check: ${fraudResult.riskLevel} risk (${fraudResult.riskScore})`,
            );
        } catch (fraudError) {
            console.log("\u26a0\ufe0f Fraud check failed:", fraudError.message);
            orderData.riskScore = 0;
            orderData.fraudFlags = [];
            orderData.fraudReviewRequired = false;
        }

        // attach user
        orderData.user = req.user._id;

        // init history
        orderData.statusHistory = [
            {
                status: "Pending",
                timestamp: new Date(),
                note: "Order created",
            },
        ];

        const newOrder = new Order(orderData);
        await newOrder.save();

        // populate user
        await newOrder.populate("user", "name email");

        res.status(201).json({
            success: true,
            message: "Order created successfully!",
            order: newOrder,
            eta: orderData.etaMinutes
                ? {
                      minutes: orderData.etaMinutes,
                      formatted: formatETA(orderData.etaMinutes),
                      estimatedDelivery: orderData.estimatedDeliveryTime,
                      confidence: orderData.etaPredictionConfidence,
                      method: orderData.etaMethod,
                  }
                : null,
            fraud: {
                riskScore: orderData.riskScore,
                riskLevel:
                    orderData.riskScore >= 0.6
                        ? "high"
                        : orderData.riskScore >= 0.3
                          ? "medium"
                          : "low",
                flags: orderData.fraudFlags,
            },
        });
    } catch (error) {
        next(error);
    }
};

// format ETA
function formatETA(minutes) {
    if (minutes >= 1440) {
        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
}

// update order
const updateOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const orderData = req.body;

        const order = await Order.findById(id);

        if (!order) {
            return next(new ExpressError(404, "Order not found"));
        }

        // check permission
        if (
            req.user.role === "user" &&
            order.user.toString() !== req.user._id.toString()
        ) {
            return next(
                new ExpressError(403, "Not authorized to update this order"),
            );
        }

        // user restrictions
        if (req.user.role === "user") {
            // pending only
            if (order.status !== "Pending") {
                return next(
                    new ExpressError(
                        400,
                        "Cannot update order after it has been confirmed",
                    ),
                );
            }
        }

        // recalc distance
        if (orderData.pickupAddress || orderData.deliveryAddress) {
            try {
                const distanceResult = await calculateDistance(
                    orderData.pickupAddress || order.pickupAddress,
                    orderData.deliveryAddress || order.deliveryAddress,
                );
                orderData.distance = distanceResult.distance;
                orderData.distanceMethod = distanceResult.method;
                orderData.pickupCoordinates = {
                    lat: distanceResult.pickupCoords.lat,
                    lng: distanceResult.pickupCoords.lng,
                };
                orderData.deliveryCoordinates = {
                    lat: distanceResult.deliveryCoords.lat,
                    lng: distanceResult.deliveryCoords.lng,
                };
                orderData.price = calculatePrice(
                    orderData.weight || order.weight,
                    orderData.distance,
                );

                // recalc ETA
                try {
                    const etaResult = await predictETA({
                        distance: distanceResult.haversineDistance,
                        weight:
                            parseFloat(orderData.weight || order.weight) || 1,
                        hourOfDay: new Date().getHours(),
                        trafficLevel: 2,
                    });
                    orderData.estimatedDeliveryTime =
                        etaResult.estimatedDeliveryTime;
                    orderData.etaMinutes = etaResult.etaMinutes;
                    orderData.etaMethod = etaResult.method;
                    console.log(
                        `✅ ETA recalculated: ${etaResult.etaFormatted}`,
                    );
                } catch (etaError) {
                    console.log(
                        "⚠️ ETA recalculation failed:",
                        etaError.message,
                    );
                }
            } catch (distanceError) {
                return next(new ExpressError(400, distanceError.message));
            }
        }

        const weightInBody = orderData.weight !== undefined;
        const payInBody = orderData.paymentMethod !== undefined;
        if (
            (weightInBody || payInBody) &&
            !orderData.pickupAddress &&
            !orderData.deliveryAddress
        ) {
            const w = parseFloat(orderData.weight ?? order.weight) || 1;
            const d = orderData.distance ?? order.distance;
            orderData.price = calculatePrice(w, d);
        }

        const fraudRelevant =
            orderData.pickupAddress ||
            orderData.deliveryAddress ||
            weightInBody ||
            payInBody;

        if (fraudRelevant) {
            const w = parseFloat(orderData.weight ?? order.weight) || 1;
            const d = orderData.distance ?? order.distance;
            const p = orderData.price ?? order.price;
            const pm = orderData.paymentMethod ?? order.paymentMethod;
            try {
                const fraudResult = await checkFraud({
                    amount: p,
                    distance: d,
                    weight: w,
                    paymentMethod: pm || "COD",
                    hour: new Date().getHours(),
                });
                orderData.riskScore = fraudResult.riskScore;
                orderData.fraudFlags = fraudResult.fraudFlags;
                orderData.fraudReviewRequired =
                    fraudResult.riskScore >= 0.3 || fraudResult.isFraud;
            } catch (fraudError) {
                console.log("\u26a0\ufe0f Fraud recalc failed:", fraudError.message);
            }
        }

        const updatedOrder = await Order.findByIdAndUpdate(id, orderData, {
            new: true,
            runValidators: true,
        })
            .populate("user", "name email")
            .populate("courier", "name phone");

        res.json({
            success: true,
            message: "Order updated successfully!",
            order: updatedOrder,
        });
    } catch (error) {
        next(error);
    }
};

// update status
const updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;

        const validStatuses = [
            "Pending",
            "Confirmed",
            "Picked Up",
            "In Transit",
            "Out for Delivery",
            "Delivered",
            "Cancelled",
        ];

        if (!validStatuses.includes(status)) {
            return next(new ExpressError(400, "Invalid status"));
        }

        const order = await Order.findById(id);

        if (!order) {
            return next(new ExpressError(404, "Order not found"));
        }

        // add history
        order.statusHistory.push({
            status,
            timestamp: new Date(),
            note: note || `Status updated to ${status}`,
            updatedBy: req.user._id,
        });

        order.status = status;

        // set delivery
        if (status === "Delivered") {
            order.actualDeliveryTime = new Date();
        }

        await order.save();
        await order.populate("user", "name email");
        await order.populate("courier", "name phone");

        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            order,
        });
    } catch (error) {
        next(error);
    }
};

// assign courier
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
                        updatedBy: req.user._id,
                    },
                },
            },
            { new: true },
        )
            .populate("user", "name email")
            .populate("courier", "name phone");

        if (!order) {
            return next(new ExpressError(404, "Order not found"));
        }

        res.json({
            success: true,
            message: "Courier assigned successfully!",
            order,
        });
    } catch (error) {
        next(error);
    }
};

// delete order
const deleteOrder = async (req, res, next) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id);

        if (!order) {
            return next(new ExpressError(404, "Order not found"));
        }

        // auth check
        if (
            req.user.role !== "admin" &&
            order.user.toString() !== req.user._id.toString()
        ) {
            return next(
                new ExpressError(403, "Not authorized to delete this order"),
            );
        }

        // pending only
        if (req.user.role === "user" && order.status !== "Pending") {
            return next(
                new ExpressError(
                    400,
                    "Cannot delete order after it has been confirmed",
                ),
            );
        }

        await Order.findByIdAndDelete(id);

        res.json({
            success: true,
            message: "Order deleted successfully!",
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
    deleteOrder,
};
