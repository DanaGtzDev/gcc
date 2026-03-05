from fastapi import FastAPI, HTTPException
import pandas as pd
import numpy as np
import joblib
from pydantic import BaseModel
from typing import List, Optional
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
feature_scaler = joblib.load("scaler_encoder/feature_scaler.pkl")

# Training dataset stats needed for normalization (saved from notebook)
# Note: model_df_stats is kept for compatibility but not used for normalization
model_df_stats = joblib.load("scaler_encoder/model_df_stats.pkl")  # dict of {col: (min, range)}

CONT_COLS = [
    'rolling_mean_5',  'rolling_std_5',
    'rolling_mean_10', 'rolling_std_10',
    'rolling_mean_20', 'rolling_std_20',
    'rolling_mean_30', 'rolling_std_30',
]

FEATURE_COLS = [
    'modelo', 'marca_enc', 'plant_enc',
    'month_sin', 'month_cos',
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

    df['marca_enc'] = le_marca.transform(df['marca'].astype(str))
    df['plant_enc'] = le_plant.transform(df['plant'].astype(str))

    latest = df[FEATURE_COLS].iloc[[-1]].copy()

    # Normalize rolling features using the trained MinMaxScaler
    latest[CONT_COLS] = feature_scaler.transform(latest[CONT_COLS])

    latest['days_diff']      = 1
    latest['event_observed'] = 1

    return latest

def calculate_mtbf(unit_orders):
    """
    Calculate MTBF statistics for a unit's order history.
    Returns overall MTBF, rolling MTBF series, and time-series data.
    """
    if len(unit_orders) < 2:
        return None
    
    # Ensure sorted by date
    unit_orders = unit_orders.sort_values('created_on').copy()
    unit_orders['created_on'] = pd.to_datetime(unit_orders['created_on'])
    
    # Calculate days between consecutive orders
    unit_orders['days_since_previous'] = unit_orders['created_on'].diff().dt.days
    
    # Remove first row (no previous order)
    intervals = unit_orders.iloc[1:].copy()
    
    if intervals.empty:
        return None
    
    # Overall MTBF (mean of all intervals)
    overall_mtbf = intervals['days_since_previous'].mean()
    
    # Calculate cumulative MTBF (MTBF up to each point)
    intervals['cumulative_mtbf'] = intervals['days_since_previous'].expanding().mean()
    
    # Calculate rolling MTBF with window of last 10 intervals (or all available if less)
    window = min(10, len(intervals))
    intervals['rolling_mtbf_10'] = intervals['days_since_previous'].rolling(window=window, min_periods=1).mean()
    
    # Prepare time-series data for plotting
    time_series = []
    for idx, row in intervals.iterrows():
        time_series.append({
            "order_date": row['created_on'].isoformat(),
            "order_sequence": int(row.name),  # index in the dataframe
            "days_since_previous": float(row['days_since_previous']),
            "cumulative_mtbf": float(row['cumulative_mtbf']),
            "rolling_mtbf_10": float(row['rolling_mtbf_10'])
        })
    
    return {
        "overall_mtbf": float(overall_mtbf),
        "interval_count": int(len(intervals)),
        "min_interval": float(intervals['days_since_previous'].min()),
        "max_interval": float(intervals['days_since_previous'].max()),
        "std_interval": float(intervals['days_since_previous'].std()),
        "time_series": time_series
    }

def calculate_fleet_mtbf(df, plant=None, model=None, origin=None):
    """
    Calculate fleet-wide MTBF with optional filters.
    Returns aggregated statistics across all units.
    """
    # Apply filters if provided
    filtered_df = df.copy()
    
    if plant is not None:
        filtered_df = filtered_df[filtered_df['plant'] == plant]
    
    if model is not None:
        # Model might be numeric, convert to string for comparison
        filtered_df = filtered_df[filtered_df['modelo'].astype(str) == str(model)]
    
    if origin is not None:
        filtered_df = filtered_df[filtered_df['origen'] == origin]
    
    if filtered_df.empty:
        return None
    
    # Get unique units in filtered dataset
    unique_units = filtered_df['equipment'].unique()
    
    all_intervals = []
    unit_mtbfs = []
    
    for unit_id in unique_units:
        unit_orders = filtered_df[filtered_df['equipment'] == unit_id].sort_values('created_on')
        
        if len(unit_orders) < 2:
            continue
        
        # Convert to datetime if not already
        unit_orders = unit_orders.copy()
        unit_orders['created_on'] = pd.to_datetime(unit_orders['created_on'])
        
        # Calculate intervals for this unit
        intervals = unit_orders['created_on'].diff().dt.days.iloc[1:]  # Skip first NaN
        
        # Add to global list
        all_intervals.extend(intervals.tolist())
        
        # Also calculate unit-level MTBF for statistics
        if len(intervals) > 0:
            unit_mtbfs.append(intervals.mean())
    
    if not all_intervals:
        return None
    
    # Convert to numpy array for calculations
    all_intervals = np.array(all_intervals)
    
    return {
        "fleet_mtbf": float(all_intervals.mean()),
        "fleet_interval_count": int(len(all_intervals)),
        "fleet_unit_count": int(len(unit_mtbfs)),
        "fleet_min_interval": float(all_intervals.min()),
        "fleet_max_interval": float(all_intervals.max()),
        "fleet_std_interval": float(all_intervals.std()),
        "unit_mtbf_mean": float(np.mean(unit_mtbfs)) if unit_mtbfs else 0.0,
        "unit_mtbf_std": float(np.std(unit_mtbfs)) if unit_mtbfs else 0.0,
        "filter_applied": {
            "plant": plant,
            "model": model,
            "origin": origin
        }
    }

# --- ENDPOINTS ---
@app.get("/units")
async def get_all_units():
    return list(map(lambda o: {"unit_id": int(o)}, ordenes["equipment"].unique()))

@app.get("/units/{unit_id}")
async def get_unit(unit_id: int):
    filtered = ordenes.loc[ordenes["equipment"] == unit_id]

    if filtered.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Equipment with id {unit_id} not found"
        )

    row = filtered.iloc[0][["equipment","main_plant","plant","marca","modelo","origen"]]

    # Convert entire row safely to Python-native types
    return row.to_dict()

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

