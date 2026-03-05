import json

with open('parametric_aft_model.ipynb', 'r', encoding='utf-8') as f:
    nb = json.load(f)

new_source = [
    "# Load or compute min and range of continuous features from raw data (df)\n",
    "# Try to load saved stats; if not found, compute from raw data (df)\n",
    "try:\n",
    "    model_df_stats = joblib.load('model_df_stats.pkl')\n",
    "    print(\"Loaded model_df_stats from file.\")\n",
    "except FileNotFoundError:\n",
    "    print(\"model_df_stats.pkl not found. Computing from raw data...\")\n",
    "    model_df_stats = {\n",
    "        col: (df[col].min(), df[col].max() - df[col].min())\n",
    "        for col in cont_cols\n",
    "    }\n",
    "    joblib.dump(model_df_stats, 'model_df_stats.pkl')\n",
    "    print(\"Computed and saved model_df_stats.\")\n",
    "\n",
    "# Also save a copy for the API\n",
    "joblib.dump(model_df_stats, 'api/scaler_encoder/model_df_stats.pkl')\n",
    "print(\"Saved copy to api/scaler_encoder/model_df_stats.pkl\")\n",
    "\n",
    "# Display stats for verification\n",
    "print(\"\\nContinuous feature statistics:\")\n",
    "for col, (cmin, crange) in model_df_stats.items():\n",
    "    print(f\"  {col}: min={cmin:.6f}, range={crange:.6f}\")\n"
]

for cell in nb['cells']:
    if cell.get('id') == 'cell14':
        cell['source'] = new_source
        cell['outputs'] = []
        cell['execution_count'] = None
        print("Updated notebook cell14.")
        break

with open('parametric_aft_model.ipynb', 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=2, ensure_ascii=False)

print("Notebook saved.")