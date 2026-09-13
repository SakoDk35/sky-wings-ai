# Quick Start Guide

## Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

## Step 2: Generate Training Data (Optional)

The training script will auto-generate data if not found, but you can do it manually:

```bash
python data_generator.py
```

This creates `training_data.csv` with 10,000 synthetic flight records.

## Step 3: Train ML Models

```bash
python train_models.py
```

This will:
- Load or generate training data
- Train 3 models (Linear Regression, Random Forest, Gradient Boosting)
- Evaluate and select the best model
- Save the best model to `best_model.pkl`
- Save metadata to `model_metadata.json`

**Expected output:**
```
✓ Best Model: RandomForest
  R² Score: 0.9876
  MAE: $45.23
```

## Step 4: Start the Prediction API

```bash
python app.py
```

The server will start on `http://localhost:5000`

## Step 5: Test the API

### Option A: Use the example client
```bash
python client_example.py
```

### Option B: Use curl
```bash
curl -X POST http://localhost:5000/predict-flight-price \
  -H "Content-Type: application/json" \
  -d '{
    "route": "NYC-LON",
    "airline": "Emirates",
    "departure_date": "2024-12-15",
    "current_price": 650,
    "days_before_departure": 30
  }'
```

### Option C: Use Python requests
```python
import requests

response = requests.post('http://localhost:5000/predict-flight-price', json={
    "route": "NYC-LON",
    "airline": "Emirates",
    "departure_date": "2024-12-15",
    "current_price": 650,
    "days_before_departure": 30
})

print(response.json())
```

## API Endpoints

### GET /health
Check service health and model status

### POST /predict-flight-price
Get price prediction

**Input:**
```json
{
  "route": "NYC-LON",
  "airline": "Emirates",
  "departure_date": "2024-12-15",
  "current_price": 650,
  "days_before_departure": 30
}
```

**Output:**
```json
{
  "predicted_price": 720.50,
  "trend": "increase",
  "confidence_score": 0.85,
  "model_used": "RandomForest",
  "price_change_percent": 10.85,
  "recommendation": "BOOK_NOW - Price expected to increase significantly"
}
```

### GET /models-info
Get information about trained models and their performance

## Supported Routes

- NYC-LON (New York - London)
- LON-PAR (London - Paris)
- DXB-NYC (Dubai - New York)
- TYO-SIN (Tokyo - Singapore)
- PAR-ROM (Paris - Rome)
- BER-MAD (Berlin - Madrid)
- LAX-TYO (Los Angeles - Tokyo)
- SIN-BKK (Singapore - Bangkok)
- DOH-LON (Doha - London)
- IST-DXB (Istanbul - Dubai)
- NYC-LAX (New York - Los Angeles)
- LON-DXB (London - Dubai)
- PAR-NYC (Paris - New York)
- BKK-SIN (Bangkok - Singapore)
- ROM-BER (Rome - Berlin)

## Supported Airlines

- Emirates
- Qatar Airways
- Singapore Airlines
- Lufthansa
- British Airways
- Air France
- Turkish Airlines
- Etihad
- Ryanair
- EasyJet
- Spirit Airlines
- Delta
- United
- American Airlines

## Notes

- The ML service is **independent** and does not modify existing Sky Wings functionality
- Existing flight search, AI analysis, and booking systems continue to work as before
- This is an **optional enhancement** that can be integrated via REST API
- Models are retrained automatically when you run `train_models.py`
- Synthetic data generation ensures privacy and compliance
