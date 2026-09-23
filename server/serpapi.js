import { ApiError } from './apiError.js';

const SEARCH_URL = 'https://serpapi.com/search.json';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;
const TRANSIENT_STATUSES = new Set([429, 502, 503, 504]);
const TRAVEL_CLASS_CODES = {
  ECONOMY: '1',
  PREMIUM_ECONOMY: '2',
  BUSINESS: '3',
  FIRST: '4',
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const retryDelayMs = (attempt, response) => {
  const retryAfter = response?.headers?.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 10_000);

    const retryDate = Date.parse(retryAfter);
    if (Number.isFinite(retryDate)) {
      return Math.min(Math.max(retryDate - Date.now(), 0), 10_000);
    }
  }

  const base = Math.min(750 * (2 ** (attempt - 1)), 5_000);
  return base + Math.floor(Math.random() * 300);
};

const fetchWithTimeout = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError(
        'SERPAPI_TIMEOUT',
        'The live flight provider timed out. Please try again.',
        504
      );
    }
    throw new ApiError(
      'SERPAPI_UNAVAILABLE',
      'The live flight provider is currently unavailable. Please try again later.',
      503
    );
  } finally {
    clearTimeout(timeout);
  }
};

const requestWithRetry = async (url) => {
  let lastResponse;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url);
      lastResponse = response;
      if (response.ok || !TRANSIENT_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) {
        return response;
      }
      await sleep(retryDelayMs(attempt, response));
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        !['SERPAPI_UNAVAILABLE', 'SERPAPI_TIMEOUT'].includes(error.code) ||
        attempt === MAX_ATTEMPTS
      ) {
        throw error;
      }
      await sleep(retryDelayMs(attempt));
    }
  }

  return lastResponse;
};

const nonEmptyString = (value, maxLength = 300) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;

const formatDuration = (minutes) => {
  const value = Number(minutes);
  if (!Number.isInteger(value) || value <= 0) return null;
  const hours = Math.floor(value / 60);
  const remainingMinutes = value % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const normalizeLocalDateTime = (value) => {
  if (!nonEmptyString(value, 40)) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(trimmed)) return null;
  return trimmed.replace(' ', 'T');
};

const parseFlightNumber = (value) => {
  if (!nonEmptyString(value, 40)) return null;
  const match = value.trim().toUpperCase().match(/^([A-Z0-9]{2})\s*([0-9]{1,5}[A-Z]?)$/);
  if (!match) return null;
  return { carrierCode: match[1], flightNumber: match[2] };
};

const normalizeSegment = (segment) => {
  const departureCode = segment?.departure_airport?.id;
  const arrivalCode = segment?.arrival_airport?.id;
  const departureTime = normalizeLocalDateTime(segment?.departure_airport?.time);
  const arrivalTime = normalizeLocalDateTime(segment?.arrival_airport?.time);
  const number = parseFlightNumber(segment?.flight_number);
  const duration = formatDuration(segment?.duration);

  if (
    !/^[A-Z]{3}$/.test(departureCode || '') ||
    !/^[A-Z]{3}$/.test(arrivalCode || '') ||
    !departureTime ||
    !arrivalTime ||
    !number ||
    !duration ||
    !nonEmptyString(segment?.airline, 200)
  ) {
    return null;
  }

  return {
    departure: { iataCode: departureCode, at: departureTime },
    arrival: { iataCode: arrivalCode, at: arrivalTime },
    carrierCode: number.carrierCode,
    flightNumber: number.flightNumber,
    ...(nonEmptyString(segment.airplane, 200) ? { aircraft: segment.airplane.trim() } : {}),
    duration,
    airline: segment.airline.trim(),
  };
};

