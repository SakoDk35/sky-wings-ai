import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  createDemoBooking,
  createUser,
  findUserWithPasswordByEmail,
  listDemoBookings,
  logSearch,
} from './db.js';
import { ApiError, toErrorResponse } from './apiError.js';
import {
  clearSession,
  hashPassword,
  requireAuthentication,
  startSession,
  verifyPassword,
} from './auth.js';
import { searchSerpApiFlights } from './serpapi.js';
import { requestMlPrediction, validateMlPredictionInput } from './ml.js';
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
  credentials: true,
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
app.use('/api/ml', createRateLimiter({
  windowMs: 60_000,
  maxRequests: 60,
  code: 'ML_RATE_LIMITED',
}));

const signupRateLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  maxRequests: 5,
  code: 'AUTH_RATE_LIMITED',
});
const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  maxRequests: 10,
  code: 'AUTH_RATE_LIMITED',
});

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value) => {
  if (typeof value !== 'string') {
    throw new ApiError('INVALID_REQUEST', 'A valid email address is required.', 400);
  }
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
    throw new ApiError('INVALID_REQUEST', 'A valid email address is required.', 400);
  }
  return email;
};

const validateSignupInput = (body) => {
  const name = requiredText(body?.name, 'name', 100);
  if (name.length < 2) {
    throw new ApiError('INVALID_REQUEST', 'Name must contain at least 2 characters.', 400);
  }
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new ApiError('INVALID_REQUEST', 'Password must be between 8 and 128 characters.', 400);
  }
  return { name, email, password };
};

const validateLoginInput = (body) => {
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  if (typeof password !== 'string' || password.length < 1 || password.length > 128) {
    throw new ApiError('INVALID_REQUEST', 'Email and password are required.', 400);
  }
  return { email, password };
};

const invalidBookingSnapshot = (message) => {
  throw new ApiError('INVALID_BOOKING_SNAPSHOT', message, 400);
};

const validateBookingDateTime = (value, field) => {
  if (typeof value !== 'string') {
    invalidBookingSnapshot(`${field} must be a valid local date and time.`);
  }

  const normalized = value.trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    invalidBookingSnapshot(`${field} must use YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss.`);
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = '00'] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth[month - 1] ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    invalidBookingSnapshot(`${field} must contain a real calendar date and valid 24-hour time.`);
  }

  return normalized;
};

const validateBookingDuration = (value) => {
  if (typeof value !== 'string') {
    invalidBookingSnapshot('duration must use the normalized provider format.');
  }

  const normalized = value.trim();
  const match = normalized.match(/^(?:(\d+)h(?: ([1-5]?\d)m)?|([1-9]\d*)m)$/);
  if (!match) {
    invalidBookingSnapshot('duration must use a positive format such as 45m, 4h, or 4h 20m.');
  }

  const hours = match[1] === undefined ? 0 : Number(match[1]);
  const hourMinutes = match[2] === undefined ? 0 : Number(match[2]);
  const minutesOnly = match[3] === undefined ? 0 : Number(match[3]);
  const totalMinutes = hours * 60 + hourMinutes + minutesOnly;
  const isNormalized = hours > 0
    ? match[2] === undefined || hourMinutes > 0
    : minutesOnly > 0 && minutesOnly < 60;

  if (!isNormalized || !Number.isSafeInteger(totalMinutes) || totalMinutes > 10_080) {
    invalidBookingSnapshot('duration must be a positive normalized duration of no more than 7 days.');
  }

  return normalized;
};

