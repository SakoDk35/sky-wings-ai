
export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  currency?: string; // ISO 4217 currency reported by the provider
  duration: string;
  stops: number;
  stopDetails?: string; // e.g. "via SHJ"
  returnDuration?: string; // e.g. "8h 20m"
  emissions?: string; // kg CO2
  amenities?: {
    baggage?: string;
    meal?: string;
    wifi?: boolean;
    power?: boolean;
    entertainment?: boolean;
  };
  aircraft?: string; // Aircraft model name
  segments?: FlightSegment[]; // Detailed segment information for flight path display
  carrierCode?: string; // IATA 2-letter carrier code for logo lookup
  provider?: 'AMADEUS' | 'SERPAPI_GOOGLE_FLIGHTS';
  providerOfferId?: string;
  numberOfBookableSeats?: number;
  lastTicketingDate?: string;
}

export interface FlightSegment {
  departure: {
   iataCode: string;
    at: string; // ISO 8601 datetime
    terminal?: string;
  };
  arrival: {
   iataCode: string;
    at: string; // ISO 8601 datetime
    terminal?: string;
  };
  carrierCode: string;
  flightNumber: string;
  aircraft?: string;
  duration: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface DemoBooking {
  id: number;
  userId: number;
  demoReference: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  createdAt: string;
}

export interface PredictionAnalysis {
  recommendation?: 'BUY_NOW' | 'WAIT' | 'MONITOR'; // Optional - handled by ML Prediction instead
  confidence: number;
  reasoning: string;
  predictedPriceChange: number; // Percentage
  // Local price intelligence fields (no external AI)
  priceCategory: 'cheap' | 'average' | 'expensive';
  score?: number; // Removed - no grading system in Price Intelligence
  marketAverage: number;
  priceDifferencePercent: number;
  explanation: string;
  classification?: 'GREAT_DEAL' | 'GOOD_PRICE' | 'FAIR' | 'ABOVE_AVERAGE' | 'EXPENSIVE'; // Detailed 5-category classification
}

export interface MLPrediction {
  predictedPrice: number;
  trend: 'increase' | 'decrease' | 'stable';
  priceChangePercent: number;
  summary: string;
  currency: 'USD';
  outputLabel: string;
}

export type MLPredictionState =
  | { status: 'loading' }
  | { status: 'result'; prediction: MLPrediction }
  | { status: 'unsupported'; code: string; message: string }
  | { status: 'unavailable'; message: string };

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export enum AppView {
  HOME = 'HOME',
  SEARCH = 'SEARCH',
  DASHBOARD = 'DASHBOARD',
  ANALYTICS = 'ANALYTICS',
}

export interface AnalyticData {
  name: string;
  value: number;
  category?: string;
}

// Updated Types for AI Planner to match the specific "screenshot" style layout
export interface TripDaySection {
  title: string; // e.g. "Morning / Midday (heat-friendly)"
  items: string[]; // List of activities/points
}

export interface TripDay {
  header: string; // e.g. "Day 1 — Old Doha..."
  sections: TripDaySection[];
}

export interface TripItinerary {
  title: string;
  days: TripDay[];
  practicalTips: string[]; // "Practical Food & Culture Tips"
  footerNote?: string;
}
