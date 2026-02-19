"""
ETA Prediction API Server
=========================
Flask API that serves ETA predictions for the Neo-CNS courier system.

Endpoints:
    POST /predict/eta - Predict delivery time
    GET /health - Health check
    GET /model/info - Model information

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
PORT = int(os.environ.get('ML_SERVICE_PORT', 5001))

# Load model at startup
model_data = None
model = None
feature_names = None

def load_model():
    """Load the trained model"""
    global model_data, model, feature_names
    
    if os.path.exists(MODEL_PATH):
        model_data = joblib.load(MODEL_PATH)
        model = model_data['model']
        feature_names = model_data['feature_names']
        print(f"✅ Model loaded from {MODEL_PATH}")
        print(f"   Features: {feature_names}")
        return True
    else:
        print(f"⚠️ Model not found at {MODEL_PATH}")
        print("   Run 'python train_model.py' first to train the model")
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
        'model_loaded': model is not None,
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
    print("🚀 Neo-CNS ETA Prediction Service")
    print("=" * 60)
    
    # Load model
    model_loaded = load_model()
    
    if not model_loaded:
        print("\n⚠️ Running with fallback formula (no ML model)")
        print("   To use ML predictions, run 'python train_model.py' first\n")
    
    print(f"\n🌐 Starting server on http://localhost:{PORT}")
    print("   POST /predict/eta - Predict delivery time")
    print("   GET /health - Health check")
    print("   GET /model/info - Model information\n")
    
    app.run(host='0.0.0.0', port=PORT, debug=True)
