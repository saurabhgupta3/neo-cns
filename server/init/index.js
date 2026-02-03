const mongoose = require("mongoose");
const initData = require("./data.js");
const Order = require("../models/order.js");
const { calculateDistance, calculatePrice } = require("../utils/distanceService.js");
require("dotenv").config({ path: '../.env' });

main()
  .then(() => console.log("connected to DB"))
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect(process.env.MONGO_URL);
}

const initDB = async () => {
  await Order.deleteMany({});

  console.log("📦 Initializing sample orders with real distances...\n");

  const updatedData = [];
  
  for (const order of initData.data) {
    try {
      const distanceResult = await calculateDistance(order.pickupAddress, order.deliveryAddress);
      const price = calculatePrice(order.weight, distanceResult.distance);
      
      updatedData.push({
        ...order,
        distance: distanceResult.distance,
        distanceMethod: distanceResult.method,
        price
      });
      
      console.log(`✅ ${order.senderName} → ${order.receiverName}: ${distanceResult.distance} km (${distanceResult.method})`);
    } catch (error) {
      console.log(`⚠️ Skipping order ${order.senderName}: ${error.message}`);
    }
  }

  if (updatedData.length > 0) {
    await Order.insertMany(updatedData);
    console.log(`\n✅ ${updatedData.length} orders initialized successfully!`);
  } else {
    console.log("\n⚠️ No orders could be initialized. Check addresses or API key.");
  }
  
  mongoose.connection.close();
};

initDB();
