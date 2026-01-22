const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const statusHistorySchema = new Schema({
    status: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    note: String,
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    location: {
        lat: Number,
        lng: Number
    }
}, { _id: false });

const orderSchema = new Schema({
    // User who created the order
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // Assigned courier
    courier: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    senderName: {
        type: String,
        required: true,
    },
    receiverName: {
        type: String,
        required: true,
    },
    senderPhone: {
        type: String,
    },
    receiverPhone: {
        type: String,
    },
    pickupAddress: {
        type: String,
        required: true,
    },
    deliveryAddress: {
        type: String,
        required: true,
    },
    // Coordinates for mapping and ETA calculation
    pickupCoordinates: {
        lat: Number,
        lng: Number
    },
    deliveryCoordinates: {
        lat: Number,
        lng: Number
    },
    status: {
        type: String,
        enum: ["Pending", "Confirmed", "Picked Up", "In Transit", "Out for Delivery", "Delivered", "Cancelled"],
        default: "Pending",
    },
    statusHistory: [statusHistorySchema],
    image: {
        type: String,
        default: "https://res.cloudinary.com/dfq3xkwrk/image/upload/v1762187021/ChatGPT_Image_Nov_3_2025_09_51_44_PM_ausbho.png",
        set: (value) => {
            if (value === "" || value === null || value === undefined) {
                return "https://res.cloudinary.com/dfq3xkwrk/image/upload/v1762187021/ChatGPT_Image_Nov_3_2025_09_51_44_PM_ausbho.png";
            }
            return value;
        }
    },
    weight: {
        type: Number,
        required: true,
    },
    distance: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    // ETA related fields
    estimatedDeliveryTime: {
        type: Date
    },
    actualDeliveryTime: {
        type: Date
    },
    etaPredictionConfidence: {
        type: Number,
        min: 0,
        max: 1
    },
    // Fraud detection fields
    riskScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 1
    },
    fraudFlags: [{
        type: String
    }],
    // Payment info
    paymentMethod: {
        type: String,
        enum: ["COD", "Prepaid", "Wallet"],
        default: "COD"
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    // Notes
    specialInstructions: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
orderSchema.pre("save", function(next) {
    this.updatedAt = Date.now();
    next();
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
