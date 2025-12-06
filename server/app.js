const express = require("express");
const mongoose = require("mongoose");
const Order = require("./models/order.js");
const cors = require("cors");
const {calculateDistance, calculatePrice} = require("./utils/orderUtils.js");
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

app.get("/orders", async (req, res) => {
    const allOrders = await Order.find({});
    console.log("success");
    res.json(allOrders);
});

app.get("/orders/:id", async (req, res) => {
    let {id} = req.params;
    const order = await Order.findById(id);
    res.json(order);

});

app.post("/orders", async (req, res) => {
    const orderData = req.body;
    orderData.distance = calculateDistance(orderData.pickupAddress, orderData.deliveryAddress);
    orderData.price = calculatePrice(orderData.weight, orderData.distance);
    const newOrder = new Order(orderData);
    await newOrder.save();
    console.log("order is saved");
    res.json(newOrder);
});

app.put("/orders/:id", async (req, res) => {
    let {id} = req.params;
    const orderData = req.body;
    orderData.distance = calculateDistance(orderData.pickupAddress, orderData.deliveryAddress);
    orderData.price = calculatePrice(orderData.weight, orderData.distance);
    const updatedOrder = await Order.findByIdAndUpdate(id, {...orderData}, {new: true});
    console.log("order is edited");
    res.json(updatedOrder);
})

// app.get("/testing", async (req, res) => {
//     let newOrder = new Order({
//         senderName: "Saurabh",
//         receiverName: "Plk",
//         pickupAddress: "pratapgarh",
//         deliveryAddress: "prayagraj",
//     });
//     await newOrder.save();
//     console.log("order saved");
//     res.send("successful");
// })

app.listen(process.env.PORT, () => {
    console.log(`server is listening to port ${process.env.PORT}`);
});
