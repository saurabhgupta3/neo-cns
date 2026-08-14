# ML prediction server

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ============================================================
# CONFIG
# ============================================================

MODEL_PATH = 'models/eta_model.pkl'

# Neo-CNS courier fraud model
COURIER_FRAUD_MODEL_PATH = 'models/courier_fraud_model.pkl'

# Render provides PORT automatically.
# Locally, ML_SERVICE_PORT can still be used.
PORT = int(os.environ.get(
    'PORT',
    os.environ.get('ML_SERVICE_PORT', 5001)
))


# ============================================================
# ETA MODEL
# ============================================================

model_data = None
model = None
feature_names = None


# ============================================================
# COURIER FRAUD MODEL
# ============================================================

courier_fraud_model_data = None
courier_fraud_model = None
courier_fraud_feature_names = None
courier_fraud_train_mean_price = None


# ============================================================
# LOAD ETA MODEL
# ============================================================

def load_model():
    """Load ETA model"""

    global model_data
    global model
    global feature_names

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


# ============================================================
# LOAD COURIER FRAUD MODEL
# ============================================================

def load_courier_fraud_model():
    """Load Neo-CNS courier fraud model"""

    global courier_fraud_model_data
    global courier_fraud_model
    global courier_fraud_feature_names
    global courier_fraud_train_mean_price

    if os.path.exists(COURIER_FRAUD_MODEL_PATH):

        courier_fraud_model_data = joblib.load(
            COURIER_FRAUD_MODEL_PATH
        )

        courier_fraud_model = courier_fraud_model_data['model']

        courier_fraud_feature_names = (
            courier_fraud_model_data['feature_names']
        )

        courier_fraud_train_mean_price = float(
            courier_fraud_model_data.get(
                'train_mean_price',
                500.0
            )
        )

        print(
            f"✅ Courier fraud model loaded from "
            f"{COURIER_FRAUD_MODEL_PATH}"
        )

        print(
            f"   Features: {courier_fraud_feature_names}"
        )

        print(
            f"   train_mean_price: "
            f"{courier_fraud_train_mean_price:.2f}"
        )

        return True

    print(
        f"⚠️ Courier fraud model not found at "
        f"{COURIER_FRAUD_MODEL_PATH}"
    )

    print(
        "   Run: python train_courier_fraud_model.py"
    )

    return False


# ============================================================
# BUILD COURIER FRAUD FEATURES
# ============================================================

def build_courier_fraud_features(
    amount,
    payment_type,
    hour,
    distance_km,
    weight_kg,
    mean_price
):
    """Feature vector aligned with training model."""

    payment_mapping = {
        'COD': 0,
        'Prepaid': 1,
        'Wallet': 2
    }

    pe = payment_mapping.get(payment_type, 0)

    mp = max(float(mean_price), 1.0)

    price = float(amount)

    hr = int(hour) % 24

    ratio = price / mp

    high = 1 if price > 2.0 * mp else 0

    unusual = 1 if 0 <= hr <= 5 else 0

    return np.array([[
        float(distance_km),
        float(weight_kg),
        price,
        pe,
        hr,
        ratio,
        high,
        unusual
    ]])


# ============================================================
# OOD FRAUD BOOST
# ============================================================

def apply_ood_fraud_boost(
    distance_km,
    weight_kg,
    amount,
    mean_price,
    risk_score,
    fraud_flags
):
    """
    Boost fraud score for extremely unusual inputs.
    """

    mean_price = max(float(mean_price), 1.0)

    ratio = amount / mean_price

    ood_reasons = []

    if weight_kg > 250:
        ood_reasons.append(
            "Weight far above typical parcel range"
        )

    if amount > 20000:
        ood_reasons.append(
            "Quoted price far above normal courier range"
        )

    if distance_km > 2000:
        ood_reasons.append(
            "Route length unusually large for a single parcel order"
        )

    if ratio > 30:
        ood_reasons.append(
            "Price vastly above typical relative to model baseline"
        )

    if not ood_reasons:
        return risk_score, fraud_flags

    for reason in ood_reasons:

        if reason not in fraud_flags:
            fraud_flags.append(reason)

    boosted = max(float(risk_score), 0.82)

    return boosted, fraud_flags


# ============================================================
# RULE BASED FRAUD FALLBACK
# ============================================================

