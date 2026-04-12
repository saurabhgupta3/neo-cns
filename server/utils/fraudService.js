/**
 * Fraud Detection Service
 * ========================
 * Integrates with Python ML service for payment fraud detection.
 * Falls back to rule-based scoring if ML service is unavailable.
 */

const axios = require('axios');

// ML Service configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const ML_TIMEOUT = 5000;

/**
 * Check fraud risk for an order
 * @param {Object} params - Order parameters
 * @param {number} params.amount - Order price
 * @param {number} params.distance - Distance km
 * @param {number} params.weight - Weight kg
 * @param {string} params.paymentMethod - COD, Prepaid, or Wallet
 * @param {number} [params.hour] - Hour of order creation (0-23)
 * @returns {Promise<Object>} Fraud assessment result
 */
async function checkFraud(params) {
    const { amount, paymentMethod, hour, distance, weight } = params;

    const currentHour = hour ?? new Date().getHours();
    const dist = Number(distance);
    const wt = Number(weight);

    console.log(`\n🚨 Checking fraud risk:`);
    console.log(`   Amount: ₹${amount}`);
    console.log(`   Distance: ${dist} km, Weight: ${wt} kg`);
    console.log(`   Payment: ${paymentMethod}`);
    console.log(`   Hour: ${currentHour}`);

    try {
        // Try ML service first (courier model)
        const response = await axios.post(
            `${ML_SERVICE_URL}/predict/fraud`,
            {
                amount: amount,
                payment_type: paymentMethod || 'COD',
                hour: currentHour,
                distance_km: dist,
                weight_kg: wt,
            },
            {
                timeout: ML_TIMEOUT,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        if (response.data.success) {
            console.log(`✅ Fraud Check: Risk ${response.data.risk_level} (${response.data.risk_score})`);
            console.log(`   Method: ${response.data.method}`);
            console.log(`   Flags: ${response.data.fraud_flags.join(', ') || 'None'}`);
            
            return {
                riskScore: response.data.risk_score,
                isFraud: response.data.is_fraud,
                riskLevel: response.data.risk_level,
                fraudFlags: response.data.fraud_flags,
                method: response.data.method
            };
        }
        
        throw new Error(response.data.message || 'ML service returned error');
        
    } catch (error) {
        console.log(`⚠️ ML Fraud Service unavailable: ${error.message}`);
        console.log(`   Using fallback rule-based scoring...`);
        
        return calculateFraudFallback(
            amount,
            paymentMethod,
            currentHour,
            dist,
            wt,
        );
    }
}

/**
 * Fallback rule-based fraud scoring (courier-aligned)
 */
function calculateFraudFallback(
    amount,
    paymentMethod,
    hour,
    distanceKm = 0,
    weightKg = 0,
) {
    let riskScore = 0.0;
    const fraudFlags = [];
    const meanRef = 800;

    if (hour >= 0 && hour <= 5) {
        riskScore += 0.22;
        fraudFlags.push(`Unusual hour (${hour}:00)`);
    }
    if (amount > 2 * meanRef) {
        riskScore += 0.18;
        fraudFlags.push("Price well above typical average");
    }
    if (paymentMethod === "COD" && amount > 1200) {
        riskScore += 0.12;
        fraudFlags.push("High-value COD order");
    }
    if (amount > 5000) {
        riskScore += 0.2;
        fraudFlags.push("Unusually high order value");
    }
    if (distanceKm > 400 && amount > 2000) {
        riskScore += 0.1;
        fraudFlags.push("Long-haul high-value order");
    }
    if (weightKg > 80 && paymentMethod === "COD") {
        riskScore += 0.08;
        fraudFlags.push("Heavy package on COD");
    }
    if (amount / meanRef > 2.5) {
        riskScore += 0.1;
        fraudFlags.push(`Price ${(amount / meanRef).toFixed(1)}x vs typical`);
    }
    // OOD: values far outside training / realistic courier range
    if (weightKg > 250) {
        riskScore = Math.max(riskScore, 0.82);
        fraudFlags.push("Weight far above typical parcel range");
    }
    if (amount > 20000) {
        riskScore = Math.max(riskScore, 0.82);
        fraudFlags.push("Quoted price far above normal courier range");
    }
    if (distanceKm > 2000) {
        riskScore = Math.max(riskScore, 0.82);
        fraudFlags.push("Route length unusually large for a single parcel order");
    }
    if (amount / meanRef > 30) {
        riskScore = Math.max(riskScore, 0.82);
        fraudFlags.push("Price vastly above typical relative to model baseline");
    }

    riskScore = Math.min(riskScore, 1.0);
    
    // Determine risk level
    let riskLevel = 'low';
    if (riskScore >= 0.6) riskLevel = 'high';
    else if (riskScore >= 0.3) riskLevel = 'medium';
    
    console.log(`📊 Fallback Fraud Score: ${riskScore} (${riskLevel})`);
    
    return {
        riskScore: riskScore,
        isFraud: riskScore > 0.5,
        riskLevel: riskLevel,
        fraudFlags: fraudFlags,
        method: 'rule_based_fallback'
    };
}

module.exports = {
    checkFraud,
    calculateFraudFallback
};
