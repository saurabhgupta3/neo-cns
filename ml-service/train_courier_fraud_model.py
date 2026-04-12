"""
Train Neo-CNS courier fraud model on data/courier_fraud_combined.csv.

Saves models/courier_fraud_model.pkl (RandomForest on distance, weight, price,
payment, hour + derived features). Does not use legacy fraud_model.pkl.
"""

import os
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.model_selection import train_test_split

warnings.filterwarnings("ignore")

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(HERE, "data", "courier_fraud_combined.csv")
MODEL_PATH = os.path.join(HERE, "models", "courier_fraud_model.pkl")

PAYMENT_MAP = {"COD": 0, "Prepaid": 1, "Wallet": 2}

FEATURE_ORDER = [
    "distance_km",
    "weight_kg",
    "price",
    "payment_encoded",
    "order_hour",
    "price_ratio",
    "is_high_price",
    "is_unusual_hour",
]


def engineer_features(df: pd.DataFrame, mean_price: float) -> pd.DataFrame:
    pay = df["payment_method"].map(PAYMENT_MAP).fillna(0).astype(int)
    price = df["price"].astype(float)
    hour = df["order_hour"].astype(int).clip(0, 23)
    ratio = price / max(mean_price, 1.0)
    high = (price > 2.0 * mean_price).astype(int)
    unusual = ((hour >= 0) & (hour <= 5)).astype(int)
    out = pd.DataFrame(
        {
            "distance_km": df["distance_km"].astype(float),
            "weight_kg": df["weight_kg"].astype(float),
            "price": price,
            "payment_encoded": pay,
            "order_hour": hour,
            "price_ratio": ratio,
            "is_high_price": high,
            "is_unusual_hour": unusual,
        }
    )
    return out


def main():
    print("=" * 60)
    print("Courier fraud model (combined CSV)")
    print("=" * 60)

    if not os.path.isfile(DATA_PATH):
        print(f"Missing dataset: {DATA_PATH}")
        print("Run: python build_courier_fraud_dataset.py")
        return 1

    df = pd.read_csv(DATA_PATH)
    need = {"distance_km", "weight_kg", "price", "payment_method", "order_hour", "is_fraud"}
    if not need.issubset(df.columns):
        print(f"CSV must contain columns: {sorted(need)}")
        return 1

    df = df.dropna(subset=list(need))
    y = df["is_fraud"].astype(int).clip(0, 1).values

    # Mean price from training split only (saved for inference)
    X_train_df, X_test_df, y_train, y_test = train_test_split(
        df, y, test_size=0.2, random_state=42, stratify=y
    )
    train_mean_price = float(X_train_df["price"].mean())
    if train_mean_price <= 0:
        train_mean_price = 1.0

    X_train = engineer_features(X_train_df.reset_index(drop=True), train_mean_price)[
        FEATURE_ORDER
    ]
    X_test = engineer_features(X_test_df.reset_index(drop=True), train_mean_price)[
        FEATURE_ORDER
    ]

    model = RandomForestClassifier(
        n_estimators=120,
        max_depth=18,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train.values, y_train)

    y_pred = model.predict(X_test.values)
    acc = accuracy_score(y_test, y_pred)

    print(f"\nTrain mean price (for ratio feature): {train_mean_price:.2f}")
    print(f"Test accuracy: {acc * 100:.2f}%")
    print("\nClassification report (test):")
    print(classification_report(y_test, y_pred, target_names=["ok", "fraud"]))
    cm = confusion_matrix(y_test, y_pred)
    print(f"Confusion matrix [TN FP; FN TP]:\n{cm}")

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    payload = {
        "model": model,
        "feature_names": FEATURE_ORDER,
        "train_mean_price": train_mean_price,
        "model_type": "RandomForestClassifier",
        "dataset": "courier_fraud_combined.csv",
        "description": "Neo-CNS courier order fraud (synthetic + OpenML-mapped)",
    }
    joblib.dump(payload, MODEL_PATH)
    print(f"\nSaved: {MODEL_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
