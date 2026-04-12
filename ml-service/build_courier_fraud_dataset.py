"""
Build a hybrid courier fraud dataset for Neo-CNS.

Output CSV columns (aligned with the app):
  distance_km, weight_kg, price, payment_method, order_hour, is_fraud, data_source

- Synthetic rows: Neo-CNS pricing (₹50 + ₹0.9/km + ₹12/kg), plausible ranges,
  rule-based fraud labels + noise.
- Real component (optional):
    A) Kaggle-style onlinefraud.csv (step, type, amount, isFraud, ...)
    B) ULB Credit Card Fraud on OpenML (42397) by default (use --no-openml to skip)

Usage:
  python build_courier_fraud_dataset.py
  python build_courier_fraud_dataset.py --no-openml          # synthetic (+ Kaggle file if present only)
  python build_courier_fraud_dataset.py --real-max 4000 --synthetic-n 10000
  set ONLINE_FRAUD_CSV=D:\\path\\onlinefraud.csv

By default this script builds a *combined* dataset: synthetic Neo-CNS rows plus real
labeled rows from OpenML (ULB credit card fraud, id 42397) when no Kaggle CSV is used,
or synthetic + Kaggle (if found) + OpenML together unless --no-openml is set.
"""

from __future__ import annotations

import argparse
import os
import sys

import numpy as np
import pandas as pd

# Neo-CNS pricing (must match server/utils/distanceService.js calculatePrice)
BASE = 50.0
PER_KM = 0.9
PER_KG = 12.0

PAYMENT_CHOICES = np.array(["COD", "Prepaid", "Wallet"])

# Kaggle online payments type -> Neo-CNS payment_method
KAGGLE_TYPE_TO_PAYMENT = {
    "CASH_OUT": "COD",
    "CASH_IN": "COD",
    "PAYMENT": "Prepaid",
    "DEBIT": "Prepaid",
    "TRANSFER": "Wallet",
}


def courier_price(distance_km: float, weight_kg: float) -> int:
    return int(round(BASE + PER_KM * distance_km + PER_KG * weight_kg))


def sample_distance_weight_for_price(target_price: int, rng: np.random.Generator) -> tuple[float, float]:
    """Find (distance_km, weight_kg) so courier_price is close to target_price."""
    for _ in range(80):
        w = float(rng.uniform(0.5, 180.0))
        rem = target_price - BASE - PER_KG * w
        if rem <= PER_KM:
            continue
        d = rem / PER_KM
        if 1.0 <= d <= 6000.0:
            p = courier_price(d, w)
            if abs(p - target_price) <= 2:
                return round(d, 2), round(w, 2)
    # fallback: solve from weight cap
    w = float(rng.uniform(1.0, 50.0))
    d = max(1.0, (target_price - BASE - PER_KG * w) / PER_KM)
    d = min(d, 6000.0)
    return round(d, 2), round(w, 2)


