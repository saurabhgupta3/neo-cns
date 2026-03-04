"""
Neo-CNS ML Prediction API Server
=================================
Flask API that serves ML predictions for the Neo-CNS courier system.

Endpoints:
    POST /predict/eta   - Predict delivery time
    POST /predict/fraud - Detect payment fraud
    GET /health         - Health check
    GET /model/info     - Model information

Usage:
    python app.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
MODEL_PATH = 'models/eta_model.pkl'
FRAUD_MODEL_PATH = 'models/fraud_model.pkl'
PORT = int(os.environ.get('ML_SERVICE_PORT', 5001))

# ETA model
model_data = None
model = None
feature_names = None

# Fraud model
fraud_model_data = None
fraud_model = None
fraud_feature_names = None

def load_model():
    """Load the trained ETA model"""
    global model_data, model, feature_names
    
    if os.path.exists(MODEL_PATH):
        model_data = joblib.load(MODEL_PATH)
        model = model_data['model']
        feature_names = model_data['feature_names']
        print(f"✅ ETA Model loaded from {MODEL_PATH}")
        print(f"   Features: {feature_names}")
        return True
    else:
        print(f"⚠️ ETA Model not found at {MODEL_PATH}")
        print("   Run 'python train_model.py' first to train the model")
        return False

def load_fraud_model():
    """Load the trained fraud detection model"""
    global fraud_model_data, fraud_model, fraud_feature_names
    
    if os.path.exists(FRAUD_MODEL_PATH):
        fraud_model_data = joblib.load(FRAUD_MODEL_PATH)
        fraud_model = fraud_model_data['model']
        fraud_feature_names = fraud_model_data['feature_names']
        print(f"✅ Fraud Model loaded from {FRAUD_MODEL_PATH}")
        print(f"   Features: {fraud_feature_names}")
        return True
    else:
        print(f"⚠️ Fraud Model not found at {FRAUD_MODEL_PATH}")
        print("   Run 'python train_fraud_model.py' first to train the model")
        return False


def calculate_fallback_eta(distance, hour_of_day, traffic_level=2):
    """Fallback ETA calculation when model is not available"""
    # Base speed: 25 km/h in city
    base_time = (distance / 25) * 60  # Convert to minutes
    
    # Traffic factor
    traffic_multiplier = {1: 0.8, 2: 1.0, 3: 1.3, 4: 1.6}
    base_time *= traffic_multiplier.get(traffic_level, 1.0)
    
    # Rush hour factor
    if hour_of_day in [8, 9, 10, 17, 18, 19, 20]:
        base_time *= 1.2
    
    # Minimum 15 minutes for any delivery
    return max(15, round(base_time))


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'eta_model_loaded': model is not None,
        'fraud_model_loaded': fraud_model is not None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/model/info', methods=['GET'])
def model_info():
    """Get model information"""
    if model_data is None:
        return jsonify({
            'success': False,
            'message': 'Model not loaded'
        }), 404
    
    return jsonify({
        'success': True,
        'version': model_data.get('version', 'unknown'),
        'features': feature_names,
        'model_type': type(model).__name__
    })


@app.route('/predict/eta', methods=['POST'])
def predict_eta():
    """
    Predict delivery ETA
    
    IMPORTANT: Distance must be PURE HAVERSINE (straight-line) distance,
    NOT real road distance. This matches the training data which used Haversine.
    
    Request Body:
    {
        "distance": 15.5,          # Haversine distance in km (required)
        "hour_of_day": 14,         # Hour of day 0-23 (optional, default: current hour)
        "traffic_level": 2,        # Traffic 1-4: Low, Medium, High, Jam (optional, default: 2)
        "weather": 1,              # Weather 1-4: Sunny, Cloudy, Rain, Storm (optional, default: 1)
        "weight": 5                # Package weight in kg (optional, used for confidence)
    }
    
    Response:
    {
        "success": true,
        "eta_minutes": 45,
        "eta_formatted": "45 minutes",
        "confidence": 0.85,
        "method": "ml_prediction"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Extract and validate distance
        distance = data.get('distance')
        if distance is None:
            return jsonify({
                'success': False,
                'message': 'Distance is required'
            }), 400
        
        distance = float(distance)
        if distance <= 0:
            return jsonify({
                'success': False,
                'message': 'Distance must be positive'
            }), 400
        
        # Get optional parameters with defaults
        current_hour = datetime.now().hour
        hour_of_day = int(data.get('hour_of_day', current_hour))
        traffic_level = int(data.get('traffic_level', 2))
        weather = int(data.get('weather', 1))
        weight = float(data.get('weight', 1))
        
        # Determine if rush hour
        is_rush_hour = 1 if hour_of_day in [8, 9, 10, 17, 18, 19, 20] else 0
        
        # Use ML model if available
        if model is not None:
            try:
                # Build feature vector based on available features
                feature_values = []
                for feat in feature_names:
                    if feat == 'distance':
                        feature_values.append(distance)
                    elif feat == 'hour_of_day':
                        feature_values.append(hour_of_day)
                    elif feat == 'is_rush_hour':
                        feature_values.append(is_rush_hour)
                    elif feat == 'traffic_encoded':
                        feature_values.append(traffic_level)
                    elif feat == 'weather_encoded':
                        feature_values.append(weather)
                    elif feat == 'vehicle_encoded':
                        feature_values.append(1)  # Default motorcycle
                    else:
                        feature_values.append(0)
                
                # Make prediction
                features = np.array([feature_values])
                eta_minutes = model.predict(features)[0]
                
                # Ensure reasonable bounds
                eta_minutes = max(10, min(eta_minutes, 480))  # 10 min to 8 hours
                
                # Calculate confidence based on feature availability
                confidence = 0.85
                
                method = 'ml_prediction'
                
            except Exception as e:
                print(f"⚠️ ML prediction failed: {e}")
                eta_minutes = calculate_fallback_eta(distance, hour_of_day, traffic_level)
                confidence = 0.6
                method = 'fallback_formula'
        else:
            # Fallback to formula
            eta_minutes = calculate_fallback_eta(distance, hour_of_day, traffic_level)
            confidence = 0.6
            method = 'fallback_formula'
        
        # Format ETA
        eta_minutes = round(eta_minutes)
        if eta_minutes >= 60:
            hours = eta_minutes // 60
            mins = eta_minutes % 60
            if mins > 0:
                eta_formatted = f"{hours}h {mins}m"
            else:
                eta_formatted = f"{hours}h"
        else:
            eta_formatted = f"{eta_minutes}m"
        
        return jsonify({
            'success': True,
            'eta_minutes': eta_minutes,
            'eta_formatted': eta_formatted,
            'confidence': confidence,
            'method': method,
            'input': {
                'distance': distance,
                'hour_of_day': hour_of_day,
                'traffic_level': traffic_level
            }
        })
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': f'Invalid input: {str(e)}'
        }), 400
    except Exception as e:
        print(f"❌ Error in prediction: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500


# ============================================================
# FRAUD DETECTION ENDPOINT
# ============================================================

@app.route('/predict/fraud', methods=['POST'])
def predict_fraud():
    """
    Predict fraud risk for a courier order.
    
    Request Body:
    {
        "amount": 4500,
        "payment_type": "COD",
        "hour": 3
    }
    
    Response:
    {
        "success": true,
        "risk_score": 0.78,
        "is_fraud": true,
        "risk_level": "high",
        "fraud_flags": ["Unusual hour (3 AM)", "High amount"],
        "method": "ml_prediction"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        amount = float(data.get('amount', 0))
        payment_type = data.get('payment_type', 'COD')
        hour = int(data.get('hour', datetime.now().hour))
        
        if amount <= 0:
            return jsonify({'success': False, 'message': 'Valid amount is required'}), 400
        
        # Encode payment type to match training data
        payment_mapping = {'COD': 0, 'Prepaid': 1, 'Wallet': 2}
        type_encoded = payment_mapping.get(payment_type, 0)
        
        # Calculate derived features
        avg_amount = 180000  # From training data average
        amount_ratio = amount / avg_amount
        is_high_amount = 1 if amount > 2 * avg_amount else 0
        is_unusual_hour = 1 if 0 <= hour <= 5 else 0
        balance_change_ratio = min(amount / max(amount * 2, 1), 1.0)  # Approximate
        
        # Prepare feature vector
        features = np.array([[
            amount,
            type_encoded,
            hour,
            amount_ratio,
            is_high_amount,
            is_unusual_hour,
            balance_change_ratio
        ]])
        
        # Generate fraud flags
        fraud_flags = []
        if is_unusual_hour:
            fraud_flags.append(f"Unusual hour ({hour}:00 AM)")
        if is_high_amount:
            fraud_flags.append("Unusually high amount")
        if type_encoded == 0 and amount > 1000:
            fraud_flags.append("High-value COD order")
        if amount_ratio > 5:
            fraud_flags.append(f"Amount {amount_ratio:.1f}x above average")
        
        if fraud_model is not None:
            # ML Prediction
            risk_score = float(fraud_model.predict_proba(features)[0][1])
            is_fraud = bool(risk_score > 0.5)
            method = 'ml_prediction'
            
            print(f"\n🚨 Fraud Check (ML): amount={amount}, type={payment_type}, hour={hour}")
            print(f"   Risk Score: {risk_score:.4f}")
            print(f"   Flags: {fraud_flags}")
        else:
            # Fallback rule-based scoring
            risk_score = 0.0
            if is_unusual_hour:
                risk_score += 0.25
            if is_high_amount:
                risk_score += 0.25
            if type_encoded == 0 and amount > 1000:
                risk_score += 0.15
            if amount_ratio > 5:
                risk_score += 0.2
            risk_score = min(risk_score, 1.0)
            is_fraud = risk_score > 0.5
            method = 'rule_based_fallback'
            
            print(f"\n🚨 Fraud Check (Rules): amount={amount}, type={payment_type}, hour={hour}")
            print(f"   Risk Score: {risk_score:.4f}")
        
        # Determine risk level
        if risk_score >= 0.6:
            risk_level = 'high'
        elif risk_score >= 0.3:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        return jsonify({
            'success': True,
            'risk_score': round(risk_score, 4),
            'is_fraud': is_fraud,
            'risk_level': risk_level,
            'fraud_flags': fraud_flags,
            'method': method,
            'input': {
                'amount': amount,
                'payment_type': payment_type,
                'hour': hour
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Fraud prediction error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Prediction error: {str(e)}'
        }), 500


@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'success': False,
        'message': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500


if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Neo-CNS ML Prediction Service")
    print("=" * 60)
    
    # Load models
    eta_loaded = load_model()
    fraud_loaded = load_fraud_model()
    
    if not eta_loaded:
        print("\n⚠️ ETA: Running with fallback formula")
        print("   Run 'python train_model.py' to train ETA model")
    
    if not fraud_loaded:
        print("\n⚠️ Fraud: Running with rule-based fallback")
        print("   Run 'python train_fraud_model.py' to train fraud model")
    
    print(f"\n🌐 Starting server on http://localhost:{PORT}")
    print("   POST /predict/eta   - Predict delivery time")
    print("   POST /predict/fraud - Detect payment fraud")
    print("   GET  /health        - Health check")
    print("   GET  /model/info    - Model information\n")
    
    app.run(host='0.0.0.0', port=PORT, debug=True)
