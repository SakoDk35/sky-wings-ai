import { ApiError } from './apiError.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ROUTE_REGEX = /^[A-Z]{3}-[A-Z]{3}$/;
const ML_TIMEOUT_MS = 5_000;
const MAX_DAYS_BEFORE_DEPARTURE = 120;
const SAFE_UPSTREAM_ERRORS = new Set([
  'UNSUPPORTED_ROUTE',
  'UNSUPPORTED_AIRLINE',
  'UNSUPPORTED_CURRENCY',
]);

const parseDateUtc = (value) => {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
};

const utcStartOfDay = (value = new Date()) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

export const validateMlPredictionInput = (body, now = new Date()) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError('INVALID_REQUEST', 'A JSON request body is required.', 400);
  }

  const route = typeof body.route === 'string' ? body.route.trim().toUpperCase() : '';
  const airline = typeof body.airline === 'string' ? body.airline.trim() : '';
  const departureDate = typeof body.departure_date === 'string' ? body.departure_date.trim() : '';
  const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : '';
  const currentPrice = typeof body.current_price === 'number' ? body.current_price : Number.NaN;

  if (!ROUTE_REGEX.test(route)) {
    throw new ApiError('INVALID_ROUTE', 'route must contain two three-letter IATA codes.', 400);
  }
  if (!airline || airline.length > 200) {
    throw new ApiError('INVALID_AIRLINE', 'airline is required and must be at most 200 characters.', 400);
  }

  const departure = parseDateUtc(departureDate);
  if (!departure) {
    throw new ApiError('INVALID_DATE', 'departure_date must use a valid YYYY-MM-DD date.', 400);
  }
  if (!Number.isFinite(currentPrice) || currentPrice <= 0 || currentPrice > 1_000_000) {
    throw new ApiError('INVALID_PRICE', 'current_price must be a positive number.', 400);
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new ApiError('INVALID_CURRENCY', 'currency must be a three-letter ISO currency code.', 400);
  }

  const daysBeforeDeparture = Math.floor(
    (departure.getTime() - utcStartOfDay(now).getTime()) / 86_400_000
  );
  if (daysBeforeDeparture < 0) {
    throw new ApiError('INVALID_DATE', 'departure_date cannot be in the past.', 400);
  }
  if (daysBeforeDeparture > MAX_DAYS_BEFORE_DEPARTURE) {
    throw new ApiError(
      'UNSUPPORTED_DATE_RANGE',
      `The experimental model supports departures up to ${MAX_DAYS_BEFORE_DEPARTURE} days away.`,
      422
    );
  }

  return {
    route,
    airline,
    departure_date: departureDate,
    days_before_departure: daysBeforeDeparture,
    current_price: currentPrice,
    currency,
  };
};

const mlServiceBaseUrl = () => {
  const configured = (process.env.ML_SERVICE_URL || 'http://127.0.0.1:5000').trim();
  let parsed;
  try {
    parsed = new URL(configured);
  } catch {
    throw new ApiError('ML_CONFIGURATION_ERROR', 'The ML service is not configured correctly.', 500);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ApiError('ML_CONFIGURATION_ERROR', 'The ML service is not configured correctly.', 500);
  }
  return configured.replace(/\/+$/, '');
};

const validatePredictionResponse = (payload) => {
  const data = payload && typeof payload === 'object' ? payload : null;
  if (
    !data ||
    !Number.isFinite(data.predicted_price) ||
    data.predicted_price <= 0 ||
    !['increase', 'decrease', 'stable'].includes(data.trend) ||
    !Number.isFinite(data.price_change_percent) ||
    typeof data.summary !== 'string' ||
    !data.summary.trim() ||
    data.currency !== 'USD' ||
    typeof data.model_output_label !== 'string' ||
    !data.model_output_label.trim()
  ) {
    throw new ApiError('ML_INVALID_RESPONSE', 'The ML service returned an invalid response.', 502);
  }

  return {
    predicted_price: data.predicted_price,
    trend: data.trend,
    price_change_percent: data.price_change_percent,
    summary: data.summary.trim(),
    currency: data.currency,
    model_output_label: data.model_output_label.trim(),
  };
};

export const requestMlPrediction = async (input) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

  try {
    const response = await fetch(`${mlServiceBaseUrl()}/predict-flight-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const upstreamCode = payload?.error?.code;
      if (response.status === 422 && SAFE_UPSTREAM_ERRORS.has(upstreamCode)) {
        throw new ApiError(
          upstreamCode,
          typeof payload?.error?.message === 'string'
            ? payload.error.message
            : 'This input is not supported by the experimental model.',
          422
        );
      }
      if (upstreamCode === 'MODEL_UNAVAILABLE' || response.status >= 500) {
        throw new ApiError('ML_SERVICE_UNAVAILABLE', 'The experimental ML service is unavailable.', 503);
      }
      throw new ApiError('ML_UPSTREAM_REJECTED', 'The ML service rejected the prediction request.', 502);
    }

    return validatePredictionResponse(payload);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.name === 'AbortError') {
      throw new ApiError('ML_SERVICE_TIMEOUT', 'The experimental ML service timed out.', 504);
    }
    throw new ApiError('ML_SERVICE_UNAVAILABLE', 'The experimental ML service is unavailable.', 503);
  } finally {
    clearTimeout(timeout);
  }
};
