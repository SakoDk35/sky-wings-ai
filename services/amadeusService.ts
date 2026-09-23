import { Flight } from '../types';
import { getIATACode } from './iataCodes';

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
}

interface FlightSearchResponse {
  data?: Flight[];
  meta?: {
    count?: number;
    provider?: string;
  };
}

export class FlightSearchError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'FlightSearchError';
    this.code = code;
    this.status = status;
  }
}

export const searchFlightOffers = async (
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
  adults: number = 1,
  travelClass?: string
): Promise<Flight[]> => {
  const originCode = getIATACode(origin);
  const destinationCode = getIATACode(destination);
  const classMap: Record<string, string> = {
    economy: 'ECONOMY',
    'premium economy': 'PREMIUM_ECONOMY',
    business: 'BUSINESS',
    first: 'FIRST',
  };
  const normalizedClass = travelClass
    ? classMap[travelClass.toLowerCase()] || travelClass.toUpperCase()
    : 'ECONOMY';

  const params = new URLSearchParams({
    origin: originCode,
    destination: destinationCode,
    departureDate,
    adults: String(adults),
    travelClass: normalizedClass,
  });
  if (returnDate) params.set('returnDate', returnDate);

  let response: Response;
  try {
    response = await fetch(`/api/flights/search?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new FlightSearchError(
      'SKYWINGS_API_UNAVAILABLE',
      'The SkyWings server is unavailable. Please try again later.',
      503
    );
  }

  const payload = await response.json().catch(() => null) as FlightSearchResponse & ApiErrorPayload | null;
  if (!response.ok) {
    throw new FlightSearchError(
      payload?.error?.code || 'FLIGHT_SEARCH_FAILED',
      payload?.error?.message || 'Live flight search could not be completed.',
      response.status
    );
  }

  if (!payload || !Array.isArray(payload.data)) {
    throw new FlightSearchError(
      'INVALID_SERVER_RESPONSE',
      'The SkyWings server returned an invalid flight-search response.',
      502
    );
  }

  return payload.data;
};
