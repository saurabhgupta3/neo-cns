const express = require("express");
const cors = require("cors");

// Import routes
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

// Import error handler
const ExpressError = require("./utils/expressError");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/", (req, res) => {
    res.json({ 
        success: true,
        message: "🚀 Neo-CNS API is running!",
        version: "1.0.0",
        endpoints: {
            auth: "/api/auth",
            orders: "/api/orders",
            users: "/api/users",
            applications: "/api/applications",
            upload: "/api/upload"
        }
    });
});

app.get("/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/upload", uploadRoutes);

// 404 handler
app.use((req, res, next) => {
    next(new ExpressError(404, `Route ${req.originalUrl} not found`));
});

// Global error handler
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong" } = err;
    
    // Log error for debugging (skip in test environment)
    if (process.env.NODE_ENV !== "test") {
        console.error(`❌ Error: ${message}`);
        if (process.env.NODE_ENV === "development") {
            console.error(err.stack);
        }
    }
    
    // Mongoose validation error
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors).map(e => e.message).join(", ");
    }
    
    // Mongoose duplicate key error
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue)[0];
        message = `${field} already exists`;
    }
    
    // Mongoose cast error (invalid ObjectId)
    if (err.name === "CastError") {
        statusCode = 400;
        message = "Invalid ID format";
    }
    
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
});

module.exports = app;
