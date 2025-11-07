const express = require("express");
const mongoose = require("mongoose");
const Order = require("./models/order.js");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());

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
