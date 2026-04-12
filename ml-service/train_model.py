# ETA model training

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

# file paths
DATA_PATH = 'D:/code/Projects/ml-data/deliverytime.csv'
MODEL_PATH = 'models/eta_model.pkl'
ENCODERS_PATH = 'models/encoders.pkl'

def load_and_prepare_data():
    """Prepare dataset"""
    
    print("📂 Loading dataset...")
    
    if not os.path.exists(DATA_PATH):
        print(f"❌ Dataset not found at {DATA_PATH}")
        print("📥 Please download from: https://www.kaggle.com/datasets/gauravmalik26/food-delivery-dataset")
        print("   Place 'deliverytime.csv' in 'D:/code/Projects/ml-data/'")
        return None, None, None
    
    df = pd.read_csv(DATA_PATH)
    print(f"✅ Loaded {len(df)} records")
    
    # dataset info
    print("\n📊 Dataset Columns:")
    print(df.columns.tolist())
    
    # clean columns
    df.columns = df.columns.str.strip()
    
    # feature engineering
    print("\n🔧 Engineering features...")
    
    # extract hour
    if 'Time_Orderd' in df.columns:
        # parse time
        df['Time_Orderd'] = df['Time_Orderd'].astype(str)
        df['hour_of_day'] = df['Time_Orderd'].apply(lambda x: int(x.split(':')[0]) if ':' in str(x) else 12)
    else:
        df['hour_of_day'] = 12  # Default to noon
    
    # rush hour
    df['is_rush_hour'] = df['hour_of_day'].apply(lambda x: 1 if x in [8, 9, 10, 17, 18, 19, 20] else 0)
    
    # weekend flag
    df['is_weekend'] = 0  # Default to weekday
    
    # encode categoricals
    encoders = {}
    
    # traffic density
    if 'Road_traffic_density' in df.columns:
        df['Road_traffic_density'] = df['Road_traffic_density'].str.strip()
        traffic_map = {'Low': 1, 'Medium': 2, 'High': 3, 'Jam': 4}
        df['traffic_encoded'] = df['Road_traffic_density'].map(traffic_map).fillna(2)
    else:
        df['traffic_encoded'] = 2
    
    # weather conditions
    if 'Weatherconditions' in df.columns:
        df['Weatherconditions'] = df['Weatherconditions'].str.strip().str.replace('conditions ', '')
        weather_map = {'Sunny': 1, 'Cloudy': 2, 'Windy': 2, 'Fog': 3, 'Sandstorms': 3, 'Stormy': 4}
        df['weather_encoded'] = df['Weatherconditions'].map(weather_map).fillna(1)
    else:
        df['weather_encoded'] = 1
    
    # vehicle type
    if 'Type_of_vehicle' in df.columns:
        vehicle_map = {'motorcycle': 1, 'scooter': 1, 'electric_scooter': 1, 'bicycle': 2}
        df['vehicle_encoded'] = df['Type_of_vehicle'].str.lower().map(vehicle_map).fillna(1)
    else:
        df['vehicle_encoded'] = 1
    
    # clean target
    target_col = None
    for col in df.columns:
        if 'time_taken' in col.lower() or 'timetaken' in col.lower():
            target_col = col
            break
    
    if target_col is None:
        print("❌ Could not find target column (Time_taken)")
        return None, None, None
    
    # extract numeric
    df['eta_minutes'] = df[target_col].astype(str).str.extract('(\d+)').astype(float)
    df = df.dropna(subset=['eta_minutes'])
    
    # calc distance
    if 'Delivery_location_latitude' in df.columns and 'Restaurant_latitude' in df.columns:
        # haversine distance
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
    
    # select features
    feature_cols = ['distance', 'hour_of_day', 'is_rush_hour', 'traffic_encoded', 'weather_encoded', 'vehicle_encoded']
    
    # filter available
    available_features = [col for col in feature_cols if col in df.columns]
    
    print(f"\n📋 Features used: {available_features}")
    
    # remove nulls
    df_clean = df[available_features + ['eta_minutes']].dropna()
    print(f"✅ Clean records: {len(df_clean)}")
    
    X = df_clean[available_features]
    y = df_clean['eta_minutes']
    
    return X, y, available_features


def train_model(X, y, feature_names):
    """Train ETA model"""
    
    print("\n🎯 Training model...")
    
    # split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"   Training samples: {len(X_train)}")
    print(f"   Testing samples: {len(X_test)}")
    
    # train forest
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # evaluate model
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print("\n📊 Model Performance:")
    print(f"   MAE (Mean Absolute Error): {mae:.2f} minutes")
    print(f"   RMSE (Root Mean Square Error): {rmse:.2f} minutes")
    print(f"   R² Score: {r2:.4f}")
    
    # cross validate
    cv_scores = cross_val_score(model, X, y, cv=5, scoring='neg_mean_absolute_error')
    print(f"   Cross-Validation MAE: {-cv_scores.mean():.2f} ± {cv_scores.std():.2f}")
    
    # feature importance
    print("\n🔍 Feature Importance:")
    importances = sorted(zip(feature_names, model.feature_importances_), key=lambda x: x[1], reverse=True)
    for feat, imp in importances:
        print(f"   {feat}: {imp:.4f}")
    
    return model


def save_model(model, feature_names):
    """Save trained model"""
    
    print("\n💾 Saving model...")
    
    # save with metadata
    model_data = {
        'model': model,
        'feature_names': feature_names,
        'version': '1.0.0'
    }
    
    joblib.dump(model_data, MODEL_PATH)
    print(f"✅ Model saved to {MODEL_PATH}")
    
    # print size
    size_mb = os.path.getsize(MODEL_PATH) / (1024 * 1024)
    print(f"   Model size: {size_mb:.2f} MB")


def main():
    print("=" * 60)
    print("🚀 ETA Prediction Model Training")
    print("=" * 60)
    
    # load data
    X, y, feature_names = load_and_prepare_data()
    
    if X is None:
        return
    
    # train model
    model = train_model(X, y, feature_names)
    
    # save model
    save_model(model, feature_names)
    
    print("\n" + "=" * 60)
    print("✅ Training Complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Run the Flask API: python app.py")
    print("2. Test prediction: curl -X POST http://localhost:5000/predict/eta -H 'Content-Type: application/json' -d '{\"distance\": 10, \"hour_of_day\": 14}'")


if __name__ == "__main__":
    main()
