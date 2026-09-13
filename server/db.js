import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'skywings.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS search_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin TEXT,
    destination TEXT,
    departure_date TEXT,
    return_date TEXT,
    adults INTEGER,
    travel_class TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    results_count INTEGER DEFAULT 0,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

/**
 * Log a search request to the database
 */
export const logSearch = (params) => {
  const stmt = db.prepare(`
    INSERT INTO search_logs (origin, destination, departure_date, return_date, adults, travel_class, status, error_message, results_count, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    params.origin || null,
    params.destination || null,
    params.departureDate || null,
    params.returnDate || null,
    params.adults || null,
    params.travelClass || null,
    params.status,
    params.errorMessage || null,
    params.resultsCount || 0,
    params.ipAddress || null
  );
};

export default db;
