import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { createSession, deleteExpiredSessions, deleteSession, findUserBySession } from './db.js';
import { ApiError } from './apiError.js';

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = 'skywings_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1_000;
const SCRYPT_PARAMETERS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/api',
});

const hashSessionToken = (token) => createHash('sha256').update(token).digest('hex');

const readSessionToken = (req) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=');
    if (separator === -1) continue;
    const name = cookie.slice(0, separator).trim();
    if (name !== COOKIE_NAME) continue;
    const token = cookie.slice(separator + 1).trim();
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  }
  return null;
};

export const hashPassword = async (password) => {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, SCRYPT_PARAMETERS);
  return ['scrypt', SCRYPT_PARAMETERS.N, SCRYPT_PARAMETERS.r, SCRYPT_PARAMETERS.p,
    salt.toString('base64url'), derivedKey.toString('base64url')].join('$');
};

export const verifyPassword = async (password, storedHash) => {
  try {
    const [algorithm, nText, rText, pText, saltText, hashText] = storedHash.split('$');
    if (algorithm !== 'scrypt') return false;
    const N = Number(nText);
    const r = Number(rText);
    const p = Number(pText);
    if (N !== SCRYPT_PARAMETERS.N || r !== SCRYPT_PARAMETERS.r || p !== SCRYPT_PARAMETERS.p) return false;

    const expected = Buffer.from(hashText, 'base64url');
    if (expected.length !== KEY_LENGTH) return false;
    const actual = await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length, SCRYPT_PARAMETERS);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
};

export const startSession = (req, res, userId) => {
  const existingToken = readSessionToken(req);
  if (existingToken) deleteSession(hashSessionToken(existingToken));
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  deleteExpiredSessions(new Date().toISOString());
  createSession({ tokenHash: hashSessionToken(token), userId, expiresAt: expiresAt.toISOString() });
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: SESSION_DURATION_MS,
    expires: expiresAt,
  });
};

export const clearSession = (req, res) => {
  const token = readSessionToken(req);
  if (token) deleteSession(hashSessionToken(token));
  res.clearCookie(COOKIE_NAME, cookieOptions());
};

export const requireAuthentication = (req, res, next) => {
  const token = readSessionToken(req);
  if (!token) return next(new ApiError('AUTH_REQUIRED', 'Please sign in to continue.', 401));

  const user = findUserBySession(hashSessionToken(token), new Date().toISOString());
  if (!user) {
    deleteSession(hashSessionToken(token));
    res.clearCookie(COOKIE_NAME, cookieOptions());
    return next(new ApiError('AUTH_REQUIRED', 'Please sign in to continue.', 401));
  }
  req.user = user;
  return next();
};
