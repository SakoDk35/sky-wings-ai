import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { logSearch } from './db.js';
import { ApiError, toErrorResponse } from './apiError.js';
import { searchSerpApiFlights } from './serpapi.js';
import {
  generateChatReply,
  generatePackingItems,
  generateTravelPlan,
  generateVisaGuidance,
} from './gemini.js';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const app = express();
const PORT = Number(process.env.SERVER_PORT) || 3001;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TRAVEL_CLASSES = new Set(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']);
const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || DEFAULT_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new ApiError('ORIGIN_NOT_ALLOWED', 'This origin is not allowed.', 403));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(express.json({ limit: '64kb' }));
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

const createRateLimiter = ({ windowMs, maxRequests, code }) => {
  const clients = new Map();
  return (req, _res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const record = clients.get(key);
    if (!record || record.resetAt <= now) {
      clients.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (record.count >= maxRequests) {
      return next(new ApiError(code, 'Too many requests. Please try again later.', 429));
    }
    record.count += 1;
    return next();
  };
};

app.use('/api/flights', createRateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
  code: 'FLIGHT_RATE_LIMITED',
}));
app.use('/api/ai', createRateLimiter({
  windowMs: 60_000,
  maxRequests: 20,
  code: 'AI_RATE_LIMITED',
}));

const isValidDate = (value) => {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day;
};

const todayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const requiredText = (value, field, maxLength = 200) => {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new ApiError('INVALID_REQUEST', `${field} is required and must be at most ${maxLength} characters.`, 400);
  }
  return value.trim();
};

const optionalText = (value, field, maxLength = 500) => {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new ApiError('INVALID_REQUEST', `${field} must be at most ${maxLength} characters.`, 400);
  }
  return value.trim();
};

const safeLogSearch = (params) => {
  try {
    logSearch(params);
  } catch {
    console.error('[SkyWings API] SEARCH_LOG_FAILED');
  }
};

const validateFlightSearch = (query) => {
  const origin = requiredText(query.origin, 'origin', 3).toUpperCase();
  const destination = requiredText(query.destination, 'destination', 3).toUpperCase();
  const departureDate = requiredText(query.departureDate, 'departureDate', 10);
  const returnDate = optionalText(query.returnDate, 'returnDate', 10);
  const adults = Number(query.adults || 1);
  const travelClass = optionalText(query.travelClass, 'travelClass', 20).toUpperCase() || 'ECONOMY';

  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
    throw new ApiError('INVALID_AIRPORT', 'Origin and destination must be valid three-letter IATA codes.', 400);
  }
  if (origin === destination) {
    throw new ApiError('INVALID_ROUTE', 'Origin and destination must be different.', 400);
  }
  if (!Number.isInteger(adults) || adults < 1 || adults > 9) {
    throw new ApiError('INVALID_PASSENGERS', 'Adults must be an integer between 1 and 9.', 400);
  }
  if (!TRAVEL_CLASSES.has(travelClass)) {
    throw new ApiError('INVALID_TRAVEL_CLASS', 'Travel class is not supported.', 400);
  }
  if (!isValidDate(departureDate)) {
    throw new ApiError('INVALID_DATE', 'Departure date must use YYYY-MM-DD.', 400);
  }
  if (departureDate < todayString()) {
    throw new ApiError('INVALID_DATE', 'Departure date cannot be in the past.', 400);
  }
  if (returnDate) {
    if (!isValidDate(returnDate)) {
      throw new ApiError('INVALID_DATE', 'Return date must use YYYY-MM-DD.', 400);
    }
    if (returnDate <= departureDate) {
      throw new ApiError('INVALID_DATE', 'Return date must be after departure date.', 400);
    }
  }

  return { origin, destination, departureDate, returnDate, adults, travelClass };
};

app.get('/api/flights/search', async (req, res, next) => {
  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
  let search;
  try {
    search = validateFlightSearch(req.query);
    const flights = await searchSerpApiFlights(search);
    safeLogSearch({
      ...search,
      status: 'SUCCESS',
      resultsCount: flights.length,
      ipAddress: clientIp,
    });
    return res.json({
      data: flights,
      meta: { count: flights.length, provider: 'SERPAPI_GOOGLE_FLIGHTS' },
    });
  } catch (error) {
    safeLogSearch({
      ...(search || {
        origin: req.query.origin,
        destination: req.query.destination,
        departureDate: req.query.departureDate,
        returnDate: req.query.returnDate,
        adults: req.query.adults,
        travelClass: req.query.travelClass,
      }),
      status: error instanceof ApiError && error.status === 400 ? 'INVALID_REQUEST' : 'PROVIDER_ERROR',
      errorMessage: error instanceof ApiError ? error.code : 'INTERNAL_ERROR',
      ipAddress: clientIp,
    });
    return next(error);
  }
});

app.post('/api/ai/chat', async (req, res, next) => {
  try {
    const message = requiredText(req.body?.message, 'message', 2_000);
    const history = req.body?.history ?? [];
    if (
      !Array.isArray(history) ||
      history.length > 10 ||
      !history.every((entry) =>
        entry &&
        (entry.role === 'user' || entry.role === 'model') &&
        typeof entry.text === 'string' &&
        entry.text.length > 0 &&
        entry.text.length <= 2_000
      )
    ) {
      throw new ApiError('INVALID_REQUEST', 'Chat history is invalid.', 400);
    }
    const reply = await generateChatReply({ message, history });
    return res.json({ data: { message: reply } });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/ai/travel-plan', async (req, res, next) => {
  try {
    const destination = requiredText(req.body?.destination, 'destination', 200);
    const typeAndLength = requiredText(req.body?.typeAndLength, 'typeAndLength', 300);
    const season = requiredText(req.body?.season, 'season', 100);
    const hobbies = optionalText(req.body?.hobbies, 'hobbies', 1_000);
    const language = req.body?.language === 'ar' ? 'ar' : 'en';
    const itinerary = await generateTravelPlan({ destination, typeAndLength, season, hobbies, language });
    return res.json({ data: itinerary });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/ai/visa', async (req, res, next) => {
  try {
    const citizenship = requiredText(req.body?.citizenship, 'citizenship', 200);
    const destination = requiredText(req.body?.destination, 'destination', 200);
    const guidance = await generateVisaGuidance({ citizenship, destination });
    return res.json({ data: guidance });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/ai/packing-list', async (req, res, next) => {
  try {
    const destination = requiredText(req.body?.destination, 'destination', 200);
    const duration = requiredText(req.body?.duration, 'duration', 100);
    const items = await generatePackingItems({ destination, duration });
    return res.json({ data: { items } });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((error, _req, res, _next) => {
  let normalizedError = error;
  if (error instanceof SyntaxError && error.status === 400) {
    normalizedError = new ApiError('INVALID_JSON', 'Request body must contain valid JSON.', 400);
  } else if (error?.type === 'entity.too.large') {
    normalizedError = new ApiError('REQUEST_TOO_LARGE', 'Request body is too large.', 413);
  }
  const response = toErrorResponse(normalizedError);
  if (response.status >= 500) {
    console.error(`[SkyWings API] ${response.body.error.code}`);
  }
  res.status(response.status).json(response.body);
});

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`Sky Wings API server running on http://localhost:${PORT}`);
  });
}

export { app, validateFlightSearch };
