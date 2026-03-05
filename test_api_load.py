import sys
sys.path.insert(0, 'api')
try:
    from api_weibull import app, ordenes, aft, le_marca, le_plant, model_df_stats, CONT_COLS, FEATURE_COLS
    print("Successfully imported API module.")
    print(f"ordenes shape: {ordenes.shape}")
    print(f"Model type: {type(aft)}")
    print(f"CONT_COLS: {CONT_COLS}")
    print(f"FEATURE_COLS: {FEATURE_COLS}")
    print(f"model_df_stats keys: {list(model_df_stats.keys())}")
    
    # Check that CONT_COLS are in model_df_stats
    for col in CONT_COLS:
        if col not in model_df_stats:
            print(f"WARNING: {col} not in model_df_stats")
        else:
            print(f"OK: {col} in model_df_stats")
    
    # Check that FEATURE_COLS match model covariates
    if hasattr(aft, 'summary'):
        model_covariates = [cov for (_, cov) in aft.summary.index.tolist() if cov != 'Intercept']
        # model_covariates includes 'marca_enc', 'modelo', 'month_cos', 'month_sin', 'plant_enc', rolling stats
        print(f"Model covariates: {model_covariates}")
        # Ensure all FEATURE_COLS are in model_covariates (except maybe 'days_diff' and 'event_observed')
        for col in FEATURE_COLS:
            if col not in model_covariates:
                print(f"WARNING: {col} not in model covariates")
            else:
                print(f"OK: {col} in model covariates")
    
except Exception as e:
    print(f"Error importing API module: {e}")
    import traceback
    traceback.print_exc()