def courier_fraud_rule_fallback(
    amount,
    payment_type,
    hour,
    distance_km,
    weight_kg,
    mean_price
):
    """Rule fallback when courier model file is missing."""

    payment_mapping = {
        'COD': 0,
        'Prepaid': 1,
        'Wallet': 2
    }

    pe = payment_mapping.get(payment_type, 0)

    mp = max(float(mean_price), 1.0)

    price = float(amount)

    hr = int(hour) % 24

    ratio = price / mp

    high = 1 if price > 2.0 * mp else 0

    unusual = 1 if 0 <= hr <= 5 else 0

    risk_score = 0.0

    fraud_flags = []

    if unusual:

        risk_score += 0.22

        fraud_flags.append(
            f"Unusual hour ({hr}:00)"
        )

    if high:

        risk_score += 0.18

        fraud_flags.append(
            "Price well above training average"
        )

    if pe == 0 and price > 1200:

        risk_score += 0.12

        fraud_flags.append(
            "High-value COD order"
        )

    if float(distance_km) > 400 and price > 2000:

        risk_score += 0.1

        fraud_flags.append(
            "Long-haul high-value order"
        )

    if float(weight_kg) > 80 and pe == 0:

        risk_score += 0.08

        fraud_flags.append(
            "Heavy package on COD"
        )

    if ratio > 2.5:

        risk_score += 0.12

        fraud_flags.append(
            f"Price {ratio:.1f}x vs typical average"
        )

    risk_score = min(risk_score, 1.0)

    return risk_score, fraud_flags


# ============================================================
# ETA MODEL CONFIG
# ============================================================

ML_MODEL_MAX_RELIABLE_DISTANCE = 50


# ============================================================
# FALLBACK ETA
# ============================================================

