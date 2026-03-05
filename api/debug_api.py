import sys
sys.path.insert(0, '.')
import pandas as pd
import numpy as np
from api_weibull import ordenes, aft, le_marca, le_plant, model_df_stats, CONT_COLS, FEATURE_COLS

unit_id = 30004437
unit_orders = ordenes.loc[ordenes["equipment"] == unit_id].sort_values(by='created_on')
print(f"Unit {unit_id} has {len(unit_orders)} orders")

# Simulate preprocess_for_aft
df = unit_orders[["created_on", "marca", "plant", "modelo"]].copy()
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

print("\nRaw latest row (before normalization):")
for col in CONT_COLS:
    print(f"  {col}: {latest[col].iloc[0]:.6f}")

print("\nNormalized values:")
for col in CONT_COLS:
    col_min, col_range = model_df_stats[col]
    if col_range > 0:
        norm = (latest[col].iloc[0] - col_min) / col_range
        norm_clipped = np.clip(norm, 0, 1)
        print(f"  {col}: raw={latest[col].iloc[0]:.6f}, min={col_min:.6f}, range={col_range:.6f}, norm={norm:.6f}, clipped={norm_clipped:.6f}")
        latest[col] = norm_clipped
    else:
        latest[col] = 0.0

latest['days_diff'] = 1
latest['event_observed'] = 1

print("\nFinal latest row (normalized):")
print(latest[CONT_COLS].T)

# Predict median
median_pred = aft.predict_median(latest).values[0]
print(f"\nPredicted median days: {median_pred:.1f}")

# Survival function
sf = aft.predict_survival_function(latest)
sf_vals = sf.iloc[:, 0]
print(f"Survival function shape: {sf_vals.shape}")
print(f"Max day index: {sf_vals.index[-1]}")
print("Survival values at key days:")
for d in [0,1,5,10,20,30,50,100,200,500,890]:
    if d in sf_vals.index:
        print(f"  S({d}) = {sf_vals.loc[d]:.4f}")

# Compute percentiles
def get_percentile_day(sf_series, survival_prob):
    crossed = sf_series[sf_series <= survival_prob]
    if len(crossed) == 0:
        return float(sf_series.index[-1])
    return float(crossed.index[0])

p10 = get_percentile_day(sf_vals, 0.9)
p90 = get_percentile_day(sf_vals, 0.1)
print(f"\n10th percentile (S(t)=0.9): {p10}")
print(f"90th percentile (S(t)=0.1): {p90}")
print(f"80% interval: {p10:.0f} – {p90:.0f} days")