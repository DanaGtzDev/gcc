import pandas as pd
import numpy as np
import joblib

print("Loading raw data...")
df = pd.read_csv("consolidated_ordenes.csv")
df.columns = df.columns.str.strip()
df['created_on'] = pd.to_datetime(df['created_on'])
df = df.sort_values(by=['equipment', 'created_on'], ascending=[True, True])

print("Computing days_diff per equipment...")
df['days_diff'] = df.groupby('equipment')['created_on'].diff().dt.days
df = df.dropna(subset=['days_diff'])
df = df[df['days_diff'] > 0].copy()
print(f"Rows after filtering: {len(df)}")

print("Computing rolling statistics...")
def add_rolling_features(group):
    log_diff = np.log1p(group['days_diff'])
    for w in [5, 10, 20, 30]:
        group[f'rolling_mean_{w}'] = log_diff.rolling(w, min_periods=1).mean()
        group[f'rolling_std_{w}']  = log_diff.rolling(w, min_periods=1).std().fillna(0)
    return group

df = df.groupby('equipment', group_keys=False).apply(add_rolling_features)

cont_cols = ['rolling_mean_5', 'rolling_std_5',
             'rolling_mean_10', 'rolling_std_10',
             'rolling_mean_20', 'rolling_std_20',
             'rolling_mean_30', 'rolling_std_30']

print("\nComputing min and range...")
model_df_stats = {}
for col in cont_cols:
    cmin = df[col].min()
    cmax = df[col].max()
    crange = cmax - cmin
    model_df_stats[col] = (cmin, crange)
    print(f"{col}: min={cmin:.6f}, range={crange:.6f}")

# Save to both locations
joblib.dump(model_df_stats, 'model_df_stats.pkl')
joblib.dump(model_df_stats, 'api/scaler_encoder/model_df_stats.pkl')
print("\nSaved correct stats to both locations.")

# Also save a MinMaxScaler fitted on raw data for optional use
from sklearn.preprocessing import MinMaxScaler
scaler = MinMaxScaler()
scaler.fit(df[cont_cols])
joblib.dump(scaler, 'feature_scaler.pkl')
joblib.dump(scaler, 'api/scaler_encoder/feature_scaler.pkl')
print("Saved MinMaxScaler.")