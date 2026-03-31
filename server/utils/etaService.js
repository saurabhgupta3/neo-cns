/**
 * ETA Prediction Service
 * =======================
 * Integrates with Python ML service for delivery time predictions.
 * Falls back to formula-based calculation if ML service is unavailable.
 */

const axios = require('axios');

// ML Service configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const ML_TIMEOUT = 5000; // 5 seconds timeout

/**
 * Get ETA prediction from ML service
 * @param {Object} params - Prediction parameters
 * @param {number} params.distance - Distance in km
 * @param {number} params.weight - Package weight in kg
 * @param {number} [params.hourOfDay] - Hour of day (0-23)
 * @param {number} [params.trafficLevel] - Traffic level (1-4)
 * @returns {Promise<Object>} ETA prediction result
 */
async function predictETA(params) {
    const { distance, weight, hourOfDay, trafficLevel } = params;
    
    // Validate inputs
    if (!distance || distance <= 0) {
        throw new Error('Valid distance is required');
    }
    
    const currentHour = hourOfDay ?? new Date().getHours();
    const traffic = trafficLevel ?? 2; // Default: medium traffic
    
    console.log(`\n🕐 Predicting ETA for:`);
    console.log(`   Distance: ${distance} km`);
    console.log(`   Weight: ${weight} kg`);
    console.log(`   Hour: ${currentHour}`);
    console.log(`   Traffic: ${traffic}`);
    
    try {
        // Try ML service first
        const response = await axios.post(
            `${ML_SERVICE_URL}/predict/eta`,
            {
                distance: distance,
                hour_of_day: currentHour,
                traffic_level: traffic,
                weight: weight
            },
            {
                timeout: ML_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.data.success) {
            console.log(`✅ ML Prediction: ${response.data.eta_formatted}`);
            console.log(`   Method: ${response.data.method}`);
            console.log(`   Confidence: ${(response.data.confidence * 100).toFixed(0)}%`);
            
            return {
                etaMinutes: response.data.eta_minutes,
                etaFormatted: response.data.eta_formatted,
                confidence: response.data.confidence,
                method: response.data.method,
                estimatedDeliveryTime: new Date(Date.now() + response.data.eta_minutes * 60 * 1000)
            };
        }
        
        throw new Error(response.data.message || 'ML service returned error');
        
    } catch (error) {
        console.log(`⚠️ ML Service unavailable: ${error.message}`);
        console.log(`   Using fallback formula...`);
        
        // Fallback to formula-based calculation
        return calculateETAFallback(distance, weight, currentHour, traffic);
    }
}

/**
 * Fallback ETA calculation when ML service is unavailable.
 * Uses distance-aware speed assumptions:
 * - Short (≤ 20 km): city delivery at ~25 km/h
 * - Medium (20-100 km): mixed city/highway at ~40 km/h
 * - Long (100-500 km): highway at ~55 km/h + rest stops
 * - Very long (> 500 km): highway + overnight rest stops
 */
function calculateETAFallback(distance, weight, hourOfDay, trafficLevel) {
    let etaMinutes;

    if (distance <= 20) {
        etaMinutes = (distance / 25) * 60;
    } else if (distance <= 100) {
        const cityTime = (20 / 25) * 60;
        const highwayTime = ((distance - 20) / 40) * 60;
        etaMinutes = cityTime + highwayTime;
    } else if (distance <= 500) {
        const cityTime = (20 / 25) * 60;
        const highwayTime = ((distance - 20) / 55) * 60;
        const restStops = Math.floor(distance / 200) * 30;
        etaMinutes = cityTime + highwayTime + restStops + 30;
    } else {
        const cityTime = (20 / 25) * 60;
        const highwayTime = ((distance - 20) / 55) * 60;
        const restStops = Math.floor(distance / 200) * 30;
        const overnightStops = Math.floor(distance / 700) * 480;
        etaMinutes = cityTime + highwayTime + restStops + overnightStops + 60;
    }
    
    // Traffic factor (mainly affects short distances)
    const trafficMultipliers = { 1: 0.9, 2: 1.0, 3: 1.15, 4: 1.3 };
    if (distance <= 50) {
        etaMinutes *= trafficMultipliers[trafficLevel] || 1.0;
    } else {
        const cityFactor = trafficMultipliers[trafficLevel] || 1.0;
        etaMinutes = etaMinutes * 0.3 * cityFactor + etaMinutes * 0.7;
    }
    
    // Rush hour factor (only for short distances)
    if ([8, 9, 10, 17, 18, 19, 20].includes(hourOfDay) && distance <= 50) {
        etaMinutes *= 1.25;
    }
    
    // Weight factor (heavy packages take longer)
    if (weight > 10) {
        etaMinutes += 15;
    } else if (weight > 5) {
        etaMinutes += 5;
    }
    
    // Minimum 15 minutes
    etaMinutes = Math.max(15, Math.round(etaMinutes));
    
    // Format ETA
    let etaFormatted;
    if (etaMinutes >= 1440) {
        const days = Math.floor(etaMinutes / 1440);
        const hours = Math.floor((etaMinutes % 1440) / 60);
        etaFormatted = hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    } else if (etaMinutes >= 60) {
        const hours = Math.floor(etaMinutes / 60);
        const mins = etaMinutes % 60;
        etaFormatted = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else {
        etaFormatted = `${etaMinutes}m`;
    }
    
    console.log(`📊 Fallback ETA: ${etaFormatted} (${etaMinutes} minutes)`);
    
    return {
        etaMinutes: etaMinutes,
        etaFormatted: etaFormatted,
        confidence: distance <= 200 ? 0.7 : 0.6,
        method: 'fallback_formula',
        estimatedDeliveryTime: new Date(Date.now() + etaMinutes * 60 * 1000)
    };
}

/**
 * Check if ML service is healthy
 */
async function checkMLServiceHealth() {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/health`, {
            timeout: 2000
        });
        return {
            available: true,
            modelLoaded: response.data.model_loaded,
            timestamp: response.data.timestamp
        };
    } catch (error) {
        return {
            available: false,
            error: error.message
        };
    }
}

/**
 * Get ML model information
 */
async function getModelInfo() {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/model/info`, {
            timeout: 2000
        });
        return response.data;
    } catch (error) {
        return {
            success: false,
            message: 'ML service unavailable'
        };
    }
}

module.exports = {
    predictETA,
    calculateETAFallback,
    checkMLServiceHealth,
    getModelInfo
};
