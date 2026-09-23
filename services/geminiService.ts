import { Flight, PredictionAnalysis, RiskAnalysis, TripItinerary } from '../types';
import { searchFlightOffers } from './amadeusService';
import { analyzePriceIntelligence, convertToPredictionAnalysis } from './priceIntelligenceEngine';
import { analyzeTravelRisk, convertToRiskAnalysis } from './travelRiskEngine';

export const SECURE_AI_UNAVAILABLE_MESSAGE =
  'This AI feature is temporarily unavailable while Gemini is moved behind the secure SkyWings server. No browser API key is used.';

/**
 * Flight search never fabricates inventory. The contained Amadeus adapter
 * currently validates input and then reports that verified inventory is
 * unavailable until the Phase 2 server proxy is implemented.
 */
export const findRealFlights = async (
  origin: string,
  destination: string,
  date: string,
  returnDate?: string,
  passengers?: string,
  travelClass?: string
): Promise<Flight[]> => {
  const adults = passengers ? Number.parseInt(passengers, 10) || 1 : 1;
  return searchFlightOffers(origin, destination, date, returnDate, adults, travelClass);
};

/** Local deterministic price heuristic. This is not live market intelligence. */
export const analyzeFlightPrice = async (
  flight: Flight,
  allFlights?: Flight[]
): Promise<PredictionAnalysis> => {
  const priceData = analyzePriceIntelligence(allFlights || [flight], flight);
  return convertToPredictionAnalysis(priceData, flight);
};

/** Local rule-based demo risk analysis. This is not real-time safety data. */
export const analyzeTripRisk = async (
  destination: string,
  date: string
): Promise<RiskAnalysis> => {
  const riskData = analyzeTravelRisk(destination, date);
  return convertToRiskAnalysis(riskData);
};

export const getSmartTravelTips = async (_destination: string): Promise<string> =>
  SECURE_AI_UNAVAILABLE_MESSAGE;

export const generateTripItinerary = async (
  _destination: string,
  _typeAndLength: string,
  _season: string,
  _hobbies: string,
  _language: 'en' | 'ar' = 'en'
): Promise<TripItinerary | null> => null;

export const getVisaRequirements = async (
  _citizenship: string,
  _destination: string
): Promise<string> => SECURE_AI_UNAVAILABLE_MESSAGE;

export const generatePackingList = async (
  _destination: string,
  _duration: string
): Promise<string[]> => [SECURE_AI_UNAVAILABLE_MESSAGE];
