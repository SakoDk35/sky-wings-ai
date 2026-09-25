"""
Example Python Client for ML Flight Price Predictor
Demonstrates how to integrate the ML prediction service
"""

import requests
import json
from datetime import date, timedelta

class FlightPricePredictor:
    """Client for interacting with ML Flight Price Prediction API"""
    
    def __init__(self, base_url='http://localhost:5000'):
        self.base_url = base_url
    
    def predict_price(self, departure_date, current_price, days_before, total_duration_minutes, stops, currency='USD'):
        """
        Get price prediction for a flight
        
        Args:
            departure_date (str): Departure date in YYYY-MM-DD format
            current_price (float): Current ticket price
            days_before (int): Days before departure
            total_duration_minutes (int): Provider total flight duration
            stops (int): Provider stop count
            
        Returns:
            dict: Prediction results
        """
        
        endpoint = f"{self.base_url}/predict-flight-price"
        
        payload = {
            "departure_date": departure_date,
            "current_price": current_price,
            "days_before_departure": days_before,
            "total_duration_minutes": total_duration_minutes,
            "stops": stops,
            "currency": currency
        }
        
        try:
            response = requests.post(endpoint, json=payload)
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Error connecting to prediction service: {e}")
            return None
    
    def health_check(self):
        """Check if the ML service is running"""
        try:
            response = requests.get(f"{self.base_url}/health")
            return response.json()
        except:
            return {'status': 'unavailable'}
    
    def get_model_info(self):
        """Get information about trained models"""
        try:
            response = requests.get(f"{self.base_url}/models-info")
            return response.json()
        except:
            return None


# Example usage
if __name__ == '__main__':
    # Initialize client
    predictor = FlightPricePredictor()
    
    # Check health
    print("Checking ML service health...")
    health = predictor.health_check()
    print(f"Service Status: {health.get('status', 'unknown')}")
    print(f"Model Loaded: {health.get('model_loaded', False)}\n")
    
    # Example predictions
    test_flights = [
        {
            'departure_date': (date.today() + timedelta(days=30)).isoformat(),
            'current_price': 650,
            'days_before': 30,
            'total_duration_minutes': 435,
            'stops': 0,
            'currency': 'USD'
        },
        {
            'departure_date': (date.today() + timedelta(days=7)).isoformat(),
            'current_price': 900,
            'days_before': 7,
            'total_duration_minutes': 780,
            'stops': 1,
            'currency': 'USD'
        },
        {
            'departure_date': (date.today() + timedelta(days=60)).isoformat(),
            'current_price': 150,
            'days_before': 60,
            'total_duration_minutes': 90,
            'stops': 0,
            'currency': 'USD'
        }
    ]
    
    print("="*70)
    print("Flight Price Predictions")
    print("="*70)
    
    for i, flight in enumerate(test_flights, 1):
        print(f"\n{i}. Synthetic V2 example")
        print(f"   Current Price: ${flight['current_price']}")
        print(f"   Days Before: {flight['days_before']}")
        
        result = predictor.predict_price(**flight)
        
        if result:
            print(f"   ✓ Predicted Price: ${result['predicted_price']}")
            print(f"   ✓ Trend: {result['trend'].upper()}")
            print(f"   ✓ Model Difference: {result['price_change_percent']:.1f}%")
            print(f"   ✓ Experimental Summary: {result['summary']}")
        else:
            print("   ✗ Could not get prediction")
    
    print("\n" + "="*70)
    
    # Get model info
    print("\nModel Information:")
    model_info = predictor.get_model_info()
    if model_info and 'best_model' in model_info:
        print(f"Best Model: {model_info['best_model']}")
        print(f"Models Evaluated: {', '.join(model_info['models_evaluated'])}")
        
        if 'metrics' in model_info:
            best = model_info['best_model']
            print(f"{best} R² Score: {model_info['metrics'][best]['r2']:.4f}")
