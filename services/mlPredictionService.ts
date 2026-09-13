/**
 * ML Flight Price Prediction Service
 * Calls the Python Flask ML prediction API to get future price forecasts
 */

import { Flight } from '../types';

export interface MLPrediction {
  predictedPrice: number;
  trend: 'increase' | 'decrease' | 'stable';
  confidenceScore: number;
  priceChangePercent?: number;
  recommendation: string;
}

interface MLPredictionResponse {
  predicted_price: number;
  trend: 'increase' | 'decrease' | 'stable';
  confidence_score: number;
  price_change_percent?: number;
  recommendation: string;
}

/**
 * Extract airport code from flight origin/destination string
 * e.g., "New York (JFK)" -> "JFK", "London (LHR)" -> "LHR"
 */
const extractAirportCode = (location: string): string => {
  const match = location.match(/\(([A-Z]{3})\)$/);
  if (match) {
    return match[1];
  }
  
  // Fallback: try to find any 3-letter uppercase code
  const fallbackMatch = location.match(/[A-Z]{3}/);
  return fallbackMatch ? fallbackMatch[0] : 'XXX';
};

/**
 * Get ML price prediction for a flight
 * 
 * @param flight - Flight object with origin, destination, departure time, and price
 * @returns MLPrediction or null if service unavailable
 */
export const getMLPricePrediction = async (flight: Flight): Promise<MLPrediction | null> => {
  try {
    // Extract airport codes
    const originCode = extractAirportCode(flight.origin);
    const destinationCode = extractAirportCode(flight.destination);
    
    // Construct route (e.g., "AMS-IST")
    const route = `${originCode}-${destinationCode}`;
    
    // Extract departure date (YYYY-MM-DD format)
    const departureDate = flight.departureTime.split('T')[0];
    
    // Prepare request payload (days_before_departure now calculated server-side)
    const payload = {
      route: route,
      airline: flight.airline,
      departure_date: departureDate,
      current_price: flight.price
      // days_before_departure automatically calculated by server based on departure_date
    };
    
    // Call ML prediction API
    const response = await fetch('http://localhost:5000/predict-flight-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      if (response.status === 404 || response.status === 500) {
        console.warn('ML prediction service returned error:', response.status);
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: MLPredictionResponse = await response.json();
    
    // Map response to our format
    const prediction: MLPrediction = {
      predictedPrice: data.predicted_price,
      trend: data.trend,
      confidenceScore: data.confidence_score,
      priceChangePercent: data.price_change_percent,
      recommendation: data.recommendation
    };
    
    console.log('✓ ML price prediction successful:', prediction);
    return prediction;
    
  } catch (error: any) {
    // Graceful failure - ML service might not be running
    console.warn('ML prediction service unavailable:', error?.message || error);
    return null;
  }
};
