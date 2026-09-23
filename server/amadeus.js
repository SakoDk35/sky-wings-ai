import { ApiError } from './apiError.js';

const DEFAULT_BASE_URL = 'https://test.api.amadeus.com';
const REQUEST_TIMEOUT_MS = 12_000;
const TOKEN_EXPIRY_BUFFER_MS = 60_000;
const MAX_ATTEMPTS = 3;
const TRANSIENT_STATUSES = new Set([429, 502, 503, 504]);

let cachedToken = null;
let tokenRefreshPromise = null;

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

  const base = Math.min(500 * (2 ** (attempt - 1)), 4_000);
  return base + Math.floor(Math.random() * 250);
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError(
        'AMADEUS_TIMEOUT',
        'The live flight provider timed out. Please try again.',
        504
      );
    }
    throw new ApiError(
      'AMADEUS_UNAVAILABLE',
      'The live flight provider is currently unavailable. Please try again later.',
      503
    );
  } finally {
    clearTimeout(timeout);
  }
};

const requestWithRetry = async (requestFactory) => {
  let lastResponse;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await requestFactory();
      lastResponse = response;
      if (response.ok || !TRANSIENT_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) {
        return response;
      }
      await sleep(retryDelayMs(attempt, response));
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        !['AMADEUS_UNAVAILABLE', 'AMADEUS_TIMEOUT'].includes(error.code) ||
        attempt === MAX_ATTEMPTS
      ) {
        throw error;
      }
      await sleep(retryDelayMs(attempt));
    }
  }

  return lastResponse;
};