@app.get("/history/{unit_id}")
async def get_order_history(unit_id: int):
    """
    Returns chronological order history for a given unit.
    """
    unit_orders = ordenes.loc[ordenes["equipment"] == unit_id].sort_values(by='created_on')
    
    if unit_orders.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Equipment with id {unit_id} not found"
        )
    
    # Convert to list of records with relevant fields
    history = unit_orders[[
        "order", "description", "created_on", "changed_on",
        "main_plant", "plant", "marca", "modelo", "origen"
    ]].to_dict(orient='records')
    
    # Convert datetime objects to ISO format strings for JSON serialization
    for record in history:
        if isinstance(record.get("created_on"), pd.Timestamp):
            record["created_on"] = record["created_on"].isoformat()
        if isinstance(record.get("changed_on"), pd.Timestamp):
            record["changed_on"] = record["changed_on"].isoformat()
    
    return history

@app.get("/mtbf/{unit_id}")
async def get_unit_mtbf(unit_id: int):
    """
    Calculate MTBF (Mean Time Between Failure) for a specific unit.
    Treats each order as a failure event.
    """
    unit_orders = ordenes.loc[ordenes["equipment"] == unit_id].sort_values(by='created_on')
    
    if unit_orders.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Equipment with id {unit_id} not found"
        )
    
    mtbf_result = calculate_mtbf(unit_orders)
    
    if mtbf_result is None:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough order history (need at least 2 orders) for unit {unit_id}"
        )
    
    return mtbf_result

@app.get("/fleet/mtbf")
async def get_fleet_mtbf(
    plant: Optional[str] = None,
    model: Optional[str] = None,
    origin: Optional[str] = None
):
    """
    Calculate fleet-wide MTBF with optional filters.
    """
    result = calculate_fleet_mtbf(ordenes, plant=plant, model=model, origin=origin)
    
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="No data found for the specified filters"
        )
    
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)