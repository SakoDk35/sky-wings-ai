"""
Data Generator Module
Generates synthetic flight pricing data for model training
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random

def generate_synthetic_data(num_samples=10000):
    """
    Generate synthetic flight pricing dataset with realistic patterns
    
    Features:
    - route_encoded: Numeric encoding of route
    - airline_encoded: Numeric encoding of airline
    - days_before_departure: Days until flight
    - season: Time of year (1-4)
    - demand_level: Travel demand (1-5)
    - current_price: Current ticket price
    
    Target:
    - future_price: Price at departure
    """
    
    np.random.seed(42)
    random.seed(42)
    
    # Popular routes with base prices
    routes = {
        'NYC-LON': 600,
        'LON-PAR': 150,
        'DXB-NYC': 900,
        'TYO-SIN': 500,
        'PAR-ROM': 180,
        'BER-MAD': 200,
        'LAX-TYO': 800,
        'SIN-BKK': 200,
        'DOH-LON': 700,
        'IST-DXB': 400,
        'NYC-LAX': 350,
        'LON-DXB': 550,
        'PAR-NYC': 650,
        'BKK-SIN': 220,
        'ROM-BER': 190
    }
    
    # Airlines with quality multipliers
    airlines = {
        'Emirates': 1.15,
        'Qatar': 1.12,
        'Singapore': 1.18,
        'Lufthansa': 1.10,
        'British Airways': 1.08,
        'Air France': 1.07,
        'Turkish': 0.95,
        'Etihad': 1.10,
        'Ryanair': 0.75,
        'EasyJet': 0.78,
        'Spirit': 0.70,
        'Delta': 1.05,
        'United': 1.03,
        'American': 1.02
    }
    
    data = []
    
    for _ in range(num_samples):
        # Random route and airline
        route = random.choice(list(routes.keys()))
        airline = random.choice(list(airlines.keys()))
        
        base_price = routes[route]
        airline_multiplier = airlines[airline]
        
        # Days before departure (0-120 days)
        days_before = np.random.randint(0, 121)
        
        # Season (1=Winter, 2=Spring, 3=Summer, 4=Fall)
        season = np.random.randint(1, 5)
        
        # Demand level (1-5)
        demand = np.random.randint(1, 6)
        
        # Calculate price factors
        # Prices typically increase as departure approaches
        if days_before < 7:
            urgency_factor = 1.4  # Last minute
        elif days_before < 14:
            urgency_factor = 1.25
        elif days_before < 30:
            urgency_factor = 1.15
        elif days_before < 60:
            urgency_factor = 1.05
        else:
            urgency_factor = 0.95  # Book early
        
        # Seasonal demand
        season_factor = 1.0 + (season - 2) * 0.1  # Summer higher, winter lower
        
        # Demand factor
        demand_factor = 1.0 + (demand - 3) * 0.15
        
        # Calculate current price
        current_price = base_price * airline_multiplier * urgency_factor * season_factor * demand_factor
        
        # Add some noise (±5%)
        noise = np.random.normal(1.0, 0.05)
        current_price = current_price * noise
        
        # Future price prediction (what price will be at departure)
        # If booking early, price likely to increase
        # If booking last minute, price likely stable or decrease slightly
        if days_before > 60:
            future_price_increase = np.random.uniform(1.15, 1.35)
        elif days_before > 30:
            future_price_increase = np.random.uniform(1.08, 1.20)
        elif days_before > 14:
            future_price_increase = np.random.uniform(1.03, 1.10)
        elif days_before > 7:
            future_price_increase = np.random.uniform(1.00, 1.05)
        else:
            # Last minute - could go either way
            future_price_increase = np.random.uniform(0.95, 1.02)
        
        future_price = current_price * future_price_increase
        
        # Encode categorical variables
        route_encoded = list(routes.keys()).index(route)
        airline_encoded = list(airlines.keys()).index(airline)
        
        data.append({
            'route_encoded': route_encoded,
            'airline_encoded': airline_encoded,
            'days_before_departure': days_before,
            'season': season,
            'demand_level': demand,
            'current_price': round(current_price, 2),
            'future_price': round(future_price, 2)
        })
    
    return pd.DataFrame(data)

def save_training_data(filepath='training_data.csv', num_samples=10000):
    """Generate and save training data"""
    print(f"Generating {num_samples} synthetic flight records...")
    df = generate_synthetic_data(num_samples)
    df.to_csv(filepath, index=False)
    print(f"✓ Training data saved to {filepath}")
    print(f"  Shape: {df.shape}")
    print(f"  Columns: {list(df.columns)}")
    return df

if __name__ == '__main__':
    save_training_data()
