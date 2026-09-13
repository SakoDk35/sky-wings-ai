"""
ML Model Training Module
Trains and evaluates three regression models for flight price prediction
Automatically selects the best performing model
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os

def load_training_data(filepath='training_data.csv'):
    """Load training data from CSV"""
    if not os.path.exists(filepath):
        print(f"Training data not found. Generating new data...")
        from data_generator import save_training_data
        save_training_data(filepath)
    
    return pd.read_csv(filepath)

def train_and_evaluate_models():
    """
    Train three ML models and select the best one
    
    Returns:
    - best_model: The model with highest R² score
    - model_results: Dictionary with all model metrics
    """
    
    # Load data
    print("Loading training data...")
    df = load_training_data()
    
    # Prepare features and target
    feature_cols = [
        'route_encoded',
        'airline_encoded', 
        'days_before_departure',
        'season',
        'demand_level',
        'current_price'
    ]
    
    X = df[feature_cols]
    y = df['future_price']
    
    # Split data (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"Training set size: {len(X_train)}")
    print(f"Test set size: {len(X_test)}")
    
    # Initialize models
    models = {
        'LinearRegression': LinearRegression(),
        'RandomForest': RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        ),
        'GradientBoosting': GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
    }
    
    results = {}
    
    # Train and evaluate each model
    for name, model in models.items():
        print(f"\n{'='*50}")
        print(f"Training {name}...")
        print('='*50)
        
        # Train
        model.fit(X_train, y_train)
        
        # Predict on test set
        y_pred = model.predict(X_test)
        
        # Calculate metrics
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        # Also calculate accuracy on training set
        train_r2 = r2_score(y_train, model.predict(X_train))
        
        results[name] = {
            'model': model,
            'mae': mae,
            'rmse': rmse,
            'r2': r2,
            'train_r2': train_r2,
            'y_pred_sample': y_pred[:5].tolist()
        }
        
        print(f"MAE: ${mae:.2f}")
        print(f"RMSE: ${rmse:.2f}")
        print(f"R² Score: {r2:.4f}")
        print(f"Train R²: {train_r2:.4f}")
        
        if name == 'LinearRegression':
            print(f"\nCoefficients:")
            for feat, coef in zip(feature_cols, model.coef_):
                print(f"  {feat}: {coef:.4f}")
    
    # Select best model based on R² score
    best_model_name = max(results.keys(), key=lambda k: results[k]['r2'])
    best_model = results[best_model_name]['model']
    
    print(f"\n{'='*50}")
    print(f"✓ Best Model: {best_model_name}")
    print(f"  R² Score: {results[best_model_name]['r2']:.4f}")
    print(f"  MAE: ${results[best_model_name]['mae']:.2f}")
    print('='*50)
    
    return best_model, results, best_model_name

def save_best_model(model, model_name, filepath='best_model.pkl'):
    """Save the best model to disk"""
    joblib.dump(model, filepath)
    print(f"✓ Model saved to {filepath}")

def save_model_metadata(results, filepath='model_metadata.json'):
    """Save model evaluation metadata"""
    import json
    
    metadata = {
        'best_model': max(results.keys(), key=lambda k: results[k]['r2']),
        'models_evaluated': list(results.keys()),
        'metrics': {
            name: {
                'mae': float(data['mae']),
                'rmse': float(data['rmse']),
                'r2': float(data['r2']),
                'train_r2': float(data['train_r2'])
            }
            for name, data in results.items()
        }
    }
    
    with open(filepath, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"✓ Model metadata saved to {filepath}")

if __name__ == '__main__':
    print("="*60)
    print("ML Flight Price Predictor - Model Training")
    print("="*60)
    
    # Train models
    best_model, results, best_model_name = train_and_evaluate_models()
    
    # Save model
    save_best_model(best_model, best_model_name)
    
    # Save metadata
    save_model_metadata(results)
    
    print("\n" + "="*60)
    print("✓ Training Complete!")
    print("="*60)
