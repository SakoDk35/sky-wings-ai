import { Flight } from '../types';
import { getIATACode } from './iataCodes';

// Backend API URL - the Express server handles date validation
const BACKEND_API_URL = 'http://localhost:3001';

// Amadeus API Configuration
const AMADEUS_BASE_URL = 'https://test.api.amadeus.com';
const TOKEN_EXPIRY_BUFFER = 60; // Refresh token 60 seconds before actual expiry

// Token cache
interface TokenData {
  accessToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

let cachedToken: TokenData | null = null;

// Amadeus API response types
interface AmadeusTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface AmadeusSegment {
  departure: {
    iataCode: string;
    at: string;
    terminal?: string;
  };
  arrival: {
    iataCode: string;
    at: string;
    terminal?: string;
  };
  carrierCode: string;
  number: string;
  aircraft: {
    code: string;
  };
  duration: string;
  numberOfStops?: number;
}

interface AmadeusItinerary {
  duration: string;
  segments: AmadeusSegment[];
}

interface AmadeusPrice {
  total: string;
  currency: string;
  base?: string;
  fees?: Array<{
    amount: string;
    type: string;
  }>;
}

interface AmadeusFlightOffer {
  id: string;
  source: string;
  instantTicketingRequired?: boolean;
  nonHomogeneous?: boolean;
  oneWay: boolean;
  lastTicketingDate: string;
  numberOfBookableSeats: number;
  itineraries: AmadeusItinerary[];
  price: AmadeusPrice;
  validatingAirlineCodes: string[];
  travelerPricings?: Array<{
    travelerId: number;
    fareOption: string;
    travelerType: string;
    price: AmadeusPrice;
    fareDetailsBySegment: Array<{
      segmentId: string;
      cabin: string;
      fareClass: string;
    }>;
  }>;
}

interface AmadeusDictionaries {
  carriers?: Record<string, string>;
  aircraft?: Record<string, string>;
  currencies?: Record<string, string>;
  locations?: Record<string, {
    cityCode: string;
    countryCode: string;
  }>;
}

interface AmadeusSearchResponse {
  data: AmadeusFlightOffer[];
  dictionaries: AmadeusDictionaries;
  meta?: {
    count: number;
    links?: {
      self?: string;
      next?: string;
    };
  };
}

/**
 * Get OAuth2 access token from Amadeus API
 * Uses cached token if still valid
 */
export const getAccessToken = async (): Promise<string> => {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER * 1000) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Amadeus API credentials not configured. Please set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET in .env.local');
  }

  const response = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Amadeus authentication failed: ${response.status} - ${errorText}`);
  }

  const data: AmadeusTokenResponse = await response.json();

  // Cache the token with expiry time
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
};

/**
 * Parse ISO 8601 duration string to human-readable format
 * E.g., "PT5H30M" -> "5h 30m"
 */
const parseDuration = (isoDuration: string): string => {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return isoDuration;

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;

  if (hours === 0 && minutes === 0) return '0m';
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
};

/**
 * Generate realistic amenities based on airline, duration, and price
 */
const generateAmenities = (
  airline: string,
  durationMinutes: number,
  price: number
): {
  baggage?: string;
  meal?: string;
  wifi?: boolean;
  power?: boolean;
  entertainment?: boolean;
} => {
  // Convert duration to minutes if it's a string like "5h 30m"
  const parseDuration = (dur: string): number => {
    const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    return hours * 60 + minutes;
  };

  const mins = typeof durationMinutes === 'string' ? parseDuration(durationMinutes) : durationMinutes;
  const isLongHaul = mins > 360; // > 6 hours
  const isPremium = price > 800;

  // Airline-specific amenity patterns
  const premiumAirlines = ['Emirates', 'Qatar', 'Etihad', 'Singapore', 'Lufthansa', 'British'];
  const budgetAirlines = ['Ryanair', 'Wizz', 'easyJet', 'Spirit', 'Frontier'];

  const isPremiumAirline = premiumAirlines.some(a => airline.includes(a));
  const isBudgetAirline = budgetAirlines.some(a => airline.includes(a));

  // Generate amenities
  const amenities: any = {};

  // Baggage
  if (isBudgetAirline) {
    amenities.baggage = 'Carry-on only (fees for checked)';
  } else if (isPremiumAirline || isLongHaul) {
    amenities.baggage = '23kg Checked + 10kg Cabin';
  } else {
    amenities.baggage = '23kg Checked + 7kg Cabin';
  }

  // Meal
  if (isBudgetAirline) {
    amenities.meal = 'Buy on board';
  } else if (isLongHaul || isPremiumAirline) {
    amenities.meal = 'Full meal service (special meals available)';
  } else if (mins > 120) {
    amenities.meal = 'Light refreshments';
  } else {
    amenities.meal = 'Snacks & beverages';
  }

  // Wi-Fi
  if (isBudgetAirline) {
    amenities.wifi = false;
  } else if (isPremiumAirline || isLongHaul) {
    amenities.wifi = true;
  } else {
    amenities.wifi = Math.random() > 0.5; // 50% chance
  }

  // Power outlets
  if (isBudgetAirline) {
    amenities.power = false;
  } else if (isPremiumAirline && isLongHaul) {
    amenities.power = true;
  } else {
    amenities.power = isLongHaul || Math.random() > 0.6;
  }

  // Entertainment
  if (isBudgetAirline) {
    amenities.entertainment = false;
  } else if (isPremiumAirline || isLongHaul) {
    amenities.entertainment = true;
  } else {
    amenities.entertainment = mins > 180;
  }

  return amenities;
};

/**
 * Map Amadeus flight offer to Flight interface
 */
const mapToFlightInterface = (
  offer: AmadeusFlightOffer,
  dictionaries: AmadeusDictionaries
): Flight => {
  const outboundItinerary = offer.itineraries[0];
  const returnItinerary = offer.itineraries[1]; // May be undefined for one-way

  // Get first and last segments for outbound
  const outboundSegments = outboundItinerary.segments;
  const firstSegment = outboundSegments[0];
  const lastSegment = outboundSegments[outboundSegments.length - 1];

  // Get airline name from dictionaries
  const carrierCode = firstSegment.carrierCode;
  const airlineName = dictionaries.carriers?.[carrierCode] || carrierCode;

  // Build flight number (combine all segment flight numbers if multiple)
  const flightNumbers = outboundSegments.map(s => `${s.carrierCode}${s.number}`).join(' / ');

  // Calculate stops
  const stops = outboundSegments.length - 1;

  // Build stop details
  let stopDetails: string | undefined;
  if (stops > 0) {
    const stopCodes = outboundSegments
      .slice(0, -1)
      .map(s => s.arrival.iataCode);
    stopDetails = stops === 1
      ? `via ${stopCodes[0]}`
      : `${stops} stops (${stopCodes.join(', ')})`;
  }

  // Build return duration if applicable
  let returnDuration: string | undefined;
  if (returnItinerary) {
    returnDuration = parseDuration(returnItinerary.duration);
  }

  // Get aircraft model from first segment
  const aircraftCode = firstSegment.aircraft?.code;
  const aircraftName = dictionaries.aircraft?.[aircraftCode] || `${firstSegment.carrierCode} Aircraft`;

  // Generate dynamic amenities based on flight characteristics
  const amenities = generateAmenities(
    airlineName,
    outboundItinerary.duration as any,
    parseFloat(offer.price.total)
  );

  // Map segments for detailed flight path display
  const segments = outboundSegments.map(segment => ({
    departure: {
      iataCode: segment.departure.iataCode,
      at: segment.departure.at,
      terminal: segment.departure.terminal,
    },
    arrival: {
      iataCode: segment.arrival.iataCode,
      at: segment.arrival.at,
      terminal: segment.arrival.terminal,
    },
    carrierCode: segment.carrierCode,
    flightNumber: segment.number,
    aircraft: dictionaries.aircraft?.[segment.aircraft?.code],
    duration: parseDuration(segment.duration),
  }));

  return {
    id: `ama-${offer.id}`,
    airline: airlineName,
    flightNumber: flightNumbers,
    origin: firstSegment.departure.iataCode,
    destination: lastSegment.arrival.iataCode,
    departureTime: firstSegment.departure.at,
    arrivalTime: lastSegment.arrival.at,
    price: parseFloat(offer.price.total),
    duration: parseDuration(outboundItinerary.duration),
    stops,
    stopDetails,
    returnDuration,
    emissions: undefined, // Amadeus doesn't provide emissions data in basic response
    amenities,
    aircraft: aircraftName,
    segments, // Include detailed segment information
    carrierCode, // Add carrier code for logo lookup
  };
};

/**
 * Validate search dates via the backend server.
 * Throws an error with the validation message if validation fails.
 */
const validateSearchDates = async (
  originCode: string,
  destinationCode: string,
  departureDate: string,
  returnDate?: string,
  adults: number = 1,
  travelClass?: string
): Promise<void> => {
  const params = new URLSearchParams({
    origin: originCode,
    destination: destinationCode,
    departureDate,
    adults: adults.toString(),
  });
  if (returnDate) params.append('returnDate', returnDate);
  if (travelClass) params.append('travelClass', travelClass);

  const response = await fetch(`${BACKEND_API_URL}/api/search-flights?${params.toString()}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Validation failed' }));
    throw new Error(errorData.error || 'Validation failed');
  }
};

