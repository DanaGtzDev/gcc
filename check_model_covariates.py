import joblib

print("Loading root model...")
root = joblib.load('weibull_aft_model.pkl')
print("Root model covariates:")
if hasattr(root, 'summary'):
    covariates = [cov for (_, cov) in root.summary.index.tolist() if cov != 'Intercept']
    print(covariates)
else:
    print("No summary")
    
print("\nLoading API model...")
api = joblib.load('api/scaler_encoder/weibull_aft_model.pkl')
print("API model covariates:")
if hasattr(api, 'summary'):
    covariates = [cov for (_, cov) in api.summary.index.tolist() if cov != 'Intercept']
    print(covariates)
else:
    print("No summary")

# Check regressors
print("\nRoot regressors columns:")
if hasattr(root, 'regressors'):
    print(root.regressors.transform)
    # try to see what columns it expects
    try:
        import pandas as pd
        dummy = pd.DataFrame(columns=covariates)
        transformed = root.regressors.transform_df(dummy)
        print("Transformed shape:", transformed.shape)
        print("Columns:", transformed.columns.tolist())
    except Exception as e:
        print("Error:", e)

print("\nAPI regressors columns:")
if hasattr(api, 'regressors'):
    print(api.regressors.transform)
    try:
        import pandas as pd
        dummy = pd.DataFrame(columns=covariates)
        transformed = api.regressors.transform_df(dummy)
        print("Transformed shape:", transformed.shape)
        print("Columns:", transformed.columns.tolist())
    except Exception as e:
        print("Error:", e)