def calculate_fallback_eta(
    distance,
    hour_of_day,
    traffic_level=2
):
    """Fallback ETA calculation."""

    if distance <= 20:

        base_time = (distance / 25) * 60

    elif distance <= 100:

        city_time = (20 / 25) * 60

        highway_time = ((distance - 20) / 40) * 60

        base_time = city_time + highway_time

    elif distance <= 500:

        city_time = (20 / 25) * 60

        highway_time = ((distance - 20) / 55) * 60

        rest_stops = (distance // 200) * 30

        base_time = (
            city_time
            + highway_time
            + rest_stops
            + 30
        )

    else:

        city_time = (20 / 25) * 60

        highway_time = ((distance - 20) / 55) * 60

        rest_stops = (distance // 200) * 30

        overnight_stops = (distance // 700) * 480

        base_time = (
            city_time
            + highway_time
            + rest_stops
            + overnight_stops
            + 60
        )

    traffic_multiplier = {
        1: 0.9,
        2: 1.0,
        3: 1.15,
        4: 1.3
    }

    if distance <= 50:

        base_time *= traffic_multiplier.get(
            traffic_level,
            1.0
        )

    else:

        city_factor = traffic_multiplier.get(
            traffic_level,
            1.0
        )

        base_time = (
            base_time * 0.3 * city_factor
            + base_time * 0.7
        )

    if (
        hour_of_day in [
            8,
            9,
            10,
            17,
            18,
            19,
            20
        ]
        and distance <= 50
    ):

        base_time *= 1.2

    return max(
        15,
        round(base_time)
    )


# ============================================================
# HEALTH
# ============================================================

@app.route('/health', methods=['GET'])
def health_check():

    return jsonify({

        'status': 'healthy',

        'eta_model_loaded': (
            model is not None
        ),

        'courier_fraud_model_loaded': (
            courier_fraud_model is not None
        ),

        'fraud_model_loaded': (
            courier_fraud_model is not None
        ),

        'timestamp': datetime.now().isoformat()

    })


# ============================================================
# MODEL INFO
# ============================================================

@app.route('/model/info', methods=['GET'])
def model_info():

    if model_data is None:

        return jsonify({
            'success': False,
            'message': 'Model not loaded'
        }), 404

    return jsonify({

        'success': True,

        'version': model_data.get(
            'version',
            'unknown'
        ),

        'features': feature_names,

        'model_type': type(model).__name__

    })


# ============================================================
# ETA PREDICTION
# ============================================================

@app.route('/predict/eta', methods=['POST'])
def predict_eta():

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

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

        current_hour = datetime.now().hour

        hour_of_day = int(
            data.get(
                'hour_of_day',
                current_hour
            )
        )

        traffic_level = int(
            data.get(
                'traffic_level',
                2
            )
        )

        weather = int(
            data.get(
                'weather',
                1
            )
        )

        weight = float(
            data.get(
                'weight',
                1
            )
        )

        is_rush_hour = (
            1
            if hour_of_day in [
                8,
                9,
                10,
                17,
                18,
                19,
                20
            ]
            else 0
        )

        # ====================================================
        # ML MODEL
        # ====================================================

        if (
            model is not None
            and distance <= ML_MODEL_MAX_RELIABLE_DISTANCE
        ):

            try:

                feature_values = []

                for feat in feature_names:

                    if feat == 'distance':

                        feature_values.append(
                            distance
                        )

                    elif feat == 'hour_of_day':

                        feature_values.append(
                            hour_of_day
                        )

                    elif feat == 'is_rush_hour':

                        feature_values.append(
                            is_rush_hour
                        )

                    elif feat == 'traffic_encoded':

                        feature_values.append(
                            traffic_level
                        )

                    elif feat == 'weather_encoded':

                        feature_values.append(
                            weather
                        )

                    elif feat == 'vehicle_encoded':

                        feature_values.append(1)

                    else:

                        feature_values.append(0)

                features = np.array([
                    feature_values
                ])

                eta_minutes = model.predict(
                    features
                )[0]

                eta_minutes = max(
                    10,
                    min(
                        eta_minutes,
                        180
                    )
                )

                confidence = 0.85

                method = 'ml_prediction'

            except Exception as e:

                print(
                    f"⚠️ ML prediction failed: {e}"
                )

                eta_minutes = calculate_fallback_eta(
                    distance,
                    hour_of_day,
                    traffic_level
                )

                confidence = 0.6

                method = 'fallback_formula'

        else:

            if distance > ML_MODEL_MAX_RELIABLE_DISTANCE:

                print(
                    f"📏 Distance {distance:.1f} km "
                    f"exceeds ML model range "
                    f"({ML_MODEL_MAX_RELIABLE_DISTANCE} km), "
                    f"using formula"
                )

            eta_minutes = calculate_fallback_eta(
                distance,
                hour_of_day,
                traffic_level
            )

            confidence = (
                0.7
                if distance <= 200
                else 0.6
            )

            method = 'distance_formula'

        # ====================================================
        # FORMAT ETA
        # ====================================================

        eta_minutes = round(
            eta_minutes
        )

        if eta_minutes >= 1440:

            days = eta_minutes // 1440

            remaining_hours = (
                eta_minutes % 1440
            ) // 60

            if remaining_hours > 0:

                eta_formatted = (
                    f"{days}d "
                    f"{remaining_hours}h"
                )

            else:

                eta_formatted = (
                    f"{days}d"
                )

        elif eta_minutes >= 60:

            hours = eta_minutes // 60

            mins = eta_minutes % 60

            if mins > 0:

                eta_formatted = (
                    f"{hours}h "
                    f"{mins}m"
                )

            else:

                eta_formatted = (
                    f"{hours}h"
                )

        else:

            eta_formatted = (
                f"{eta_minutes}m"
            )

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

        print(
            f"❌ Error in prediction: {e}"
        )

        return jsonify({

            'success': False,

            'message': 'Internal server error'

        }), 500


# ============================================================
# FRAUD PREDICTION
# ============================================================

@app.route('/predict/fraud', methods=['POST'])
def predict_fraud():

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

        amount = float(
            data.get(
                'amount',
                0
            )
        )

        payment_type = data.get(
            'payment_type',
            'COD'
        )

        hour = int(
            data.get(
                'hour',
                datetime.now().hour
            )
        )

        distance_km = float(
            data.get(
                'distance_km',
                data.get(
                    'distance',
                    0
                )
            )
        )

        weight_kg = float(
            data.get(
                'weight_kg',
                data.get(
                    'weight',
                    0
                )
            )
        )

        if amount <= 0:

            return jsonify({
                'success': False,
                'message': 'Valid amount is required'
            }), 400

        if (
            distance_km <= 0
            or weight_kg <= 0
        ):

            return jsonify({
                'success': False,
                'message': (
                    'distance_km and '
                    'weight_kg must be positive'
                )
            }), 400

        mean_price = (
            courier_fraud_train_mean_price
            if courier_fraud_train_mean_price
            else 500.0
        )

        features = build_courier_fraud_features(

            amount,

            payment_type,

            hour,

            distance_km,

            weight_kg,

            mean_price

        )

        fraud_flags = []

        hr = int(hour) % 24

        if 0 <= hr <= 5:

            fraud_flags.append(
                f"Unusual hour ({hr}:00)"
            )

        if amount > 2.0 * mean_price:

            fraud_flags.append(
                "Price well above training average"
            )

        pe = {
            'COD': 0,
            'Prepaid': 1,
            'Wallet': 2
        }.get(
            payment_type,
            0
        )

        if pe == 0 and amount > 1200:

            fraud_flags.append(
                "High-value COD order"
            )

        if (
            amount
            / max(mean_price, 1.0)
            > 2.5
        ):

            fraud_flags.append(
                f"Price "
                f"{amount / mean_price:.1f}x "
                f"vs typical average"
            )

        if (
            distance_km > 400
            and amount > 2000
        ):

            fraud_flags.append(
                "Long-haul high-value order"
            )

        if (
            weight_kg > 80
            and pe == 0
        ):

            fraud_flags.append(
                "Heavy package on COD"
            )

        # ====================================================
        # ML MODEL
        # ====================================================

        if courier_fraud_model is not None:

            risk_score = float(
                courier_fraud_model
                .predict_proba(features)[0][1]
            )

            is_fraud = bool(
                risk_score > 0.5
            )

            method = (
                'courier_ml_prediction'
            )

            print(
                f"\n[Fraud ML] "
                f"price={amount}, "
                f"pay={payment_type}, "
                f"h={hr}, "
                f"d={distance_km}, "
                f"w={weight_kg} "
                f"-> {risk_score:.4f}"
            )

        else:

            risk_score, fb_flags = (
                courier_fraud_rule_fallback(

                    amount,

                    payment_type,

                    hour,

                    distance_km,

                    weight_kg,

                    mean_price

                )
            )

            fraud_flags = list(
                dict.fromkeys(
                    fraud_flags + fb_flags
                )
            )

            is_fraud = bool(
                risk_score > 0.5
            )

            method = (
                'rule_based_fallback'
            )

            print(
                f"\n[Fraud rules] "
                f"price={amount} "
                f"-> {risk_score:.4f}"
            )

        # ====================================================
        # OOD BOOST
        # ====================================================

        risk_score, fraud_flags = (
            apply_ood_fraud_boost(

                distance_km,

                weight_kg,

                amount,

                mean_price,

                risk_score,

                fraud_flags

            )
        )

        is_fraud = bool(
            risk_score > 0.5
        )

        # ====================================================
        # RISK LEVEL
        # ====================================================

        if risk_score >= 0.6:

            risk_level = 'high'

        elif risk_score >= 0.3:

            risk_level = 'medium'

        else:

            risk_level = 'low'

        fraud_flags = list(
            dict.fromkeys(
                fraud_flags
            )
        )

        return jsonify({

            'success': True,

            'risk_score': round(
                risk_score,
                4
            ),

            'is_fraud': is_fraud,

            'risk_level': risk_level,

            'fraud_flags': fraud_flags,

            'method': method,

            'input': {

                'amount': amount,

                'payment_type': payment_type,

                'hour': hour,

                'distance_km': distance_km,

                'weight_kg': weight_kg

            }

        }), 200

    except Exception as e:

        print(
            f"❌ Fraud prediction error: "
            f"{str(e)}"
        )

        return jsonify({

            'success': False,

            'message': (
                f'Prediction error: {str(e)}'
            )

        }), 500


# ============================================================
# 404 HANDLER
# ============================================================

@app.errorhandler(404)
def not_found(e):

    return jsonify({

        'success': False,

        'message': 'Endpoint not found'

    }), 404


# ============================================================
# 500 HANDLER
# ============================================================

@app.errorhandler(500)
def internal_error(e):

    return jsonify({

        'success': False,

        'message': 'Internal server error'

    }), 500


# ============================================================
# LOAD MODELS
# ============================================================

# IMPORTANT:
# These must be outside __main__ because Gunicorn imports
# this file using: gunicorn app:app

eta_loaded = load_model()

fraud_loaded = load_courier_fraud_model()

if not eta_loaded:

    print(
        "\n⚠️ ETA: Running with fallback formula"
    )

    print(
        "   Run 'python train_model.py' "
        "to train the ETA model"
    )

if not fraud_loaded:

    print(
        "\n⚠️ Courier fraud: "
        "Running with rule-based fallback"
    )

    print(
        "   Run 'python train_courier_fraud_model.py' "
        "to train courier model"
    )


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================

if __name__ == '__main__':

    print("=" * 60)

    print(
        "🚀 Neo-CNS ML Prediction Service"
    )

    print("=" * 60)

    print(
        f"\n🌐 Starting server on "
        f"http://localhost:{PORT}"
    )

    print(
        "   POST /predict/eta   - "
        "Predict delivery time"
    )

    print(
        "   POST /predict/fraud - "
        "Detect payment fraud"
    )

    print(
        "   GET  /health        - "
        "Health check"
    )

    print(
        "   GET  /model/info    - "
        "Model information\n"
    )

    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=True
    )