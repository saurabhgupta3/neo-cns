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
 * @param {string} params.paymentMethod - COD, Prepaid, or Wallet
 * @param {number} [params.hour] - Hour of order creation (0-23)
 * @returns {Promise<Object>} Fraud assessment result
 */
async function checkFraud(params) {
    const { amount, paymentMethod, hour } = params;
    
    const currentHour = hour ?? new Date().getHours();
    
    console.log(`\n🚨 Checking fraud risk:`);
    console.log(`   Amount: ₹${amount}`);
    console.log(`   Payment: ${paymentMethod}`);
    console.log(`   Hour: ${currentHour}`);
    
    try {
        // Try ML service first
        const response = await axios.post(
            `${ML_SERVICE_URL}/predict/fraud`,
            {
                amount: amount,
                payment_type: paymentMethod || 'COD',
                hour: currentHour
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
        
        return calculateFraudFallback(amount, paymentMethod, currentHour);
    }
}

/**
 * Fallback rule-based fraud scoring
 */
function calculateFraudFallback(amount, paymentMethod, hour) {
    let riskScore = 0.0;
    const fraudFlags = [];
    
    // Check unusual hour (0-5 AM)
    if (hour >= 0 && hour <= 5) {
        riskScore += 0.25;
        fraudFlags.push(`Unusual hour (${hour}:00 AM)`);
    }
    
    // Check high amount for COD
    if (paymentMethod === 'COD' && amount > 1000) {
        riskScore += 0.15;
        fraudFlags.push('High-value COD order');
    }
    
    // Check very high amount
    if (amount > 5000) {
        riskScore += 0.25;
        fraudFlags.push('Unusually high amount');
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
