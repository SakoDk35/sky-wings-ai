import type { DemoBooking, Flight, User } from '../types';

interface ApiErrorBody {
  error?: {
    code?: unknown;
    message?: unknown;
  };
}

export class AccountApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AccountApiError';
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'include',
      headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    });
  } catch {
    throw new AccountApiError('NETWORK_ERROR', 'The SkyWings server is unavailable. Please try again.', 0);
  }

  const body = response.status === 204
    ? null
    : await response.json().catch(() => null) as ApiErrorBody | T | null;
  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    throw new AccountApiError(
      typeof errorBody?.error?.code === 'string' ? errorBody.error.code : 'REQUEST_FAILED',
      typeof errorBody?.error?.message === 'string'
        ? errorBody.error.message
        : 'The SkyWings server could not complete the request.',
      response.status,
    );
  }
  return body as T;
};

const isUser = (value: unknown): value is User => {
  if (!value || typeof value !== 'object') return false;
  const user = value as User;
  return Number.isInteger(user.id) && typeof user.name === 'string' &&
    typeof user.email === 'string' && typeof user.createdAt === 'string';
};

const readUser = (response: { data?: { user?: unknown } }): User => {
  if (!isUser(response.data?.user)) {
    throw new AccountApiError('INVALID_RESPONSE', 'The account service returned an invalid response.', 502);
  }
  return response.data.user;
};

const isDemoBooking = (value: unknown): value is DemoBooking => {
  if (!value || typeof value !== 'object') return false;
  const booking = value as DemoBooking;
  return Number.isInteger(booking.id) && Number.isInteger(booking.userId) &&
    typeof booking.demoReference === 'string' && typeof booking.airline === 'string' &&
    typeof booking.flightNumber === 'string' && typeof booking.origin === 'string' &&
    typeof booking.destination === 'string' && typeof booking.departureTime === 'string' &&
    typeof booking.arrivalTime === 'string' && typeof booking.duration === 'string' &&
    Number.isInteger(booking.stops) && typeof booking.price === 'number' &&
    typeof booking.currency === 'string' && typeof booking.createdAt === 'string';
};

export const signup = async (input: { name: string; email: string; password: string }): Promise<User> =>
  readUser(await request('/api/auth/signup', { method: 'POST', body: JSON.stringify(input) }));

export const login = async (input: { email: string; password: string }): Promise<User> =>
  readUser(await request('/api/auth/login', { method: 'POST', body: JSON.stringify(input) }));

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    return readUser(await request('/api/auth/me'));
  } catch (error) {
    if (error instanceof AccountApiError && error.code === 'AUTH_REQUIRED') return null;
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  await request('/api/auth/logout', { method: 'POST' });
};

export const createDemoBooking = async (flight: Flight): Promise<DemoBooking> => {
  const response = await request<{ data?: { booking?: DemoBooking } }>('/api/demo-bookings', {
    method: 'POST',
    body: JSON.stringify({
      flight: {
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        origin: flight.origin,
        destination: flight.destination,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        duration: flight.duration,
        stops: flight.stops,
        price: flight.price,
        currency: flight.currency || 'USD',
      },
    }),
  });
  if (!isDemoBooking(response.data?.booking)) {
    throw new AccountApiError('INVALID_RESPONSE', 'The booking service returned an invalid response.', 502);
  }
  return response.data.booking;
};

export const getDemoBookings = async (): Promise<DemoBooking[]> => {
  const response = await request<{ data?: { bookings?: DemoBooking[] } }>('/api/demo-bookings');
  if (!Array.isArray(response.data?.bookings) || !response.data.bookings.every(isDemoBooking)) {
    throw new AccountApiError('INVALID_RESPONSE', 'The booking service returned an invalid response.', 502);
  }
  return response.data.bookings;
};