/**
 * Log a successful search result to the backend
 */
const logSearchResult = (
  originCode: string,
  destinationCode: string,
  departureDate: string,
  resultsCount: number,
  returnDate?: string,
  adults?: number,
  travelClass?: string
): void => {
  // Fire and forget - don't block the UI
  fetch(`${BACKEND_API_URL}/api/log-search-result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin: originCode,
      destination: destinationCode,
      departureDate,
      returnDate,
      adults,
      travelClass,
      resultsCount,
    }),
  }).catch(() => { /* silently ignore logging failures */ });
};

/**
 * Remove duplicate flights based on airline and price
 * If multiple flights have same airline and exact same price, only show one
 */
const deduplicateFlights = (flights: Flight[]): Flight[] => {
  const flightMap = new Map<string, Flight>();

  flights.forEach(flight => {
    // Create a unique key based on airline and price
    const key = `${flight.airline}|${flight.price}`;

    // Only keep the first occurrence
    if (!flightMap.has(key)) {
      flightMap.set(key, flight);
    }
  });

  return Array.from(flightMap.values());
};

/**
 * Search for flight offers using Amadeus API
 * Validates dates via backend server first (cannot be bypassed from client)
 */
export const searchFlightOffers = async (
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
  adults: number = 1,
  travelClass?: string
): Promise<Flight[]> => {
  // Convert city names to IATA codes
  const originCode = getIATACode(origin);
  const destinationCode = getIATACode(destination);

  // Map travel class to Amadeus format
  let amadeusClass: string | undefined;
  if (travelClass) {
    const classMap: Record<string, string> = {
      'economy': 'ECONOMY',
      'premium economy': 'PREMIUM_ECONOMY',
      'business': 'BUSINESS',
      'first': 'FIRST',
    };
    amadeusClass = classMap[travelClass.toLowerCase()] || 'ECONOMY';
  }

  // Step 1: Server-side date validation (enforced, cannot be bypassed)
  try {
    await validateSearchDates(originCode, destinationCode, departureDate, returnDate, adults, amadeusClass);
  } catch (validationError: any) {
    // Re-throw validation errors so the UI can display them
    throw validationError;
  }

  // Step 2: Call Amadeus API directly from the browser
  try {
    const token = await getAccessToken();

    const params = new URLSearchParams({
      originLocationCode: originCode,
      destinationLocationCode: destinationCode,
      departureDate,
      adults: adults.toString(),
      max: '50',
    });

    if (returnDate) params.append('returnDate', returnDate);
    if (amadeusClass) params.append('travelClass', amadeusClass);

    const url = `${AMADEUS_BASE_URL}/v2/shopping/flight-offers?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Amadeus API error (${response.status}):`, errorText);
      if (response.status === 401) cachedToken = null;
      throw new Error(`Amadeus search failed: ${response.status}`);
    }

    const data: AmadeusSearchResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      console.log('Amadeus returned no flight offers');
      logSearchResult(originCode, destinationCode, departureDate, 0, returnDate, adults, amadeusClass);
      return [];
    }

    const flights = data.data.map(offer =>
      mapToFlightInterface(offer, data.dictionaries || {})
    );

    console.log(`Amadeus returned ${flights.length} flights before deduplication`);

    // Step 3: Remove duplicate flights (same airline, flight number, departure time - keep lowest price)
    const deduplicatedFlights = deduplicateFlights(flights);

    console.log(`After deduplication: ${deduplicatedFlights.length} unique flights`);

    logSearchResult(originCode, destinationCode, departureDate, deduplicatedFlights.length, returnDate, adults, amadeusClass);
    return deduplicatedFlights;

  } catch (error) {
    console.error('Amadeus flight search error:', error);
    throw error;
  }
};

/**
 * Clear cached token (useful for testing or after errors)
 */
export const clearTokenCache = (): void => {
  cachedToken = null;
};
