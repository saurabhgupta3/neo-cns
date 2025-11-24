const mongoose = require("mongoose");
const initData = require("./data.js");
const Order = require("../models/order.js");
const {calculateDistance, calculatePrice} = require("../utils/orderUtils.js");
require("dotenv").config({ path: '../.env' });

main()
  .then(() => console.log("connected to DB"))
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect(process.env.MONGO_URL);
}

const initDB = async () => {
  await Order.deleteMany({});

  const updatedData = initData.data.map(order => {
    const distance = calculateDistance(order.pickupAddress, order.deliveryAddress);
    const price = calculatePrice(order.weight, distance);
    return { ...order, distance, price };
  });

  await Order.insertMany(updatedData);
  console.log("data was initialized");
};

initDB();
