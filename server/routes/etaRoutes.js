/**
 * ETA Prediction Routes
 * =====================
 * Endpoints for ETA predictions and ML service status
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { predictETA, checkMLServiceHealth, getModelInfo } = require('../utils/etaService');
const ExpressError = require('../utils/expressError');

/**
 * @route   GET /api/eta/health
 * @desc    Check ML service health
 * @access  Public
 */
router.get('/health', async (req, res) => {
    const health = await checkMLServiceHealth();
    res.json({
        success: true,
        mlService: health
    });
});

/**
 * @route   GET /api/eta/model-info
 * @desc    Get ML model information
 * @access  Private (Admin only)
 */
router.get('/model-info', authenticate, async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return next(new ExpressError(403, 'Admin access required'));
    }
    
    const info = await getModelInfo();
    res.json(info);
});

/**
 * @route   POST /api/eta/predict
 * @desc    Get ETA prediction for given parameters
 * @access  Private
 */
router.post('/predict', authenticate, async (req, res, next) => {
    try {
        const { distance, weight, hourOfDay, trafficLevel } = req.body;
        
        if (!distance) {
            return next(new ExpressError(400, 'Distance is required'));
        }
        
        const result = await predictETA({
            distance: parseFloat(distance),
            weight: parseFloat(weight) || 1,
            hourOfDay: hourOfDay ?? new Date().getHours(),
            trafficLevel: trafficLevel ?? 2
        });
        
        res.json({
            success: true,
            prediction: {
                minutes: result.etaMinutes,
                formatted: result.etaFormatted,
                estimatedDelivery: result.estimatedDeliveryTime,
                confidence: result.confidence,
                method: result.method
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
