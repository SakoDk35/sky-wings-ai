# Experimental ML Flight Price Prototype

This Flask service runs the checked-in scikit-learn price-prediction prototype.
It is called by the SkyWings Express API; normal browser traffic must not call
Flask directly.

## Important limitations

- The model was trained entirely on 10,000 generated synthetic records.
- Its metrics are synthetic-data evaluation metrics only and do not demonstrate
  accuracy on real airline prices.
- It is not a validated real-world fare forecast.
- It supports only the explicitly mapped routes and airlines represented in the
  synthetic training data, departure dates up to 120 days away, and USD prices.
- Flight search itself is separate and continues to use live third-party provider
  data. A live flight result does not make its experimental ML output live or validated.

## Saved model

Three regressors were evaluated with a random 80/20 split of the synthetic data:

| Model | MAE | RMSE | R² |
| --- | ---: | ---: | ---: |
| Linear Regression | 30.47 | 42.01 | 0.9867 |
| Random Forest | 18.10 | 26.78 | 0.9946 |
| Gradient Boosting | 17.29 | 25.41 | 0.9951 |

Gradient Boosting had the highest synthetic test R² and is stored in
`best_model.pkl`. Phase 3 does not retrain or replace this artifact.

## Local development

From the repository root in PowerShell, start Flask with the isolated environment:

```powershell
.\ml-price-predictor\.venv\Scripts\python.exe ml-price-predictor/app.py
```

The local `.venv` uses Python 3.12 and the exact direct dependency versions in
`requirements.txt`, including scikit-learn 1.3.2 (the saved model's version).
The old `venv` points to a removed Python 3.11 installation and is not used.
To recreate `.venv` on another machine, use a compatible Python 3.11 or 3.12:

```powershell
py -3.12 -m venv ml-price-predictor/.venv
.\ml-price-predictor\.venv\Scripts\python.exe -m pip install -r ml-price-predictor/requirements.txt
```

In two additional terminals at the repository root, run `npm run server` and
`npm run dev`. Use separate terminals on Windows, not the legacy `dev:all` script.
Health check: `http://127.0.0.1:5000/health` should report `model_loaded: true`.

In a flight's analysis panel, select **Run Experimental ML Prototype** to request
an inference. Searching and opening general analysis do not request ML predictions.
Identical inputs reuse pending/completed requests for the component lifetime;
loading, unsupported, unavailable, and result states are displayed separately.
Price Intelligence, Risk Analysis, and Booking Timing still run automatically.

The service listens on `127.0.0.1:5000`. Start Express separately; the frontend
calls `POST /api/ml/price-prediction`, and Express validates the browser request,
calculates `days_before_departure`, and forwards the normalized payload to Flask.

## Flask request contract

`POST /predict-flight-price`

```json
{
  "route": "JFK-LHR",
  "airline": "British Airways",
  "departure_date": "2026-11-15",
  "days_before_departure": 52,
  "current_price": 650,
  "currency": "USD"
}
```

The date and `days_before_departure` values must agree at request time. Successful
responses contain the model's unadjusted inference, a direction calculated from
that inference, and neutral experimental wording. They do not contain a confidence
percentage or booking recommendation.