const getConfiguration = () => {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  const baseUrl = (process.env.AMADEUS_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');

  if (!clientId || !clientSecret) {
    throw new ApiError(
      'AMADEUS_NOT_CONFIGURED',
      'Live flight search is not configured on the SkyWings server.',
      503
    );
  }

  return { clientId, clientSecret, baseUrl };
};

const requestAccessToken = async () => {
  const { clientId, clientSecret, baseUrl } = getConfiguration();
  const response = await requestWithRetry(() => fetchWithTimeout(
    `${baseUrl}/v1/security/oauth2/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    }
  ));

  if (!response.ok) {
    const code = response.status === 429 ? 'AMADEUS_RATE_LIMITED' : 'AMADEUS_AUTH_FAILED';
    const status = response.status === 429 ? 429 : 503;
    throw new ApiError(code, 'The live flight provider could not be authenticated.', status);
  }

  const payload = await response.json().catch(() => null);
  if (
    !payload ||
    typeof payload.access_token !== 'string' ||
    !Number.isFinite(Number(payload.expires_in))
  ) {
    throw new ApiError(
      'AMADEUS_INVALID_RESPONSE',
      'The live flight provider returned an invalid authentication response.',
      502
    );
  }

  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in) * 1000,
  };
};

const getAccessToken = async (forceRefresh = false) => {
  if (!forceRefresh && cachedToken?.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS) {
    return cachedToken.accessToken;
  }

  if (!tokenRefreshPromise) {
    tokenRefreshPromise = requestAccessToken()
      .then((token) => {
        cachedToken = token;
        return token.accessToken;
      })
      .finally(() => {
        tokenRefreshPromise = null;
      });
  }

  return tokenRefreshPromise;
};

const parseDuration = (isoDuration) => {
  if (typeof isoDuration !== 'string') return null;
  const match = isoDuration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
  if (!match) return null;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  if (hours === 0 && minutes === 0) return '0m';
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const normalizeSegment = (segment, aircraftDictionary = {}) => {
  if (
    !segment ||
    !nonEmptyString(segment.departure?.iataCode) ||
    !nonEmptyString(segment.departure?.at) ||
    !nonEmptyString(segment.arrival?.iataCode) ||
    !nonEmptyString(segment.arrival?.at) ||
    !nonEmptyString(segment.carrierCode) ||
    !nonEmptyString(segment.number)
  ) {
    return null;
  }

  const duration = parseDuration(segment.duration);
  if (!duration) return null;

  const aircraftCode = segment.aircraft?.code;
  const aircraft = nonEmptyString(aircraftDictionary[aircraftCode])
    ? aircraftDictionary[aircraftCode]
    : undefined;

  return {
    departure: {
      iataCode: segment.departure.iataCode,
      at: segment.departure.at,
      ...(nonEmptyString(segment.departure.terminal) ? { terminal: segment.departure.terminal } : {}),
    },
    arrival: {
      iataCode: segment.arrival.iataCode,
      at: segment.arrival.at,
      ...(nonEmptyString(segment.arrival.terminal) ? { terminal: segment.arrival.terminal } : {}),
    },
    carrierCode: segment.carrierCode,
    flightNumber: segment.number,
    ...(aircraft ? { aircraft } : {}),
    duration,
  };
};

const normalizeOffer = (offer, dictionaries = {}) => {
  if (!offer || !nonEmptyString(String(offer.id ?? '')) || !Array.isArray(offer.itineraries)) {
    return null;
  }

  const outbound = offer.itineraries[0];
  if (!outbound || !Array.isArray(outbound.segments) || outbound.segments.length === 0) {
    return null;
  }

  const segments = outbound.segments.map((segment) =>
    normalizeSegment(segment, dictionaries.aircraft || {})
  );
  if (segments.some((segment) => segment === null)) return null;

  const price = Number(offer.price?.total);
  const currency = offer.price?.currency;
  const duration = parseDuration(outbound.duration);
  if (!Number.isFinite(price) || price < 0 || !/^[A-Z]{3}$/.test(currency || '') || !duration) {
    return null;
  }

  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  const carrierCode = firstSegment.carrierCode;
  const airline = nonEmptyString(dictionaries.carriers?.[carrierCode])
    ? dictionaries.carriers[carrierCode]
    : carrierCode;
  const flightNumber = segments
    .map((segment) => `${segment.carrierCode}${segment.flightNumber}`)
    .join(' / ');
  const stopCodes = segments.slice(0, -1).map((segment) => segment.arrival.iataCode);
  const returnDuration = offer.itineraries[1]
    ? parseDuration(offer.itineraries[1].duration)
    : null;
  const firstAircraft = firstSegment.aircraft;

  return {
    id: `ama-${offer.id}`,
    provider: 'AMADEUS',
    providerOfferId: String(offer.id),
    airline,
    carrierCode,
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
    ...(returnDuration ? { returnDuration } : {}),
    ...(firstAircraft ? { aircraft: firstAircraft } : {}),
    ...(Number.isInteger(offer.numberOfBookableSeats)
      ? { numberOfBookableSeats: offer.numberOfBookableSeats }
      : {}),
    ...(nonEmptyString(offer.lastTicketingDate)
      ? { lastTicketingDate: offer.lastTicketingDate }
      : {}),
    segments,
  };
};

const deduplicateFlights = (flights) => {
  const unique = new Map();
  for (const flight of flights) {
    const key = [
      flight.provider,
      flight.flightNumber,
      flight.origin,
      flight.destination,
      flight.departureTime,
      flight.currency,
    ].join('|');
    const existing = unique.get(key);
    if (!existing || flight.price < existing.price) unique.set(key, flight);
  }
  return [...unique.values()];
};

const searchRequest = async (params, accessToken) => {
  const { baseUrl } = getConfiguration();
  return requestWithRetry(() => fetchWithTimeout(
    `${baseUrl}/v2/shopping/flight-offers?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  ));
};

export const searchAmadeusFlights = async ({
  origin,
  destination,
  departureDate,
  returnDate,
  adults,
  travelClass,
}) => {
  const params = new URLSearchParams({
    originLocationCode: origin,
    destinationLocationCode: destination,
    departureDate,
    adults: String(adults),
    max: '50',
  });
  if (returnDate) params.set('returnDate', returnDate);
  if (travelClass) params.set('travelClass', travelClass);

  let accessToken = await getAccessToken();
  let response = await searchRequest(params, accessToken);

  if (response.status === 401) {
    cachedToken = null;
    accessToken = await getAccessToken(true);
    response = await searchRequest(params, accessToken);
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new ApiError(
        'AMADEUS_RATE_LIMITED',
        'The live flight provider is rate limiting requests. Please try again later.',
        429
      );
    }
    throw new ApiError(
      'AMADEUS_UNAVAILABLE',
      'The live flight provider could not complete the search. Please try again later.',
      503
    );
  }

  const payload = await response.json().catch(() => null);
  if (!payload || !Array.isArray(payload.data)) {
    throw new ApiError(
      'AMADEUS_INVALID_RESPONSE',
      'The live flight provider returned an invalid response.',
      502
    );
  }

  const normalized = payload.data
    .map((offer) => normalizeOffer(offer, payload.dictionaries || {}))
    .filter(Boolean);

  if (payload.data.length > 0 && normalized.length === 0) {
    throw new ApiError(
      'AMADEUS_INVALID_RESPONSE',
      'The live flight provider returned flight data in an unsupported format.',
      502
    );
  }

  return deduplicateFlights(normalized);
};
