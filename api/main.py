from fastapi import FastAPI
import tensorflow as tf
import pandas as pd
import numpy as np
import joblib
from pydantic import BaseModel
from typing import List
import uvicorn

app = FastAPI(title="Equipment Order Predictor")

ordenes = pd.read_csv("consolidated_ordenes.csv")

# --- LOAD ASSETS ---
model = tf.saved_model.load("basic_model_directory")
scaler = joblib.load('scaler_encoder/feature_scaler.pkl')
le_marca = joblib.load('scaler_encoder/le_marca.pkl')
le_plant = joblib.load('scaler_encoder/le_plant.pkl')

WINDOW_SIZE = 40

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
def preprocess_input(orders_list):
    df = pd.DataFrame(orders_list)
    df['created_on'] = pd.to_datetime(df['created_on'])
    df = df.sort_values('created_on')
    
    # Calculate days_diff
    df['days_diff'] = df['created_on'].diff().dt.days.fillna(0)
    
    # Encode categorical variables
    df['marca_enc'] = le_marca.transform(df['marca'].astype(str))
    df['plant_enc'] = le_plant.transform(df['plant'].astype(str))
    
    # Select features
    feature_cols = ['days_diff', 'modelo', 'marca_enc', 'plant_enc']
    recent_history = df[feature_cols].tail(WINDOW_SIZE)
    
    # Scale
    scaled_input = scaler.transform(recent_history)
    return scaled_input.reshape(1, WINDOW_SIZE, len(feature_cols))


@app.get("/units")
async def get_all_units():
    li = list(map(lambda o : {"unit_id": int(o)}, ordenes["equipment"].unique()))
    #print(li)
    #return list(map(lambda o : {"unit_id": o}, ordenes["equipment"].unique()))
    return li

@app.get("/units/{unit_id}")
async def get_unit(unit_id: int):
    # You can now use unit_id to filter your data
    filtered_by_id = ordenes.loc[ordenes["equipment"] == unit_id]
    if len(filtered_by_id) == 0:
        return {"Error": f"Equipment with id {unit_id} not found"}
    else:
        return filtered_by_id.to_dict(orient='records')

# --- ENDPOINTS ---
@app.get("/predict/{unit_id}")
async def predict(unit_id: int):
    ord_json = ordenes.loc[ordenes["equipment"] == unit_id].sort_values(by='created_on')[-40:][["created_on","marca","plant","modelo"]].to_dict(orient='records')
    processed_data = preprocess_input(ord_json).astype(np.float32)

    # Predict (using the 'serve' signature from your model export)
    infer = model.signatures["serve"]
    prediction_scaled = infer(tf.constant(processed_data))

    # Inverse Scale (Extracting index 0 for days_diff)
    val_scaled = list(prediction_scaled.values())[0].numpy()[0][0]
    dummy = np.zeros((1, 4))
    dummy[0, 0] = val_scaled
    prediction_final = scaler.inverse_transform(dummy)[0, 0]

    return {"predicted_days_to_next_order": float(max(0, prediction_final))}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)