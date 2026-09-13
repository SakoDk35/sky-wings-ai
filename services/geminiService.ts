
import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { Flight, PredictionAnalysis, RiskAnalysis, TripItinerary } from "../types";
import { searchFlightOffers } from "./amadeusService";
import { analyzePriceIntelligence, convertToPredictionAnalysis } from "./priceIntelligenceEngine";
import { analyzeTravelRisk, convertToRiskAnalysis } from "./travelRiskEngine";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Model Constants
const REASONING_MODEL = 'gemini-3-flash-preview'; 

/**
 * Retry configuration for API calls
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 2000, // 2 seconds
  maxDelayMs: 8000, // 8 seconds
};

/**
 * Check if error is a 503 Service Unavailable or similar transient error
 */
const isRetryableError = (error: any): boolean => {
  const errorMessage = error?.message || '';
  const statusCode = error?.status || error?.code;
  
  // Check for 503, 502, 504, or UNAVAILABLE status
  return (
    statusCode === 503 || 
    statusCode === 502 || 
    statusCode === 504 ||
    statusCode === 'UNAVAILABLE' ||
    errorMessage.includes('503') ||
    errorMessage.includes('UNAVAILABLE') ||
    errorMessage.includes('high demand') ||
    errorMessage.includes('service unavailable')
  );
};

/**
 * Sleep utility function
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute API call with retry logic for 503 errors
 * Implements exponential backoff
 */
export const executeWithRetry = async <T>(
  apiCall: () => Promise<T>,
  operationName: string = 'API call'
): Promise<T> => {
  let lastError: any;
  let delay = RETRY_CONFIG.initialDelayMs;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const result = await apiCall();
      
      // Log if we had to retry
      if (attempt > 0) {
        console.log(`✓ ${operationName} succeeded after ${attempt} retry(s)`);
      }
      
      return result;
      
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      if (isRetryableError(error) && attempt < RETRY_CONFIG.maxRetries) {
        console.warn(
          `⚠ ${operationName} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}) - ${error?.message || '503 Service Unavailable'}. Retrying in ${delay/1000}s...`
        );
        
        // Wait before retrying (exponential backoff)
        await sleep(delay);
        delay = Math.min(delay * 2, RETRY_CONFIG.maxDelayMs);
        continue;
      }
      
      // Non-retryable error or max retries reached
      console.error(`✗ ${operationName} failed:`, error?.message || error);
      throw error;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}; 

export const createChatSession = (systemInstruction?: string): Chat => {
  return ai.chats.create({
    model: REASONING_MODEL,
    config: {
      systemInstruction: systemInstruction || "You are Sky Wings, an expert AI travel assistant. You help users find flights, analyze prices, and manage risks. Keep responses concise, professional, and helpful.",
    },
  });
};

// Helper to safely parse flight JSON
const parseFlights = (jsonStr: string): Flight[] => {
  try {
    // aggressive cleanup for potential markdown or stray text
    const cleaned = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    // find the first [ and last ]
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    
    if (firstBracket === -1 || lastBracket === -1) return [];
    
    const jsonOnly = cleaned.substring(firstBracket, lastBracket + 1);
    
    const parsed = JSON.parse(jsonOnly);
    let flights: Flight[] = [];
    
    if (Array.isArray(parsed)) {
      flights = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).flights)) {
      flights = (parsed as any).flights;
    }

    // Ensure IDs are unique and normalize data types
    return flights.map((f: any, i: number) => ({ 
      ...f, 
      id: f.id || `real-${Date.now()}-${i}`,
      price: typeof f.price === 'string' ? parseFloat((f.price as string).replace(/[^0-9.]/g, '')) : f.price
    }));
  } catch (e) {
    console.error("Error parsing flights JSON", e);
    return [];
  }
};

