# 🤖 ML Service - ETA Prediction

Machine Learning service for predicting delivery ETA in the Neo-CNS courier system.

## 📋 Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## 🚀 Quick Start

### 1. Create Virtual Environment (Recommended)

```bash
cd ml-service
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Download Training Data

1. Go to: https://www.kaggle.com/datasets/gauravmalik26/food-delivery-dataset
2. Download `deliverytime.csv`
3. Place it in `ml-service/data/deliverytime.csv`

### 4. Train the Model

```bash
python train_model.py
```

Expected output:
```
📂 Loading dataset...
✅ Loaded 45593 records
🔧 Engineering features...
🎯 Training model...
📊 Model Performance:
   MAE: 5.23 minutes
   R² Score: 0.82
💾 Model saved to models/eta_model.pkl
```

### 5. Start the API Server

```bash
python app.py
```

Server runs on: `http://localhost:5000`

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Get Model Info
```
GET /model/info
```

### Predict ETA
```
POST /predict/eta
Content-Type: application/json

{
    "distance": 15.5,
    "hour_of_day": 14,
    "traffic_level": 2
}
```

Response:
```json
{
    "success": true,
    "eta_minutes": 45,
    "eta_formatted": "45m",
    "confidence": 0.85,
    "method": "ml_prediction"
}
```

## 📊 Features Used

| Feature | Description | Range |
|---------|-------------|-------|
| `distance` | Distance in km | 0-500 |
| `hour_of_day` | Hour of order | 0-23 |
| `is_rush_hour` | Rush hour flag | 0, 1 |
| `traffic_encoded` | Traffic level | 1-4 |
| `weather_encoded` | Weather condition | 1-4 |

## 🧠 Model Details

- **Algorithm**: Random Forest Regressor
- **Trained on**: ~45,000 real delivery records
- **MAE**: ~5 minutes
- **R² Score**: ~0.82

## 📁 Project Structure

```
ml-service/
├── app.py               # Flask API server
├── train_model.py       # Model training script
├── requirements.txt     # Python dependencies
├── README.md           # This file
├── data/
│   └── deliverytime.csv # Training data (download from Kaggle)
└── models/
    └── eta_model.pkl    # Trained model
```

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ML_SERVICE_PORT` | 5000 | Port for Flask server |

## 🧪 Test the API

```bash
# Health check
curl http://localhost:5000/health

# Predict ETA
curl -X POST http://localhost:5000/predict/eta \
  -H "Content-Type: application/json" \
  -d '{"distance": 10, "hour_of_day": 14}'
```

## 📝 Notes

- The service falls back to a formula-based calculation if the ML model is not trained
- Model needs to be retrained periodically with new data for better accuracy
- Traffic level: 1=Low, 2=Medium, 3=High, 4=Jam
