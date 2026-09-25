import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.SKYWINGS_DB_PATH
  ? path.resolve(process.env.SKYWINGS_DB_PATH)
  : path.join(__dirname, '..', 'skywings.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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

const migrateToVersion1 = db.transaction(() => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS demo_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      demo_reference TEXT NOT NULL UNIQUE,
      airline TEXT NOT NULL,
      flight_number TEXT NOT NULL,
      origin TEXT NOT NULL CHECK (length(origin) = 3),
      destination TEXT NOT NULL CHECK (length(destination) = 3),
      departure_time TEXT NOT NULL,
      arrival_time TEXT NOT NULL,
      duration TEXT NOT NULL,
      stops INTEGER NOT NULL CHECK (stops >= 0),
      price REAL NOT NULL CHECK (price > 0),
      currency TEXT NOT NULL CHECK (length(currency) = 3),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_demo_bookings_user_created
      ON demo_bookings(user_id, created_at DESC);
  `);
  db.pragma('user_version = 1');
});

const schemaVersion = db.pragma('user_version', { simple: true });
if (schemaVersion < 1) migrateToVersion1();
if (schemaVersion > 1) {
  throw new Error(`Unsupported SkyWings database schema version: ${schemaVersion}`);
}

const mapUser = (row) => row && ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: row.created_at,
});

const mapBooking = (row) => ({
  id: row.id,
  userId: row.user_id,
  demoReference: row.demo_reference,
  airline: row.airline,
  flightNumber: row.flight_number,
  origin: row.origin,
  destination: row.destination,
  departureTime: row.departure_time,
  arrivalTime: row.arrival_time,
  duration: row.duration,
  stops: row.stops,
  price: row.price,
  currency: row.currency,
  createdAt: row.created_at,
});

export const createUser = ({ name, email, passwordHash }) => {
  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash)
    VALUES (?, ?, ?)
  `).run(name, email, passwordHash);
  return findUserById(Number(result.lastInsertRowid));
};

export const findUserById = (id) => mapUser(db.prepare(`
  SELECT id, name, email, created_at FROM users WHERE id = ?
`).get(id));

export const findUserWithPasswordByEmail = (email) => db.prepare(`
  SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?
`).get(email);

export const createSession = ({ tokenHash, userId, expiresAt }) => {
  db.prepare(`
    INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)
  `).run(tokenHash, userId, expiresAt);
};

export const findUserBySession = (tokenHash, now) => mapUser(db.prepare(`
  SELECT users.id, users.name, users.email, users.created_at
  FROM auth_sessions
  JOIN users ON users.id = auth_sessions.user_id
  WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > ?
`).get(tokenHash, now));

export const deleteSession = (tokenHash) => {
  db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(tokenHash);
};

export const deleteExpiredSessions = (now) => {
  db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(now);
};

export const createDemoBooking = ({ userId, demoReference, flight }) => {
  const result = db.prepare(`
    INSERT INTO demo_bookings (
      user_id, demo_reference, airline, flight_number, origin, destination,
      departure_time, arrival_time, duration, stops, price, currency
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId, demoReference, flight.airline, flight.flightNumber, flight.origin,
    flight.destination, flight.departureTime, flight.arrivalTime, flight.duration,
    flight.stops, flight.price, flight.currency
  );

  return mapBooking(db.prepare('SELECT * FROM demo_bookings WHERE id = ?').get(Number(result.lastInsertRowid)));
};

export const listDemoBookings = (userId) => db.prepare(`
  SELECT * FROM demo_bookings
  WHERE user_id = ?
  ORDER BY created_at DESC, id DESC
  LIMIT 100
`).all(userId).map(mapBooking);

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

export { DB_PATH };
export default db;
