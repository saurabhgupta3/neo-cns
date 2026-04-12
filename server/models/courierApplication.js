const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courierApplicationSchema = new Schema({
    // applicant ref
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    
    // app details
    vehicleType: {
        type: String,
        enum: ["bicycle", "motorcycle", "car", "van", "truck"],
        required: [true, "Vehicle type is required"]
    },
    vehicleNumber: {
        type: String,
        trim: true
    },
    drivingLicense: {
        type: String,
        trim: true,
        required: [true, "Driving license number is required"]
    },
    experience: {
        type: String,
        enum: ["none", "less-than-1", "1-3", "3-5", "more-than-5"],
        required: [true, "Experience is required"]
    },
    
    // availability
    workHours: {
        type: String,
        enum: ["full-time", "part-time", "weekends", "flexible"],
        required: [true, "Preferred work hours is required"]
    },
    
    // extra info
    motivation: {
        type: String,
        maxlength: [500, "Motivation cannot exceed 500 characters"]
    },
    
    // app status
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    
    // admin notes
    adminNotes: {
        type: String
    },
    
    // reviewer info
    reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    reviewedAt: {
        type: Date
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// unique pending index
courierApplicationSchema.index(
    { user: 1, status: 1 }, 
    { 
        unique: true, 
        partialFilterExpression: { status: "pending" } 
    }
);

const CourierApplication = mongoose.model("CourierApplication", courierApplicationSchema);
module.exports = CourierApplication;
