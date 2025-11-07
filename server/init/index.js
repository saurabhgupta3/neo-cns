const mongoose = require("mongoose");
const initData = require("./data.js");
const Order = require("../models/order.js");
require("dotenv").config({ path: '../.env' });


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

const initDB = async () => {
    await Order.deleteMany({});
    await Order.insertMany(initData.data);
    console.log("data was initialized");
};

initDB();