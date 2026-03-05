import joblib
import pandas as pd
import numpy as np

print("Loading model...")
aft = joblib.load('weibull_aft_model.pkl')
print("Model type:", type(aft))
print("\nModel summary columns:", aft.summary.index.tolist() if hasattr(aft, 'summary') else 'No summary')
if hasattr(aft, 'summary'):
    print(aft.summary)

print("\nLoading model_df_stats...")
stats = joblib.load('model_df_stats.pkl')
print("Keys in stats:", list(stats.keys()))

print("\nLoading API model_df_stats...")
api_stats = joblib.load('api/scaler_encoder/model_df_stats.pkl')
print("Keys in api stats:", list(api_stats.keys()))