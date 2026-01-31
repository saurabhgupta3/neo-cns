const mongoose = require("mongoose");
require("dotenv").config();

const app = require("./app");

// Database connection
main()
    .then(() => {
        console.log("✅ Connected to MongoDB");
    })
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err);
    });

async function main() {
    await mongoose.connect(process.env.MONGO_URL);
}

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 API endpoints:`);
    console.log(`   - Auth:   http://localhost:${PORT}/api/auth`);
    console.log(`   - Orders: http://localhost:${PORT}/api/orders`);
    console.log(`   - Users:  http://localhost:${PORT}/api/users`);
});
