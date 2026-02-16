"""
ETA Prediction Model Training Script
=====================================
This script trains a Random Forest model on real delivery data from Kaggle.

Dataset: Food Delivery Time Prediction
Source: https://www.kaggle.com/datasets/gauravmalik26/food-delivery-dataset

Usage:
    1. Download the dataset from Kaggle
    2. Place 'deliverytime.csv' in the 'data/' folder
    3. Run: python train_model.py
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

# Paths
DATA_PATH = 'data/deliverytime.csv'
MODEL_PATH = 'models/eta_model.pkl'
ENCODERS_PATH = 'models/encoders.pkl'

def load_and_prepare_data():
    """Load and preprocess the Kaggle delivery dataset"""
    
    print("📂 Loading dataset...")
    
    if not os.path.exists(DATA_PATH):
        print(f"❌ Dataset not found at {DATA_PATH}")
        print("📥 Please download from: https://www.kaggle.com/datasets/gauravmalik26/food-delivery-dataset")
        print("   Place 'deliverytime.csv' in the 'data/' folder")
        return None, None, None
    
    df = pd.read_csv(DATA_PATH)
    print(f"✅ Loaded {len(df)} records")
    
    # Display dataset info
    print("\n📊 Dataset Columns:")
    print(df.columns.tolist())
    
    # Clean column names (remove extra spaces)
    df.columns = df.columns.str.strip()
    
    # Feature Engineering
    print("\n🔧 Engineering features...")
    
    # Extract hour from order time
    if 'Time_Orderd' in df.columns:
        # Handle time format (HH:MM:SS or HH:MM)
        df['Time_Orderd'] = df['Time_Orderd'].astype(str)
        df['hour_of_day'] = df['Time_Orderd'].apply(lambda x: int(x.split(':')[0]) if ':' in str(x) else 12)
    else:
        df['hour_of_day'] = 12  # Default to noon
    
    # Create is_rush_hour feature
    df['is_rush_hour'] = df['hour_of_day'].apply(lambda x: 1 if x in [8, 9, 10, 17, 18, 19, 20] else 0)
    
    # Create is_weekend feature (if date available)
    df['is_weekend'] = 0  # Default to weekday
    
    # Encode categorical variables
    encoders = {}
    
    # Road traffic density
    if 'Road_traffic_density' in df.columns:
        df['Road_traffic_density'] = df['Road_traffic_density'].str.strip()
        traffic_map = {'Low': 1, 'Medium': 2, 'High': 3, 'Jam': 4}
        df['traffic_encoded'] = df['Road_traffic_density'].map(traffic_map).fillna(2)
    else:
        df['traffic_encoded'] = 2
    
    # Weather conditions
    if 'Weatherconditions' in df.columns:
        df['Weatherconditions'] = df['Weatherconditions'].str.strip().str.replace('conditions ', '')
        weather_map = {'Sunny': 1, 'Cloudy': 2, 'Windy': 2, 'Fog': 3, 'Sandstorms': 3, 'Stormy': 4}
        df['weather_encoded'] = df['Weatherconditions'].map(weather_map).fillna(1)
    else:
        df['weather_encoded'] = 1
    
    # Vehicle type
    if 'Type_of_vehicle' in df.columns:
        vehicle_map = {'motorcycle': 1, 'scooter': 1, 'electric_scooter': 1, 'bicycle': 2}
        df['vehicle_encoded'] = df['Type_of_vehicle'].str.lower().map(vehicle_map).fillna(1)
    else:
        df['vehicle_encoded'] = 1
    
    # Clean target variable (Time_taken)
    target_col = None
    for col in df.columns:
        if 'time_taken' in col.lower() or 'timetaken' in col.lower():
            target_col = col
            break
    
    if target_col is None:
        print("❌ Could not find target column (Time_taken)")
        return None, None, None
    
    # Extract numeric value from target (e.g., "(min) 25" -> 25)
    df['eta_minutes'] = df[target_col].astype(str).str.extract('(\d+)').astype(float)
    df = df.dropna(subset=['eta_minutes'])
    
    # Clean distance column
    if 'Delivery_location_latitude' in df.columns and 'Restaurant_latitude' in df.columns:
        # Calculate distance if coordinates available
        from math import radians, cos, sin, sqrt, atan2
        
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371  # Earth's radius in km
            lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            return R * c
        
        df['distance'] = df.apply(lambda row: haversine(
            row['Restaurant_latitude'], row['Restaurant_longitude'],
            row['Delivery_location_latitude'], row['Delivery_location_longitude']
        ), axis=1)
    
    # Select features for training
    feature_cols = ['distance', 'hour_of_day', 'is_rush_hour', 'traffic_encoded', 'weather_encoded', 'vehicle_encoded']
    
    # Filter columns that exist
    available_features = [col for col in feature_cols if col in df.columns]
    
    print(f"\n📋 Features used: {available_features}")
    
    # Remove rows with missing values
    df_clean = df[available_features + ['eta_minutes']].dropna()
    print(f"✅ Clean records: {len(df_clean)}")
    
    X = df_clean[available_features]
    y = df_clean['eta_minutes']
    
    return X, y, available_features


def train_model(X, y, feature_names):
    """Train the ETA prediction model"""
    
    print("\n🎯 Training model...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"   Training samples: {len(X_train)}")
    print(f"   Testing samples: {len(X_test)}")
    
    # Train Random Forest
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print("\n📊 Model Performance:")
    print(f"   MAE (Mean Absolute Error): {mae:.2f} minutes")
    print(f"   RMSE (Root Mean Square Error): {rmse:.2f} minutes")
    print(f"   R² Score: {r2:.4f}")
    
    # Cross-validation
    cv_scores = cross_val_score(model, X, y, cv=5, scoring='neg_mean_absolute_error')
    print(f"   Cross-Validation MAE: {-cv_scores.mean():.2f} ± {cv_scores.std():.2f}")
    
    # Feature importance
    print("\n🔍 Feature Importance:")
    importances = sorted(zip(feature_names, model.feature_importances_), key=lambda x: x[1], reverse=True)
    for feat, imp in importances:
        print(f"   {feat}: {imp:.4f}")
    
    return model


def save_model(model, feature_names):
    """Save the trained model and metadata"""
    
    print("\n💾 Saving model...")
    
    # Save model with metadata
    model_data = {
        'model': model,
        'feature_names': feature_names,
        'version': '1.0.0'
    }
    
    joblib.dump(model_data, MODEL_PATH)
    print(f"✅ Model saved to {MODEL_PATH}")
    
    # Print model size
    size_mb = os.path.getsize(MODEL_PATH) / (1024 * 1024)
    print(f"   Model size: {size_mb:.2f} MB")


def main():
    print("=" * 60)
    print("🚀 ETA Prediction Model Training")
    print("=" * 60)
    
    # Load data
    X, y, feature_names = load_and_prepare_data()
    
    if X is None:
        return
    
    # Train model
    model = train_model(X, y, feature_names)
    
    # Save model
    save_model(model, feature_names)
    
    print("\n" + "=" * 60)
    print("✅ Training Complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Run the Flask API: python app.py")
    print("2. Test prediction: curl -X POST http://localhost:5000/predict/eta -H 'Content-Type: application/json' -d '{\"distance\": 10, \"hour_of_day\": 14}'")


if __name__ == "__main__":
    main()
