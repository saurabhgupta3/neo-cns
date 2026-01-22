const mongoose = require("mongoose");
const User = require("../models/user");
require("dotenv").config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("✅ Connected to MongoDB");

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: "admin@neocns.com" });
        
        if (existingAdmin) {
            console.log("⚠️  Admin user already exists:");
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Role: ${existingAdmin.role}`);
        } else {
            // Create admin user
            const admin = new User({
                name: "Admin",
                email: "admin@neocns.com",
                password: "admin123",
                phone: "9999999999",
                role: "admin",
                address: "Neo-CNS Headquarters"
            });

            await admin.save();
            console.log("✅ Admin user created successfully!");
            console.log("   Email: admin@neocns.com");
            console.log("   Password: admin123");
            console.log("   Role: admin");
        }

        // Create a test courier
        const existingCourier = await User.findOne({ email: "courier@neocns.com" });
        
        if (!existingCourier) {
            const courier = new User({
                name: "Test Courier",
                email: "courier@neocns.com",
                password: "courier123",
                phone: "8888888888",
                role: "courier",
                address: "Courier Hub",
                isAvailable: true
            });

            await courier.save();
            console.log("✅ Test courier created:");
            console.log("   Email: courier@neocns.com");
            console.log("   Password: courier123");
        }

        // Create a test user
        const existingUser = await User.findOne({ email: "user@neocns.com" });
        
        if (!existingUser) {
            const user = new User({
                name: "Test User",
                email: "user@neocns.com",
                password: "user123",
                phone: "7777777777",
                role: "user",
                address: "123 Main Street"
            });

            await user.save();
            console.log("✅ Test user created:");
            console.log("   Email: user@neocns.com");
            console.log("   Password: user123");
        }

        console.log("\n🎉 Seeding complete!");
        
    } catch (error) {
        console.error("❌ Error seeding:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
};

seedAdmin();
