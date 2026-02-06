/**
 * Upload Routes
 * Handles file uploads to Cloudinary
 */

const express = require('express');
const router = express.Router();
const { upload, deleteImage } = require('../config/cloudinary');
const { authenticate } = require('../middleware/auth');
const ExpressError = require('../utils/expressError');

/**
 * @route   POST /api/upload/image
 * @desc    Upload a single image
 * @access  Private
 */
router.post('/image', authenticate, (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new ExpressError(400, 'File too large. Maximum size is 5MB.'));
            }
            return next(new ExpressError(400, err.message));
        }

        if (!req.file) {
            return next(new ExpressError(400, 'No image file provided'));
        }

        console.log(`📷 Image uploaded: ${req.file.path}`);

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            imageUrl: req.file.path,
            publicId: req.file.filename
        });
    });
});

/**
 * @route   DELETE /api/upload/image
 * @desc    Delete an image from Cloudinary
 * @access  Private
 */
router.delete('/image', authenticate, async (req, res, next) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return next(new ExpressError(400, 'Image URL is required'));
        }

        const result = await deleteImage(imageUrl);

        if (result.success) {
            res.json({
                success: true,
                message: 'Image deleted successfully'
            });
        } else {
            return next(new ExpressError(400, 'Failed to delete image'));
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;
