# ML Flight Price Predictor

A machine learning microservice for predicting flight price trends using scikit-learn.

## Features

- **Three ML Models**: Linear Regression, Random Forest, Gradient Boosting
- **Automatic Model Selection**: Chooses best performing model
- **Price Trend Prediction**: Increase, Decrease, or Stable
- **REST API**: Simple integration with existing systems

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```bash
python train_models.py
python app.py
```

## API Endpoint

**POST** `http://localhost:5000/predict-flight-price`

### Request
```json
{
  "route": "NYC-LON",
  "airline": "Emirates",
  "departure_date": "2024-12-15",
  "current_price": 650,
  "days_before_departure": 30
}
```

### Response
```json
{
  "predicted_price": 720,
  "trend": "increase",
  "confidence_score": 0.85,
  "model_used": "RandomForest"
}
```