// Acts as a proxy to fetch and normalize real flight data, simulating an external API like Amadeus
export const findRealFlights = async (
  origin: string,
  destination: string,
  date: string,
  returnDate?: string,
  passengers?: string,
  travelClass?: string
): Promise<Flight[]> => {
  // Try Amadeus API first for real-time flight data
  try {
    console.log('Attempting to fetch flights from Amadeus API...');
    const adults = passengers ? parseInt(passengers, 10) || 1 : 1;
    const amadeusFlights = await searchFlightOffers(
      origin,
      destination,
      date,
      returnDate,
      adults,
      travelClass
    );
    
    if (amadeusFlights.length > 0) {
      console.log(`Successfully fetched ${amadeusFlights.length} flights from Amadeus`);
      return amadeusFlights;
    }
    
    console.log('Amadeus returned no results, falling back to Gemini AI...');
  } catch (amadeusError: any) {
    // Check if this is a validation error - these should NOT fall back to Gemini
    const errorMessage = amadeusError?.message || '';
    if (
      errorMessage.includes('cannot be in the past') ||
      errorMessage.includes('must be after departure') ||
      errorMessage.includes('Invalid date format')
    ) {
      // Re-throw validation errors so the UI can display them
      throw amadeusError;
    }
    // Other errors (network, API issues) - fall back to Gemini
    console.warn('Amadeus API failed, falling back to Gemini AI:', amadeusError);
  }

  // Fallback: Use Gemini AI with Google Search for flight data
  const prompt = `
      Find real available commercial flights from ${origin} to ${destination} departing on ${date}
      ${returnDate ? `and returning on ${returnDate}` : ''}.
      ${passengers ? `Passengers: ${passengers}` : ''}. 
      ${travelClass ? `Class: ${travelClass}` : ''}.

      Search for actual airlines, flight numbers (include return flight codes if applicable, e.g. "TK845 / TK781"), 
      precise current prices, durations, and stopover details.

      Normalize the data into a clean JSON array of flight objects.
      
      Output Schema:
      [
        {
          "id": "unique_id",
          "airline": "Airline Name",
          "flightNumber": "XX123 / XX456",
          "origin": "City (ABC)",
          "destination": "City (XYZ)",
          "departureTime": "YYYY-MM-DDTHH:MM:SS",
          "arrivalTime": "YYYY-MM-DDTHH:MM:SS",
          "price": 123, // Number only
          "duration": "Xh Ym", // Outbound duration
          "returnDuration": "Xh Ym", // Inbound duration (optional)
          "stops": 1,
          "stopDetails": "via XYZ", // e.g. "via Istanbul (IST)"
          "emissions": "150 kg"
        }
      ]
    `;

  try {
    // Attempt 1: Try with Google Search for real data
    // Wrapped in retry logic for 503 errors
    const response = await executeWithRetry(
      async () => await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        }
      }),
      'Flight search with Google'
    );

    if (response.text) {
      const flights = parseFlights(response.text);
      if (flights.length > 0) return flights;
    }
    throw new Error("No valid flight data returned from search");

  } catch (error) {
    console.warn("Real flight search with tool failed, falling back to simulation.", error);
    
    // Fallback: Generate realistic simulated data without tools
    // This handles cases where the Search tool fails (500 errors) or returns unparseable data.
    try {
       const fallbackResponse = await executeWithRetry(
         async () => await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt + "\n\n(IMPORTANT: Generate realistic simulated flight data based on typical schedules for this route. Ensure valid JSON.)",
          config: {
            responseMimeType: "application/json",
          }
        }),
        'Fallback flight search'
      );
      
      if (fallbackResponse.text) {
         return parseFlights(fallbackResponse.text);
      }
    } catch (fallbackError) {
      console.error("Fallback flight search failed:", fallbackError);
    }
    return [];
  }
};

/**
 * Local AI Price Analysis - NO EXTERNAL APIs
 * Uses statistical analysis of flight prices instead of external AI
 * 
 * IMPORTANT: This function uses PURE mathematical logic from priceIntelligenceEngine.ts
 * It does NOT call Gemini AI or any external service for price calculations.
 * All market averages, scores, and percentages are deterministically calculated.
 */
export const analyzeFlightPrice = async (flight: Flight, allFlights?: Flight[]): Promise<PredictionAnalysis> => {
  try {
    console.log('[PriceIntelligence] Starting deterministic price analysis...');
    console.log('[PriceIntelligence] Using engine: priceIntelligenceEngine.ts');
    console.log('[PriceIntelligence] Analyzing flight:', flight.id, 'Route:', flight.origin, '→', flight.destination);
    
    // Use local price intelligence engine (NO AI - pure math)
    const priceIntelligence = analyzePriceIntelligence(allFlights || [flight], flight);
    const predictionAnalysis = convertToPredictionAnalysis(priceIntelligence, flight);
    
    console.log('[PriceIntelligence] ✓ Market Average calculated:', `$${predictionAnalysis.marketAverage}`);
    console.log('[PriceIntelligence] ✓ Price vs Market:', `${predictionAnalysis.priceDifferencePercent}%`);
    console.log('[PriceIntelligence] ✓ Score:', `${predictionAnalysis.score}/10`);
    console.log('[PriceIntelligence] ✓ Analysis source: priceIntelligenceEngine.ts (NOT Gemini AI)');
    console.log('[PriceIntelligence] ✓ Sample size:', priceIntelligence.sampleSize, 'flights');
    console.log('[PriceIntelligence] ✓ Data-driven:', !priceIntelligence.sampleSize ? 'No (simulated fallback)' : 'Yes (real-time data)');
    
    return predictionAnalysis;
  } catch (error) {
    console.error('[PriceIntelligence] ✗ Deterministic analysis failed:', error);
    throw error; // Re-throw instead of falling back to mock
  }
};

/**
 * Local AI Risk Analysis - NO EXTERNAL APIs  
 * Uses internal safety database and seasonal weather logic
 * 
 * IMPORTANT: This function uses PURE deterministic logic from travelRiskEngine.ts
 * It does NOT call Gemini AI or any external service for risk calculations.
 * All safety scores, weather risks, and overall risk levels are rule-based.
 */
