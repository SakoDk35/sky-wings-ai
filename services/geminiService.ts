import { ChatMessage, Flight, TripItinerary } from '../types';
import { searchFlightOffers } from './amadeusService';

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
}

export class SkyWingsApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'SkyWingsApiError';
    this.code = code;
    this.status = status;
  }
}

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new SkyWingsApiError(
      'SKYWINGS_API_UNAVAILABLE',
      'The SkyWings server is unavailable. Please try again later.',
      503
    );
  }

  const payload = await response.json().catch(() => null) as ({ data?: T } & ApiErrorPayload) | null;
  if (!response.ok) {
    throw new SkyWingsApiError(
      payload?.error?.code || 'API_REQUEST_FAILED',
      payload?.error?.message || 'The request could not be completed.',
      response.status
    );
  }
  if (!payload || payload.data === undefined) {
    throw new SkyWingsApiError(
      'INVALID_SERVER_RESPONSE',
      'The SkyWings server returned an invalid response.',
      502
    );
  }
  return payload.data;
};

export const findRealFlights = async (
  origin: string,
  destination: string,
  date: string,
  returnDate?: string,
  passengers?: string,
  travelClass?: string
): Promise<Flight[]> => {
  const adults = passengers ? Number.parseInt(passengers, 10) || 1 : 1;
  return searchFlightOffers(origin, destination, date, returnDate, adults, travelClass);
};

export const sendChatMessage = async (
  message: string,
  history: Pick<ChatMessage, 'role' | 'text'>[] = []
): Promise<string> => {
  const data = await postJson<{ message: string }>('/api/ai/chat', { message, history });
  return data.message;
};

export const generateTripItinerary = async (
  destination: string,
  typeAndLength: string,
  season: string,
  hobbies: string,
  language: 'en' | 'ar' = 'en'
): Promise<TripItinerary> => postJson<TripItinerary>('/api/ai/travel-plan', {
  destination,
  typeAndLength,
  season,
  hobbies,
  language,
});

export const getVisaRequirements = async (
  citizenship: string,
  destination: string
): Promise<string> => {
  const data = await postJson<{ guidance: string; disclaimer: string }>('/api/ai/visa', {
    citizenship,
    destination,
  });
  return `${data.guidance}\n\nImportant: ${data.disclaimer}`;
};

export const generatePackingList = async (
  destination: string,
  duration: string
): Promise<string[]> => {
  const data = await postJson<{ items: string[] }>('/api/ai/packing-list', {
    destination,
    duration,
  });
  return data.items;
};