const validateDemoBookingInput = (body) => {
  const flight = body?.flight;
  if (!flight || typeof flight !== 'object' || Array.isArray(flight)) {
    invalidBookingSnapshot('A flight snapshot is required.');
  }

  const normalizeAirport = (value, field) => {
    if (typeof value !== 'string') {
      invalidBookingSnapshot(`${field} must be a three-letter IATA code.`);
    }
    const normalized = value.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) {
      invalidBookingSnapshot(`${field} must be a three-letter IATA code.`);
    }
    return normalized;
  };

  const origin = normalizeAirport(flight.origin, 'origin');
  const destination = normalizeAirport(flight.destination, 'destination');
  const { stops, price } = flight;
  const currency = typeof flight.currency === 'string' ? flight.currency.trim().toUpperCase() : '';

  if (origin === destination) {
    invalidBookingSnapshot('Origin and destination must be different airports.');
  }
  if (typeof stops !== 'number' || !Number.isInteger(stops) || stops < 0 || stops > 10) {
    invalidBookingSnapshot('stops must be an integer between 0 and 10.');
  }
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || price > 100_000) {
    invalidBookingSnapshot('price must be a finite number greater than 0 and no more than 100000.');
  }
  if (currency !== 'USD') {
    invalidBookingSnapshot('currency must be USD for the current demo booking flow.');
  }

  if (typeof flight.airline !== 'string') {
    invalidBookingSnapshot('airline must be a nonempty string.');
  }
  const airline = flight.airline.trim();
  if (!airline || airline.length > 500 || /[\u0000-\u001F\u007F]/.test(airline)) {
    invalidBookingSnapshot('airline must be nonempty, at most 500 characters, and contain no control characters.');
  }

  if (typeof flight.flightNumber !== 'string') {
    invalidBookingSnapshot('flightNumber must use the normalized provider format.');
  }
  const flightNumber = flight.flightNumber.trim();
  const flightNumberPattern = /^[A-Z0-9]{2}\s?[0-9]{1,5}[A-Z]?(?:\s*\/\s*[A-Z0-9]{2}\s?[0-9]{1,5}[A-Z]?)*$/;
  if (!flightNumber || flightNumber.length > 200 || !flightNumberPattern.test(flightNumber)) {
    invalidBookingSnapshot('flightNumber must contain valid provider flight identifiers separated by /.');
  }

  const departureTime = validateBookingDateTime(flight.departureTime, 'departureTime');
  const arrivalTime = validateBookingDateTime(flight.arrivalTime, 'arrivalTime');
  const duration = validateBookingDuration(flight.duration);

  return {
    airline,
    flightNumber,
    origin,
    destination,
    departureTime,
    arrivalTime,
    duration,
    stops,
    price,
    currency,
  };
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

app.post('/api/auth/signup', signupRateLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = validateSignupInput(req.body);
    const passwordHash = await hashPassword(password);
    let user;
    try {
      user = createUser({ name, email, passwordHash });
    } catch (error) {
      if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ApiError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists.', 409);
      }
      throw error;
    }
    startSession(req, res, user.id);
    return res.status(201).json({ data: { user } });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/login', loginRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = validateLoginInput(req.body);
    const storedUser = findUserWithPasswordByEmail(email);
    let passwordMatches = false;
    if (storedUser) {
      passwordMatches = await verifyPassword(password, storedUser.password_hash);
    } else {
      // Perform the same intentionally expensive work for unknown accounts so
      // the generic error does not become a simple timing-based email oracle.
      await hashPassword(password);
    }
    if (!storedUser || !passwordMatches) {
      throw new ApiError('INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
    }

    const user = {
      id: storedUser.id,
      name: storedUser.name,
      email: storedUser.email,
      createdAt: storedUser.created_at,
    };
    startSession(req, res, user.id);
    return res.json({ data: { user } });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/auth/me', requireAuthentication, (req, res) => {
  res.json({ data: { user: req.user } });
});

app.post('/api/auth/logout', (req, res, next) => {
  try {
    clearSession(req, res);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.post('/api/demo-bookings', requireAuthentication, (req, res, next) => {
  try {
    const flight = validateDemoBookingInput(req.body);
    const demoReference = `DEMO-${randomBytes(9).toString('base64url').toUpperCase()}`;
    const booking = createDemoBooking({ userId: req.user.id, demoReference, flight });
    return res.status(201).json({ data: { booking } });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/demo-bookings', requireAuthentication, (req, res, next) => {
  try {
    return res.json({ data: { bookings: listDemoBookings(req.user.id) } });
  } catch (error) {
    return next(error);
  }
});

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

app.post('/api/ml/price-prediction', async (req, res, next) => {
  try {
    const input = validateMlPredictionInput(req.body);
    const prediction = await requestMlPrediction(input);
    return res.json({ data: prediction });
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
