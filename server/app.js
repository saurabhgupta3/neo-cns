const express = require("express");
const mongoose = require("mongoose");
const Order = require("./models/order.js");
const cors = require("cors");
const {calculateDistance, calculatePrice} = require("./utils/orderUtils.js");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/expressError.js");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

main()
    .then(() => {
        console.log("connected to DB");
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(process.env.MONGO_URL);
}

app.get("/", (req, res) => {
    res.send("root route");
});

app.get("/orders", wrapAsync(async (req, res) => {
    const allOrders = await Order.find({});
    console.log("success");
    res.json(allOrders);
}));

app.get("/orders/:id", wrapAsync(async (req, res) => {
    let {id} = req.params;
    const order = await Order.findById(id);
    res.json(order);

}));

//create order
app.post("/orders", wrapAsync(async (req, res, next) => {
    const orderData = req.body;
    orderData.distance = calculateDistance(orderData.pickupAddress, orderData.deliveryAddress);
    orderData.price = calculatePrice(orderData.weight, orderData.distance);
    const newOrder = new Order(orderData);
    await newOrder.save();
    console.log("order is saved");
    res.json(newOrder);
}));

app.put("/orders/:id", wrapAsync(async (req, res) => {
    let {id} = req.params;
    const orderData = req.body;
    orderData.distance = calculateDistance(orderData.pickupAddress, orderData.deliveryAddress);
    orderData.price = calculatePrice(orderData.weight, orderData.distance);
    const updatedOrder = await Order.findByIdAndUpdate(id, {...orderData}, {new: true});
    console.log("order is edited");
    res.json(updatedOrder);
}));

app.delete("/orders/:id", wrapAsync(async (req, res) => {
    let {id} = req.params;
    const deletedOrder = await Order.findByIdAndDelete(id);
    console.log(deletedOrder);
    res.json(deletedOrder);
}));

app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
})

app.use((err, req, res, next) => {
    let {statusCode=500, message="something went wrong"} = err;
    console.error(message);
    res.status(statusCode).json({
        message
    });
})


app.listen(process.env.PORT, () => {
    console.log(`server is listening to port ${process.env.PORT}`);
});
