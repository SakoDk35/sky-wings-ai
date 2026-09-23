import { Flight } from '../types';
import { getIATACode } from './iataCodes';

// The browser may call only SkyWings' own server. Provider credentials and
// provider API calls must remain server-side.
const BACKEND_API_URL = 'http://localhost:3001';

export const LIVE_INVENTORY_UNAVAILABLE_MESSAGE =
  'Verified live flight inventory is temporarily unavailable while the secure server integration is completed. No simulated flights are shown.';

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
 * Phase 1 containment boundary.
 *
 * Search input is still validated by the SkyWings server, but the browser no
 * longer authenticates with or calls Amadeus. Phase 2 can replace the explicit
 * unavailable error below with a server endpoint that owns the provider call.
 */
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
    ? classMap[travelClass.toLowerCase()] || 'ECONOMY'
    : undefined;

  await validateSearchDates(
    originCode,
    destinationCode,
    departureDate,
    returnDate,
    adults,
    normalizedClass
  );

  throw new Error(LIVE_INVENTORY_UNAVAILABLE_MESSAGE);
};
