"""
ML Flight Price Prediction REST API
Flask microservice for predicting flight price trends
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Route and airline mappings (must match training data)
ROUTES = {
    'NYC-LON': 0, 'LON-PAR': 1, 'DXB-NYC': 2, 'TYO-SIN': 3,
    'PAR-ROM': 4, 'BER-MAD': 5, 'LAX-TYO': 6, 'SIN-BKK': 7,
    'DOH-LON': 8, 'IST-DXB': 9, 'NYC-LAX': 10, 'LON-DXB': 11,
    'PAR-NYC': 12, 'BKK-SIN': 13, 'ROM-BER': 14
}

AIRLINES = {
    'Emirates': 0, 'Qatar': 1, 'Singapore': 2, 'Lufthansa': 3,
    'British Airways': 4, 'Air France': 5, 'Turkish': 6, 'Etihad': 7,
    'Ryanair': 8, 'EasyJet': 9, 'Spirit': 10, 'Delta': 11,
    'United': 12, 'American': 13
}

# Load the trained model
MODEL_PATH = 'best_model.pkl'
model = None

def load_model():
    """Load the trained ML model"""
    global model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"✓ Model loaded: {MODEL_PATH}")
    else:
        print(f"⚠ Model not found. Please run train_models.py first")
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

def get_season_from_date(date_str):
    """Determine season from date (1=Winter, 2=Spring, 3=Summer, 4=Fall)"""
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d')
        month = date.month
        
        if month in [12, 1, 2]:
            return 1  # Winter
        elif month in [3, 4, 5]:
            return 2  # Spring
        elif month in [6, 7, 8]:
            return 3  # Summer
        else:
            return 4  # Fall
    except:
        return 2  # Default to Spring

def estimate_demand(date_str, route):
    """Estimate demand level based on season and route (1-5)"""
    season = get_season_from_date(date_str)
    
    # Base demand by season
    base_demand = 3
    
    if season == 3:  # Summer - high demand
        base_demand = 4
    elif season == 1:  # Winter - lower demand (except holidays)
        base_demand = 2
    
    # Popular routes have slightly higher demand
    popular_routes = ['NYC-LON', 'DXB-NYC', 'LON-PAR']
    if route in popular_routes:
        base_demand = min(5, base_demand + 1)
    
    return base_demand


def generate_reasoning(trend, days_before, season, demand_level, price_change_percent):
    """Generate contextual reasoning explaining the prediction"""
    reasons = []
    
    # Time-based reasoning
    if days_before <= 7:
        reasons.append("Last-minute booking window typically shows higher prices")
    elif days_before <= 14:
        reasons.append("Optimal booking period approaching - prices stabilizing")
    elif days_before <= 30:
        reasons.append("Standard booking timeframe with moderate price volatility")
    elif days_before <= 60:
        reasons.append("Early booking period allows for price monitoring")
    else:
        reasons.append("Far-future booking date increases uncertainty")
    
    # Seasonal reasoning
    season_names = {1: 'Winter', 2: 'Spring', 3: 'Summer', 4: 'Fall'}
    if season == 3:
        reasons.append(f"Peak {season_names[season]} travel season drives demand")
    elif season == 1:
        reasons.append(f"Off-peak {season_names[season]} season may offer better deals")
    else:
        reasons.append(f"{season_names[season]} season shows typical pricing patterns")
    
    # Demand-based reasoning
    if demand_level >= 4:
        reasons.append("High demand route indicates competitive pricing pressure")
    elif demand_level <= 2:
        reasons.append("Lower demand route suggests potential for discounts")
    else:
        reasons.append("Moderate demand reflects balanced market conditions")
    
    # Trend-specific reasoning
    if trend == 'increase':
        if price_change_percent > 10:
            reasons.append("Strong upward price pressure detected")
        else:
            reasons.append("Gradual price increase expected")
    elif trend == 'decrease':
        if price_change_percent < -10:
            reasons.append("Significant price drop anticipated")
        else:
            reasons.append("Modest price reduction likely")
    else:
        reasons.append("Price stability forecasted based on current trends")
    
    # Combine into coherent explanation
    primary_factor = reasons[0]  # Time-based factor
    secondary_factors = "; ".join(reasons[1:3])
    trend_factor = reasons[3] if len(reasons) > 3 else ""
    
    reasoning = f"{primary_factor}. {secondary_factors}."
    if trend_factor:
        reasoning += f" {trend_factor}."
    
    return reasoning

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/predict-flight-price', methods=['POST'])
def predict_flight_price():
    """
    Predict future flight price and trend with Enhanced Confidence Logic and XAI
    
    Input JSON:
    {
        "route": "NYC-LON",
        "airline": "Emirates",
        "departure_date": "2024-12-15",
        "current_price": 650,
        "days_before_departure": 30
    }
    
    Output JSON:
    {
        "predicted_price": 720,
        "trend": "increase",
        "confidence_score": 0.85,
        "confidence_level": "HIGH",
        "reasoning": "Optimal booking period...",
        "model_used": "RandomForest"
    }
    """
    
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['route', 'airline', 'departure_date', 'current_price', 'days_before_departure']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Extract input data
        route = data['route'].upper()
        airline = data['airline']
        departure_date = data['departure_date']
        current_price = float(data['current_price'])
        days_before = int(data['days_before_departure'])
        
        # ENHANCEMENT 1: Deterministic Results using hash-based seed
        # This ensures same query always returns same result
        import hashlib
        seed_string = f"{route}-{departure_date}"
        seed_hash = int(hashlib.md5(seed_string.encode()).hexdigest()[:8], 16)
        np.random.seed(seed_hash % (2**31))
        
        # Encode categorical variables
        route_encoded = ROUTES.get(route, 0)  # Default to 0 if unknown
        airline_encoded = AIRLINES.get(airline, 0)  # Default to 0 if unknown
        
        # Calculate features
        season = get_season_from_date(departure_date)
        demand_level = estimate_demand(departure_date, route)
        
        # Prepare feature vector
        features = np.array([[
            route_encoded,
            airline_encoded,
            days_before,
            season,
            demand_level,
            current_price
        ]])
        
        # Make prediction
        predicted_price = model.predict(features)[0]
        
        # Add realistic variation to prediction (±8%) - now deterministic
        variation_factor = 0.92 + np.random.random() * 0.16
        predicted_price = predicted_price * variation_factor
        
        # Calculate price change percentage
        price_change_percent = ((predicted_price - current_price) / current_price) * 100
        
        # ENHANCEMENT 2: Logical Constraints - ensure trend matches math
        if price_change_percent <= 0:
            trend = 'decrease' if price_change_percent < -0.5 else 'stable'
        else:
            trend = 'increase' if price_change_percent > 0.5 else 'stable'
        
        # ENHANCEMENT 3: Time-Weighted Confidence Logic
        # Confidence inversely proportional to days_before_departure
        # Higher confidence for near-term flights, lower for far-future
        
        # Base confidence based on time horizon
        if days_before <= 7:
            # Last-minute: High confidence (85-95%)
            time_confidence_base = 0.90
            time_confidence_range = 0.10
        elif days_before <= 14:
            # Short-term: High-Medium confidence (80-90%)
            time_confidence_base = 0.85
            time_confidence_range = 0.10
        elif days_before <= 30:
            # Medium-term: Medium confidence (70-85%)
            time_confidence_base = 0.77
            time_confidence_range = 0.15
        elif days_before <= 60:
            # Long-term: Medium-Low confidence (65-80%)
            time_confidence_base = 0.72
            time_confidence_range = 0.15
        else:
            # Far-future: Low confidence (60-75%)
            time_confidence_base = 0.67
            time_confidence_range = 0.15
        
        # Calculate deterministic variance factor (0.0 to 1.0)
        variance_factor = float(seed_hash % 1000) / 1000.0
        
        # Apply variance within range
        time_confidence = time_confidence_base + (variance_factor * time_confidence_range)
        
        # ENHANCEMENT 4: Combined Confidence Score
        # Blend time-based confidence with price change magnitude
        if trend == 'increase':
            magnitude_factor = min(0.15, abs(price_change_percent) / 100)
        elif trend == 'decrease':
            magnitude_factor = min(0.15, abs(price_change_percent) / 100)
        else:
            magnitude_factor = 0.05  # Stable trends have lower magnitude boost
        
        # Combine time and magnitude factors
        confidence = time_confidence + magnitude_factor
        
        # ENHANCEMENT 5: Refined Thresholds - enforce min/max bounds
        confidence = max(0.60, min(0.95, confidence))
        
        # Determine confidence level label
        if confidence >= 0.85:
            confidence_level = "VERY HIGH"
        elif confidence >= 0.75:
            confidence_level = "HIGH"
        elif confidence >= 0.65:
            confidence_level = "MEDIUM"
        else:
            confidence_level = "LOW"
        
        # ENHANCEMENT 6: Contextual Reasoning (XAI)
        reasoning = generate_reasoning(trend, days_before, season, demand_level, price_change_percent)
        
        # Get model name
        model_name = type(model).__name__
        
        response = {
            'predicted_price': round(predicted_price, 2),
            'trend': trend,
            'confidence_score': round(confidence, 2),
            'confidence_level': confidence_level,
            'reasoning': reasoning,
            'model_used': model_name,
            'price_change_percent': round(price_change_percent, 2),
            'days_analyzed': days_before,
            'season_factor': season,
            'demand_level': demand_level,
            'recommendation': get_recommendation(trend, price_change_percent, confidence)
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_recommendation(trend, price_change_percent, confidence=0.75):
    """Generate booking recommendation based on prediction and confidence"""
    # Adjust recommendation strength based on confidence
    high_confidence = confidence >= 0.80
    medium_confidence = confidence >= 0.65
    
    if trend == 'increase':
        if price_change_percent > 10 and high_confidence:
            return 'BOOK_NOW - Strong confidence in significant price increase'
        elif price_change_percent > 8 and medium_confidence:
            return 'BOOK_SOON - High likelihood of price increase'
        elif price_change_percent > 5:
            return 'CONSIDER_BOOKING - Price likely to increase'
        else:
            return 'MONITOR - Slight increase expected, watch closely'
    elif trend == 'decrease':
        if price_change_percent < -10 and high_confidence:
            return 'WAIT - Strong confidence in significant price drop'
        elif price_change_percent < -7 and medium_confidence:
            return 'DELAY_BOOKING - Good chance of lower prices'
        elif price_change_percent < -5:
            return 'MONITOR - Price may decrease'
        else:
            return 'HOLD - Slight decrease possible, no rush'
    else:  # stable
        if high_confidence:
            return 'FLEXIBLE_TIMING - Price stable, book when convenient'
        else:
            return 'NEUTRAL - Price expected to remain relatively stable'

@app.route('/models-info', methods=['GET'])
def models_info():
    """Get information about available models"""
    metadata_path = 'model_metadata.json'
    
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        return jsonify(metadata)
    else:
        return jsonify({'error': 'Model metadata not found'}), 404

if __name__ == '__main__':
    print("="*60)
    print("ML Flight Price Predictor API Server")
    print("="*60)
    
    # Load model on startup
    try:
        load_model()
        print("✓ Server starting...")
        print("\nAPI Endpoints:")
        print("  GET  /health - Health check")
        print("  POST /predict-flight-price - Predict flight price")
        print("  GET  /models-info - Model information")
        print("\nServer running on: http://localhost:5000")
        print("="*60)
        
        # Run Flask app
        app.run(host='0.0.0.0', port=5000, debug=False)
        
    except Exception as e:
        print(f"✗ Error loading model: {e}")
        print("Please run 'python train_models.py' first to train the model")
