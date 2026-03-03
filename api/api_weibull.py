from fastapi import FastAPI, HTTPException
import pandas as pd
import numpy as np
import joblib
from pydantic import BaseModel
from typing import List
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Equipment Order Predictor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ordenes = pd.read_csv("consolidated_ordenes.csv")

# --- LOAD ASSETS ---
aft       = joblib.load("scaler_encoder/weibull_aft_model.pkl")
le_marca  = joblib.load("scaler_encoder/le_marca.pkl")
le_plant  = joblib.load("scaler_encoder/le_plant.pkl")

# Training dataset stats needed for normalization (saved from notebook)
model_df_stats = joblib.load("scaler_encoder/model_df_stats.pkl")  # dict of {col: (min, range)}

CONT_COLS = [
    'cum_days',
    'rolling_mean_5',  'rolling_std_5',
    'rolling_mean_10', 'rolling_std_10',
    'rolling_mean_20', 'rolling_std_20',
    'rolling_mean_30', 'rolling_std_30',
]

FEATURE_COLS = [
    'modelo', 'marca_enc', 'plant_enc',
    'month_sin', 'month_cos', 'cum_days',
    'rolling_mean_5',  'rolling_std_5',
    'rolling_mean_10', 'rolling_std_10',
    'rolling_mean_20', 'rolling_std_20',
    'rolling_mean_30', 'rolling_std_30',
]

# --- DATA MODELS ---
class Order(BaseModel):
    created_on: str
    marca: str
    plant: str
    modelo: float

class PredictionInput(BaseModel):
    orders: List[Order]

class UnitInfoQuery(BaseModel):
    unit_id: int

# --- HELPER LOGIC ---
def get_percentile_day(sf_series, survival_prob):
    crossed = sf_series[sf_series <= survival_prob]
    if len(crossed) == 0:
        return float(sf_series.index[-1])
    return float(crossed.index[0])

def preprocess_for_aft(orders_list):
    df = pd.DataFrame(orders_list)
    df['created_on'] = pd.to_datetime(df['created_on'])
    df = df.sort_values('created_on')

    df['days_diff'] = df['created_on'].diff().dt.days.fillna(0)
    log_diff = np.log1p(df['days_diff'])

    for w in [5, 10, 20, 30]:
        df[f'rolling_mean_{w}'] = log_diff.rolling(w, min_periods=1).mean()
        df[f'rolling_std_{w}']  = log_diff.rolling(w, min_periods=1).std().fillna(0)

    df['month']     = df['created_on'].dt.month
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    df['cum_days']  = (df['created_on'] - df['created_on'].iloc[0]).dt.days

    df['marca_enc'] = le_marca.transform(df['marca'].astype(str))
    df['plant_enc'] = le_plant.transform(df['plant'].astype(str))

    latest = df[FEATURE_COLS].iloc[[-1]].copy()

    # Normalize using saved training stats, clip to [0,1] to prevent blow-up
    for col in CONT_COLS:
        col_min, col_range = model_df_stats[col]
        if col_range > 0:
            latest[col] = ((latest[col] - col_min) / col_range).clip(0, 1)

    latest['days_diff']      = 1
    latest['event_observed'] = 1

    return latest

# --- ENDPOINTS ---
@app.get("/units")
async def get_all_units():
    return list(map(lambda o: {"unit_id": int(o)}, ordenes["equipment"].unique()))

@app.get("/units/{unit_id}")
async def get_unit(unit_id: int):
    filtered = ordenes.loc[ordenes["equipment"] == unit_id]
    if len(filtered) == 0:
        raise HTTPException(status_code=404, detail=f"Equipment with id {unit_id} not found")
    return filtered.to_dict(orient='records')

@app.get("/predict/{unit_id}")
async def predict(unit_id: int):
    unit_orders = ordenes.loc[ordenes["equipment"] == unit_id].sort_values(by='created_on')

    if len(unit_orders) < 2:
        raise HTTPException(status_code=400, detail=f"Not enough order history for unit {unit_id}")

    ord_json = unit_orders[["created_on", "marca", "plant", "modelo"]].to_dict(orient='records')

    latest = preprocess_for_aft(ord_json)

    median_pred = aft.predict_median(latest).values[0]

    sf      = aft.predict_survival_function(latest)
    sf_vals = sf.iloc[:, 0]
    p10     = get_percentile_day(sf_vals, 0.90)  # 10th percentile of T
    p90     = get_percentile_day(sf_vals, 0.10)  # 90th percentile of T

    return {
        "predicted_days_to_next_order": float(max(0, median_pred)),
        "interval_80_low":              float(p10),
        "interval_80_high":             float(p90),
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)