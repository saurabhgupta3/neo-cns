/**
 * Cloudinary Configuration for Image Upload
 * 
 * Get your free API keys from: https://cloudinary.com/
 * Free tier includes: 25 GB storage, 25 GB bandwidth/month
 */

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'neo-cns/orders', // Folder in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
            { width: 800, height: 600, crop: 'limit' }, // Resize to max 800x600
            { quality: 'auto' } // Auto optimize quality
        ]
    }
});

// Create multer upload middleware
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, PNG, GIF and WebP are allowed.'), false);
        }
    }
});

// Delete image from Cloudinary
const deleteImage = async (imageUrl) => {
    try {
        if (!imageUrl || !imageUrl.includes('cloudinary')) {
            return { success: true, message: 'No Cloudinary image to delete' };
        }
        
        // Extract public_id from URL
        // URL format: https://res.cloudinary.com/[cloud_name]/image/upload/v[version]/[folder]/[filename].[ext]
        const urlParts = imageUrl.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        if (uploadIndex === -1) return { success: false };
        
        // Get everything after 'upload/v[version]/'
        const publicIdWithExt = urlParts.slice(uploadIndex + 2).join('/');
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ''); // Remove extension
        
        const result = await cloudinary.uploader.destroy(publicId);
        console.log(`🗑️ Deleted image: ${publicId}`, result);
        return { success: true, result };
    } catch (error) {
        console.error('Error deleting image:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    cloudinary,
    upload,
    deleteImage
};
