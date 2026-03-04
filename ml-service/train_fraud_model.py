"""
Fraud Detection Model Training Script
======================================
Trains a Random Forest Classifier on real-world payment fraud data from Kaggle.

Dataset: Online Payments Fraud Detection Dataset
Source:  https://www.kaggle.com/datasets/rupakroy/online-payments-fraud-detection-dataset
File:   onlinefraud.csv (or PS_20174392719_1491204439457_log.csv)

Features used for training (mapped to courier app context):
    - amount       → Order price
    - type_encoded → Payment method (COD=0, Prepaid=1, Wallet=2)
    - hour         → Hour of order creation (0-23)
    - amount_ratio → How much this amount deviates from average
    - is_high_amount → 1 if amount > 2x average
    - is_unusual_hour → 1 if order placed between 0-5 AM

Target:
    - isFraud (0 or 1)

Usage:
    1. Download dataset from Kaggle and place in ml-service/data/onlinefraud.csv
    2. Run: python train_fraud_model.py
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import LabelEncoder
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

# Paths
DATA_PATH = 'data/onlinefraud.csv'
MODEL_PATH = 'models/fraud_model.pkl'


def load_and_prepare_data():
    """Load and preprocess the Kaggle fraud dataset"""
    
    print("=" * 60)
    print("📊 Loading Fraud Detection Dataset")
    print("=" * 60)
    
    if not os.path.exists(DATA_PATH):
        print(f"\n❌ Dataset not found at: {DATA_PATH}")
        print(f"\n📥 To download the dataset:")
        print(f"   1. Go to: https://www.kaggle.com/datasets/rupakroy/online-payments-fraud-detection-dataset")
        print(f"   2. Download 'onlinefraud.csv'")
        print(f"   3. Place it in: ml-service/data/onlinefraud.csv")
        return None, None, None
    
    # Load dataset
    df = pd.read_csv(DATA_PATH)
    print(f"\n✅ Dataset loaded: {len(df)} records")
    print(f"   Columns: {list(df.columns)}")
    print(f"   Fraud cases: {df['isFraud'].sum()} ({(df['isFraud'].mean()*100):.2f}%)")
    print(f"   Normal cases: {(df['isFraud'] == 0).sum()}")
    
    # --- Feature Engineering ---
    print("\n🔧 Engineering features for courier app context...")
    
    # 1. Encode transaction type → maps to payment method
    #    CASH_OUT → COD (0), PAYMENT → Prepaid (1), TRANSFER → Wallet (2)
    #    DEBIT → Prepaid (1), CASH_IN → COD (0)
    type_mapping = {
        'CASH_OUT': 0,   # Similar to COD
        'CASH_IN': 0,    # Similar to COD
        'PAYMENT': 1,    # Similar to Prepaid
        'DEBIT': 1,      # Similar to Prepaid
        'TRANSFER': 2    # Similar to Wallet
    }
    df['type_encoded'] = df['type'].map(type_mapping)
    
    # 2. Convert step to hour (step represents 1 hour intervals)
    df['hour'] = df['step'] % 24
    
    # 3. Amount ratio - how much this deviates from average
    avg_amount = df['amount'].mean()
    df['amount_ratio'] = df['amount'] / avg_amount
    
    # 4. Is high amount (> 2x average)
    df['is_high_amount'] = (df['amount'] > 2 * avg_amount).astype(int)
    
    # 5. Is unusual hour (0-5 AM)
    df['is_unusual_hour'] = df['hour'].apply(lambda h: 1 if 0 <= h <= 5 else 0)
    
    # 6. Balance change ratio (how much of balance was used)
    df['balance_change_ratio'] = np.where(
        df['oldbalanceOrg'] > 0,
        (df['oldbalanceOrg'] - df['newbalanceOrig']) / df['oldbalanceOrg'],
        0
    )
    df['balance_change_ratio'] = df['balance_change_ratio'].clip(-1, 1)
    
    # Select features for the model
    feature_columns = [
        'amount',
        'type_encoded',
        'hour',
        'amount_ratio',
        'is_high_amount',
        'is_unusual_hour',
        'balance_change_ratio'
    ]
    
    print(f"   Features: {feature_columns}")
    
    # Handle missing values
    df = df.dropna(subset=feature_columns + ['isFraud'])
    
    X = df[feature_columns].values
    y = df['isFraud'].values
    
    print(f"\n📊 Dataset Summary:")
    print(f"   Total samples: {len(X)}")
    print(f"   Features: {len(feature_columns)}")
    print(f"   Fraud ratio: {y.mean()*100:.2f}%")
    print(f"   Average amount: {avg_amount:.2f}")
    
    return X, y, feature_columns


def train_model(X, y, feature_names):
    """Train the fraud detection classifier"""
    
    print("\n" + "=" * 60)
    print("🤖 Training Fraud Detection Model")
    print("=" * 60)
    
    # Split data (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"\n   Training samples: {len(X_train)}")
    print(f"   Testing samples: {len(X_test)}")
    print(f"   Fraud in train: {y_train.sum()} ({y_train.mean()*100:.2f}%)")
    print(f"   Fraud in test: {y_test.sum()} ({y_test.mean()*100:.2f}%)")
    
    # Train Random Forest Classifier
    print("\n   Training Random Forest Classifier...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight='balanced',  # Handle imbalanced fraud data
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\n✅ Model trained successfully!")
    print(f"\n📊 Model Performance:")
    print(f"   Accuracy: {accuracy*100:.2f}%")
    print(f"\n   Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal', 'Fraud']))
    
    print(f"   Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"   [[TN={cm[0][0]}, FP={cm[0][1]}]")
    print(f"    [FN={cm[1][0]}, TP={cm[1][1]}]]")
    
    # Feature importance
    print(f"\n📊 Feature Importance:")
    importances = model.feature_importances_
    for name, importance in sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True):
        bar = "█" * int(importance * 50)
        print(f"   {name:25s} {importance:.4f} {bar}")
    
    return model, accuracy


def save_model(model, feature_names, accuracy):
    """Save the trained model and metadata"""
    
    print(f"\n💾 Saving model to {MODEL_PATH}...")
    
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    
    model_data = {
        'model': model,
        'feature_names': feature_names,
        'model_type': 'RandomForestClassifier',
        'accuracy': accuracy,
        'trained_at': pd.Timestamp.now().isoformat(),
        'description': 'Fraud detection model for courier order payments',
        'dataset': 'Kaggle Online Payments Fraud Detection',
        'features_info': {
            'amount': 'Order price in currency units',
            'type_encoded': 'Payment method: COD=0, Prepaid=1, Wallet=2',
            'hour': 'Hour of order creation (0-23)',
            'amount_ratio': 'Amount / average amount ratio',
            'is_high_amount': '1 if amount > 2x average',
            'is_unusual_hour': '1 if hour is 0-5 AM',
            'balance_change_ratio': 'Ratio of balance changed in transaction'
        }
    }
    
    joblib.dump(model_data, MODEL_PATH)
    print(f"✅ Model saved successfully!")
    
    # Verify
    loaded = joblib.load(MODEL_PATH)
    print(f"   Model type: {loaded['model_type']}")
    print(f"   Features: {loaded['feature_names']}")
    print(f"   Accuracy: {loaded['accuracy']*100:.2f}%")


def main():
    """Main training pipeline"""
    
    print("\n" + "🚨" * 30)
    print("  NEO-CNS FRAUD DETECTION MODEL TRAINING")
    print("🚨" * 30)
    
    # Step 1: Load and prepare data
    X, y, feature_names = load_and_prepare_data()
    
    if X is None:
        print("\n❌ Training aborted: No data available")
        return
    
    # Step 2: Train model
    model, accuracy = train_model(X, y, feature_names)
    
    # Step 3: Save model
    save_model(model, feature_names, accuracy)
    
    # Step 4: Test with sample predictions
    print("\n" + "=" * 60)
    print("🧪 Sample Predictions")
    print("=" * 60)
    
    test_cases = [
        {
            'name': 'Normal order (₹185, Prepaid, 2PM)',
            'features': [185, 1, 14, 185/180000, 0, 0, 0.5]
        },
        {
            'name': 'Suspicious order (₹4500, COD, 3AM)',
            'features': [4500, 0, 3, 4500/180000, 1, 1, 0.9]
        },
        {
            'name': 'Medium risk (₹650, Wallet, 11PM)',
            'features': [650, 2, 23, 650/180000, 0, 0, 0.3]
        }
    ]
    
    for tc in test_cases:
        features = np.array([tc['features']])
        proba = model.predict_proba(features)[0][1]
        label = "🔴 FRAUD" if proba > 0.5 else "🟡 MEDIUM" if proba > 0.3 else "🟢 SAFE"
        print(f"\n   {tc['name']}")
        print(f"   Risk Score: {proba:.4f} → {label}")
    
    print("\n" + "=" * 60)
    print("✅ Fraud Detection Model Training Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
