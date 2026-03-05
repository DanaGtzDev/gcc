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

print("\nRaw min and max:")
for col in cont_cols:
    cmin = df[col].min()
    cmax = df[col].max()
    crange = cmax - cmin
    print(f"{col}: min={cmin:.6f}, max={cmax:.6f}, range={crange:.6f}")

print("\nLoading saved stats...")
stats = joblib.load('model_df_stats.pkl')
for col in cont_cols:
    if col in stats:
        cmin, crange = stats[col]
        print(f"{col}: saved min={cmin:.6f}, range={crange:.6f}")
    else:
        print(f"{col}: not in stats")

print("\nAre they equal?")
for col in cont_cols:
    cmin_raw = df[col].min()
    cmax_raw = df[col].max()
    crange_raw = cmax_raw - cmin_raw
    if col in stats:
        cmin_save, crange_save = stats[col]
        if abs(cmin_raw - cmin_save) < 1e-6 and abs(crange_raw - crange_save) < 1e-6:
            print(f"{col}: OK")
        else:
            print(f"{col}: MISMATCH raw min={cmin_raw:.6f} saved={cmin_save:.6f}, raw range={crange_raw:.6f} saved={crange_save:.6f}")
    else:
        print(f"{col}: missing")