export const analyzeTripRisk = async (destination: string, date: string): Promise<RiskAnalysis> => {
  try {
    console.log('[TravelRisk] Starting deterministic risk analysis...');
    console.log('[TravelRisk] Using engine: travelRiskEngine.ts');
    console.log('[TravelRisk] Analyzing destination:', destination, 'Date:', date);
    
    // Use local travel risk engine (NO AI - pure rule-based logic)
    const riskIntelligence = analyzeTravelRisk(destination, date);
    const riskAnalysis = convertToRiskAnalysis(riskIntelligence);
    
    console.log('[TravelRisk] ✓ Safety Score calculated:', `${riskIntelligence.safetyScore}/100`);
    console.log('[TravelRisk] ✓ Risk Level:', riskIntelligence.riskLevel);
    console.log('[TravelRisk] ✓ Weather Alerts:', riskIntelligence.weatherAlerts.length, 'alerts');
    console.log('[TravelRisk] ✓ Overall Risk:', riskAnalysis.overallRisk);
    console.log('[TravelRisk] ✓ Analysis source: travelRiskEngine.ts (NOT Gemini AI)');
    console.log('[TravelRisk] ✓ Method: Internal safety database + seasonal rules');
    
    return riskAnalysis;
  } catch (error) {
    console.error('[TravelRisk] ✗ Deterministic risk analysis failed:', error);
    throw error; // Re-throw instead of falling back to mock
  }
};

export const getSmartTravelTips = async (destination: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: REASONING_MODEL,
            contents: `Give me 3 short, unique, pro-traveler tips for visiting ${destination}. Format as a bulleted list.`
        });
        return response.text || "No tips available.";
    } catch (e) {
        return "Travel tips currently unavailable.";
    }
}

export const generateTripItinerary = async (
  destination: string,
  typeAndLength: string,
  season: string,
  hobbies: string,
  language: 'en' | 'ar' = 'en'
): Promise<TripItinerary | null> => {
  try {
    const prompt = `
      Create a highly detailed, professional travel itinerary for ${destination}.
      Type & Duration: ${typeAndLength}
      Season: ${season}
      User Hobbies: ${hobbies}
      
      IMPORTANT: Generate the content in ${language === 'ar' ? 'Arabic' : 'English'}.

      Structure the response exactly like a high-end travel blog or document.
      Break each day into sections like "Morning", "Afternoon", "Dinner", "Sweet Stop", etc.
      
      Return a JSON object with this EXACT structure:
      {
        "title": "A catchy title for the full trip",
        "days": [
          {
            "header": "Day 1 — [Title of the day]",
            "sections": [
              {
                "title": "Morning / Midday (context)", 
                "items": ["Activity 1 details", "Activity 2 details"]
              }
            ]
          }
        ],
        "practicalTips": ["Tip 1", "Tip 2"]
      }
    `;

    // Wrapped in retry logic for 503 errors - longer timeout for large itineraries
    const response = await executeWithRetry(
      async () => await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      }),
      'Trip itinerary generation'
    );

    if (response.text) {
      const parsed = JSON.parse(response.text);
      if (!parsed.days || !Array.isArray(parsed.days)) {
          parsed.days = [];
      }
      return parsed as TripItinerary;
    }
    return null;
  } catch (error) {
    console.error("Trip Generation Failed", error);
    return null;
  }
};

export const getVisaRequirements = async (citizenship: string, destination: string): Promise<string> => {
    try {
        const prompt = `
          I hold a passport from ${citizenship}. What are the visa requirements for visiting ${destination}?
          Provide a concise summary including:
          1. Visa Free/Visa Required
          2. Max stay duration
          3. Key documents needed (if any)
          
          Format as a simple, easy-to-read list.
        `;
        const response = await ai.models.generateContent({
            model: REASONING_MODEL,
            contents: prompt
        });
        return response.text || "Could not retrieve visa information.";
    } catch (e) {
        return "Visa information currently unavailable.";
    }
};

export const generatePackingList = async (destination: string, duration: string): Promise<string[]> => {
    try {
        const prompt = `
            Generate a concise, smart packing list for a trip to ${destination} lasting ${duration}.
            Return ONLY a JSON array of strings (e.g. ["Passport", "Universal Adapter", "Raincoat"]).
            Include 10-15 essential items specific to the location and typical weather.
        `;
        const response = await ai.models.generateContent({
            model: REASONING_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });
        
        const text = response.text;
        if (!text) return ["Passport", "Charger", "Clothes", "Toiletries"];
        return JSON.parse(text);
    } catch (e) {
        console.error("Packing list generation failed", e);
        return ["Passport", "Travel Documents", "Universal Adapter", "Phone Charger", "Daily Clothes", "Toiletry Bag", "Comfortable Shoes", "Medication"];
    }
};
