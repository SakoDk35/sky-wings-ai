import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logSearch } from './db.js';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ─── Date Validation Helpers ────────────────────────────────────────────────

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Check if a date string is valid YYYY-MM-DD format and represents a real date
 */
const isValidDateFormat = (dateStr) => {
  if (!DATE_REGEX.test(dateStr)) return false;
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return false;
  // Ensure the parsed date matches the input (catches cases like 2024-02-30)
  const [y, m, d] = dateStr.split('-').map(Number);
  return date.getFullYear() === y && date.getMonth() + 1 === m && date.getDate() === d;
};

/**
 * Get today's date as YYYY-MM-DD in server timezone
 */
const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ─── GET /api/search-flights ────────────────────────────────────────────────
//
// Validates dates server-side (cannot be bypassed from client).
// Logs all validation errors to the database with status = "INVALID_DATE".
// On success, returns { validated: true } so the client can proceed with the
// Amadeus API call directly from the browser.

app.get('/api/search-flights', (req, res) => {
  const { origin, destination, departureDate, returnDate, adults, travelClass } = req.query;
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

  // --- Required parameter checks ---
  if (!origin || !destination || !departureDate) {
    logSearch({
      origin, destination, departureDate, returnDate, adults, travelClass,
      status: 'INVALID_DATE',
      errorMessage: 'Missing required parameters: origin, destination, departureDate.',
      ipAddress: clientIp
    });
    return res.status(400).json({ error: 'Missing required parameters: origin, destination, departureDate.' });
  }

  // --- Departure date format validation ---
  if (!isValidDateFormat(departureDate)) {
    logSearch({
      origin, destination, departureDate, returnDate, adults, travelClass,
      status: 'INVALID_DATE',
      errorMessage: 'Invalid date format. Use YYYY-MM-DD.',
      ipAddress: clientIp
    });
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  // --- Departure date must not be in the past ---
  const today = getTodayStr();
  if (departureDate < today) {
    logSearch({
      origin, destination, departureDate, returnDate, adults, travelClass,
      status: 'INVALID_DATE',
      errorMessage: 'Departure date cannot be in the past.',
      ipAddress: clientIp
    });
    return res.status(400).json({ error: 'Departure date cannot be in the past.' });
  }

  // --- Return date validations (if provided) ---
  if (returnDate) {
    // Format check
    if (!isValidDateFormat(returnDate)) {
      logSearch({
        origin, destination, departureDate, returnDate, adults, travelClass,
        status: 'INVALID_DATE',
        errorMessage: 'Invalid date format. Use YYYY-MM-DD.',
        ipAddress: clientIp
      });
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    // Return date must not be in the past
    if (returnDate < today) {
      logSearch({
        origin, destination, departureDate, returnDate, adults, travelClass,
        status: 'INVALID_DATE',
        errorMessage: 'Return date cannot be in the past.',
        ipAddress: clientIp
      });
      return res.status(400).json({ error: 'Return date cannot be in the past.' });
    }

    // Return date must be after departure date (not equal)
    if (returnDate <= departureDate) {
      logSearch({
        origin, destination, departureDate, returnDate, adults, travelClass,
        status: 'INVALID_DATE',
        errorMessage: 'Return date must be after departure date.',
        ipAddress: clientIp
      });
      return res.status(400).json({ error: 'Return date must be after departure date.' });
    }
  }

  // --- All validations passed ---
  logSearch({
    origin, destination, departureDate, returnDate, adults, travelClass,
    status: 'VALIDATED',
    ipAddress: clientIp
  });

  return res.json({ validated: true });
});

// ─── POST /api/log-search-result ────────────────────────────────────────────
//
// Called by the frontend after a successful Amadeus search to log results count.

app.post('/api/log-search-result', (req, res) => {
  const { origin, destination, departureDate, returnDate, adults, travelClass, resultsCount } = req.body;
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

  logSearch({
    origin, destination, departureDate, returnDate, adults, travelClass,
    status: 'SUCCESS',
    resultsCount: resultsCount || 0,
    ipAddress: clientIp
  });

  return res.json({ logged: true });
});

// ─── Health check ───────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start server ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Sky Wings API server running on http://localhost:${PORT}`);
});
