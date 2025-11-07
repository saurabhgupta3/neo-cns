const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    senderName: {
        type: String,
        required: true,
    },
    receiverName: {
        type: String,
        required: true,
    },
    pickupAddress: {
        type: String,
        required: true,
    },
    deliveryAddress: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        default: "Pending",
    },
    image: {
        type: String,
        default:
            "https://res.cloudinary.com/dfq3xkwrk/image/upload/v1762187021/ChatGPT_Image_Nov_3_2025_09_51_44_PM_ausbho.png",
    },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