def make_synthetic(n: int, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []
    for _ in range(n):
        d = float(rng.uniform(1.0, 800.0))
        w = float(rng.uniform(0.5, 120.0))
        price = courier_price(d, w)
        hour = int(rng.integers(0, 24))
        pay = rng.choice(PAYMENT_CHOICES)

        # Rule-based fraud + noise (target roughly 5–12% fraud, imbalanced like production)
        fraud = False
        if pay == "COD" and price >= 2800 and hour <= 5:
            fraud = rng.random() < 0.85
        elif pay == "COD" and price >= 4500:
            fraud = rng.random() < 0.42
        elif pay == "COD" and price >= 2200 and rng.random() < 0.2:
            fraud = rng.random() < 0.35
        elif hour <= 3 and price >= 1800:
            fraud = rng.random() < 0.28
        if rng.random() < 0.045:
            fraud = True
        if rng.random() < 0.012:
            fraud = False

        rows.append(
            {
                "distance_km": round(d, 2),
                "weight_kg": round(w, 2),
                "price": price,
                "payment_method": pay,
                "order_hour": hour,
                "is_fraud": int(fraud),
                "data_source": "synthetic",
            }
        )
    return pd.DataFrame(rows)


def map_kaggle_onlinefraud(path: str, n: int, seed: int) -> pd.DataFrame:
    df = pd.read_csv(path)
    required = {"amount", "isFraud"}
    cols = set(c.lower() for c in df.columns)
    # normalize column names to lower for matching
    df.columns = [c.lower() for c in df.columns]
    if not required.issubset(set(df.columns)):
        print(f"   Skipping {path}: need columns amount, isFraud (Kaggle online payments schema).")
        return pd.DataFrame()

    sub = df.sample(n=min(n, len(df)), random_state=seed).reset_index(drop=True)
    a = sub["amount"].astype(float).values
    amin, amax = a.min(), a.max()
    span = amax - amin if amax > amin else 1.0
    # Map transaction amounts into typical courier quote band (₹)
    price_scaled = np.round(200.0 + (a - amin) / span * 9200.0).astype(int)
    price_scaled = np.clip(price_scaled, 120, 15000)

    rng = np.random.default_rng(seed + 1)
    rows = []
    for j in range(len(sub)):
        target = int(price_scaled[j])
        d, w = sample_distance_weight_for_price(target, rng)
        price = courier_price(d, w)

        if "step" in sub.columns:
            hour = int(sub["step"].iloc[j]) % 24
        else:
            hour = int(rng.integers(0, 24))

        raw_type = str(sub["type"].iloc[j]) if "type" in sub.columns else "PAYMENT"
        pay = KAGGLE_TYPE_TO_PAYMENT.get(raw_type, "Prepaid")

        rows.append(
            {
                "distance_km": d,
                "weight_kg": w,
                "price": price,
                "payment_method": pay,
                "order_hour": hour,
                "is_fraud": int(sub["isFraud"].iloc[j]),
                "data_source": "real_kaggle_onlinefraud",
            }
        )
    return pd.DataFrame(rows)


def try_openml_creditcard(n: int, seed: int) -> pd.DataFrame:
    try:
        from sklearn.datasets import fetch_openml
    except ImportError:
        return pd.DataFrame()

    try:
        bunch = fetch_openml(data_id=42397, as_frame=True, parser="auto")
    except Exception as e:
        print(f"   OpenML 42397 not loaded ({e}); skip real credit-card slice.")
        return pd.DataFrame()

    frame = bunch.frame
    frame.columns = [c.lower() for c in frame.columns]
    if "amount" not in frame.columns or "class" not in frame.columns:
        print("   OpenML frame missing amount/class; skip.")
        return pd.DataFrame()

    y_all = pd.to_numeric(frame["class"], errors="coerce").fillna(0).astype(int).clip(0, 1)
    fraud_df = frame[y_all == 1]
    ok_df = frame[y_all == 0]
    # Stratified-style sample: ULB is ~0.17% fraud; pull enough fraud rows for a useful mix
    cap = min(n, len(frame))
    n_fraud_pick = min(len(fraud_df), max(80, min(cap // 8, 400)))
    n_ok_pick = min(len(ok_df), max(0, cap - n_fraud_pick))
    sub_f = (
        fraud_df.sample(n=n_fraud_pick, random_state=seed) if n_fraud_pick else pd.DataFrame()
    )
    sub_o = ok_df.sample(n=n_ok_pick, random_state=seed) if n_ok_pick else pd.DataFrame()
    sub = pd.concat([sub_f, sub_o], ignore_index=True)
    sub = sub.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    rng = np.random.default_rng(seed + 99)

    amounts = sub["amount"].astype(float).values
    amin, amax = amounts.min(), amounts.max()
    span = amax - amin if amax > amin else 1.0
    price_scaled = np.round(180.0 + (amounts - amin) / span * 9500.0).astype(int)
    price_scaled = np.clip(price_scaled, 100, 16000)

    if "time" in sub.columns:
        t = sub["time"].astype(float).values
        hours = ((t // 3600).astype(int) % 24)
    else:
        hours = rng.integers(0, 24, size=len(sub))

    y = pd.to_numeric(sub["class"], errors="coerce").fillna(0).astype(int).clip(0, 1)
    is_fraud = y.values

    rows = []
    for j in range(len(sub)):
        target = int(price_scaled[j])
        d, w = sample_distance_weight_for_price(target, rng)
        price = courier_price(d, w)
        # correlate payment with fraud rate loosely: COD more common on risky rows
        if is_fraud[j] == 1 and rng.random() < 0.55:
            pay = "COD"
        elif rng.random() < 0.35:
            pay = "COD"
        elif rng.random() < 0.5:
            pay = "Prepaid"
        else:
            pay = "Wallet"

        rows.append(
            {
                "distance_km": d,
                "weight_kg": w,
                "price": price,
                "payment_method": pay,
                "order_hour": int(hours[j]),
                "is_fraud": int(is_fraud[j]),
                "data_source": "real_openml_creditcard_42397",
            }
        )
    return pd.DataFrame(rows)


def discover_online_fraud_paths() -> list[str]:
    paths = []
    env = os.environ.get("ONLINE_FRAUD_CSV")
    if env and os.path.isfile(env):
        paths.append(env)
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(here, "data", "onlinefraud.csv"),
        os.path.join(here, "..", "ml-data", "onlinefraud.csv"),
        r"D:\code\Projects\ml-data\onlinefraud.csv",
    ]
    for p in candidates:
        ap = os.path.abspath(p)
        if os.path.isfile(ap) and ap not in paths:
            paths.append(ap)
    return paths


def main() -> int:
    parser = argparse.ArgumentParser(description="Build hybrid courier fraud CSV for Neo-CNS.")
    parser.add_argument(
        "--output",
        default=os.path.join(os.path.dirname(__file__), "data", "courier_fraud_combined.csv"),
        help="Output CSV path",
    )
    parser.add_argument("--synthetic-n", type=int, default=12000, help="Number of synthetic rows")
    parser.add_argument("--real-max", type=int, default=8000, help="Max rows to draw from each real source")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--no-openml",
        action="store_true",
        help="Skip OpenML real fraud slice (offline / faster; CSV may be synthetic-only).",
    )
    args = parser.parse_args()

    parts: list[pd.DataFrame] = []

    syn = make_synthetic(args.synthetic_n, args.seed)
    parts.append(syn)
    print(f"[ok] Synthetic rows: {len(syn)} (Neo-CNS price formula)")

    kaggle_added = False
    for p in discover_online_fraud_paths():
        print(f"[file] Trying real Kaggle-style file: {p}")
        real = map_kaggle_onlinefraud(p, args.real_max, args.seed)
        if len(real):
            parts.append(real)
            kaggle_added = True
            print(f"   Added {len(real)} rows from online payments CSV (mapped to courier schema).")
            break

    if not args.no_openml:
        print("[openml] Fetching OpenML dataset 42397 (ULB credit card fraud)...")
        cc = try_openml_creditcard(args.real_max, args.seed)
        if len(cc):
            parts.append(cc)
            print(f"   Added {len(cc)} rows from OpenML (mapped to courier schema).")
        elif not kaggle_added:
            print(
                "   [warn] OpenML fetch failed or returned no rows; output is synthetic-only. "
                "Check network, or place onlinefraud.csv (see ONLINE_FRAUD_CSV), or run again later."
            )
    else:
        print("[skip] OpenML disabled (--no-openml).")

    out = pd.concat(parts, ignore_index=True)
    out = out.sample(frac=1.0, random_state=args.seed).reset_index(drop=True)

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    out.to_csv(args.output, index=False)

    print("\n[summary]")
    print(out["data_source"].value_counts().to_string())
    print(f"   Fraud rate: {out['is_fraud'].mean()*100:.2f}%")
    print(f"\n[write] {len(out)} rows -> {os.path.abspath(args.output)}")
    print("   Columns:", ", ".join(out.columns))
    return 0


if __name__ == "__main__":
    sys.exit(main())