const normalizeOffer = (offer, index, currency) => {
  if (!offer || !Array.isArray(offer.flights) || offer.flights.length === 0) return null;

  const segments = offer.flights.map(normalizeSegment);
  if (segments.some((segment) => segment === null)) return null;

  const price = Number(offer.price);
  const duration = formatDuration(offer.total_duration);
  if (!Number.isFinite(price) || price < 0 || !duration) return null;

  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  const airlines = [...new Set(segments.map((segment) => segment.airline))];
  const flightNumber = segments
    .map((segment) => `${segment.carrierCode} ${segment.flightNumber}`)
    .join(' / ');
  const stopCodes = segments.slice(0, -1).map((segment) => segment.arrival.iataCode);
  const publicSegments = segments.map(({ airline: _airline, ...segment }) => segment);

  return {
    id: `serp-${index}-${firstSegment.carrierCode}${firstSegment.flightNumber}`,
    provider: 'SERPAPI_GOOGLE_FLIGHTS',
    airline: airlines.join(' / '),
    carrierCode: firstSegment.carrierCode,
    flightNumber,
    origin: firstSegment.departure.iataCode,
    destination: lastSegment.arrival.iataCode,
    departureTime: firstSegment.departure.at,
    arrivalTime: lastSegment.arrival.at,
    price,
    currency,
    duration,
    stops: segments.length - 1,
    ...(stopCodes.length > 0
      ? { stopDetails: stopCodes.length === 1 ? `via ${stopCodes[0]}` : `${stopCodes.length} stops (${stopCodes.join(', ')})` }
      : {}),
    ...(firstSegment.aircraft ? { aircraft: firstSegment.aircraft } : {}),
    segments: publicSegments,
  };
};

const deduplicateFlights = (flights) => {
  const unique = new Map();
  for (const flight of flights) {
    const key = [
      flight.flightNumber,
      flight.origin,
      flight.destination,
      flight.departureTime,
      flight.price,
      flight.currency,
    ].join('|');
    if (!unique.has(key)) unique.set(key, flight);
  }
  return [...unique.values()];
};

const getApiKey = () => {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      'SERPAPI_NOT_CONFIGURED',
      'Live flight search is not configured on the SkyWings server.',
      503
    );
  }
  return apiKey;
};

export const searchSerpApiFlights = async ({
  origin,
  destination,
  departureDate,
  returnDate,
  adults,
  travelClass,
}) => {
  const travelClassCode = TRAVEL_CLASS_CODES[travelClass];
  if (!travelClassCode) {
    throw new ApiError('INVALID_TRAVEL_CLASS', 'Travel class is not supported.', 400);
  }

  const requestedCurrency = 'USD';
  const params = new URLSearchParams({
    engine: 'google_flights',
    api_key: getApiKey(),
    departure_id: origin,
    arrival_id: destination,
    outbound_date: departureDate,
    adults: String(adults),
    travel_class: travelClassCode,
    currency: requestedCurrency,
    hl: 'en',
    type: returnDate ? '1' : '2',
  });
  if (returnDate) params.set('return_date', returnDate);

  const response = await requestWithRetry(`${SEARCH_URL}?${params.toString()}`);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ApiError(
        'SERPAPI_AUTH_FAILED',
        'The live flight provider could not be authenticated by the SkyWings server.',
        503
      );
    }
    if (response.status === 429) {
      throw new ApiError(
        'SERPAPI_RATE_LIMITED',
        'The live flight provider is rate limiting requests. Please try again later.',
        429
      );
    }
    throw new ApiError(
      'SERPAPI_UNAVAILABLE',
      'The live flight provider could not complete the search. Please try again later.',
      503
    );
  }

  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    throw new ApiError(
      'SERPAPI_INVALID_RESPONSE',
      'The live flight provider returned an invalid response.',
      502
    );
  }
  if (nonEmptyString(payload.error, 2_000) || payload.search_metadata?.status === 'Error') {
    throw new ApiError(
      'SERPAPI_REQUEST_FAILED',
      'The live flight provider rejected the search request.',
      502
    );
  }

  const bestFlights = Array.isArray(payload.best_flights) ? payload.best_flights : [];
  const otherFlights = Array.isArray(payload.other_flights) ? payload.other_flights : [];
  const offers = [...bestFlights, ...otherFlights];
  const returnedCurrency = payload.search_parameters?.currency;
  const currency = /^[A-Z]{3}$/.test(returnedCurrency || '')
    ? returnedCurrency
    : requestedCurrency;
  const normalized = offers
    .map((offer, index) => normalizeOffer(offer, index, currency))
    .filter(Boolean);

  if (offers.length > 0 && normalized.length === 0) {
    throw new ApiError(
      'SERPAPI_INVALID_RESPONSE',
      'The live flight provider returned flight data in an unsupported format.',
      502
    );
  }

  return deduplicateFlights(normalized);
};
