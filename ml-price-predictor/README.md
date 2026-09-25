# Experimental ML Price Prediction V2

This local Flask service runs an experimental model trained entirely on
deterministic synthetic data. It demonstrates an ML integration pipeline; it is
not a validated real-world airfare forecast. Live flight search remains separate.

## V2 design

V2 predicts a synthetic future-price percentage change from:

1. current displayed USD price
2. days before departure
3. provider total duration in minutes
4. provider stop count
5. sine of departure month
6. cosine of departure month

Routes and airlines are not model features and never control support. There is no
random inference adjustment, confidence percentage, or booking recommendation.
The displayed predicted price equals current price multiplied by one plus the
predicted percentage change.

## Synthetic training assumptions

`data_generator.py` creates 12,000 records with seed 42. Its authored simulation
assumes a smooth expected upward drift from exactly 0% at a zero-day horizon to
4% at 365 days. Month contributes a cyclical -2 to +2 points, duration has a
small bounded effect, each stop subtracts 0.6 points, displayed price has a
small dampening effect around USD 500, and seeded Gaussian noise has mean 0 and
standard deviation 1.5 points. No direction percentages are forced. These are
declared simulation rules—not findings discovered from airline markets.

Inference rounds the model percentage to one decimal first. That canonical
value is used for the displayed percentage, predicted-price calculation, and
Increase/Stable/Decrease classification at the +/-0.5% thresholds.

Training compares a zero-change baseline, Linear Regression, Random Forest, and
Gradient Boosting using separate training, validation, and test sets. A
multi-stop, long-duration, June-August combination is excluded from normal
splits as a generalization holdout. All metrics in `model_metadata.json` are
synthetic-data evaluation metrics only.

## Local development

From the repository root:

```powershell
.\ml-price-predictor\.venv\Scripts\python.exe ml-price-predictor/train_models.py
.\ml-price-predictor\.venv\Scripts\python.exe ml-price-predictor/app.py
```

In separate terminals, run `npm run server` and `npm run dev`. The browser calls
`POST /api/ml/price-prediction`; Express validates input, calculates
`days_before_departure`, and calls Flask at `127.0.0.1:5000`. The model remains
on-demand from each flight's **Price Prediction** panel.

## Constraints

- Currency: USD
- Displayed price: USD 40–5,000
- Departure horizon: 0–365 days
- Provider duration: 45–1,800 minutes
- Stops: 0–3

## Flask request

```json
{
  "departure_date": "2026-11-15",
  "days_before_departure": 51,
  "current_price": 650,
  "total_duration_minutes": 435,
  "stops": 1,
  "currency": "USD"
}
```

The Flask service is localhost-only, loads model paths independently of the
current working directory, and returns sanitized structured errors.
