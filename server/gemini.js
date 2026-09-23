import { GoogleGenAI } from '@google/genai';
import { ApiError } from './apiError.js';

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const VISA_DISCLAIMER =
  'AI-generated general guidance only. Entry rules can change and depend on your circumstances. Verify requirements with the destination government, embassy, or official immigration authority before travel.';

let client = null;

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      'GEMINI_NOT_CONFIGURED',
      'AI features are not configured on the SkyWings server.',
      503
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
};

const getStatus = (error) => {
  const status = Number(error?.status || error?.code);
  if (Number.isInteger(status)) return status;
  const match = String(error?.message || '').match(/\b(429|502|503|504)\b/);
  return match ? Number(match[1]) : null;
};

const retryAfterMs = (error, attempt) => {
  const headers = error?.response?.headers || error?.headers;
  const retryAfter = typeof headers?.get === 'function' ? headers.get('retry-after') : null;
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 10_000);
  }
  const base = Math.min(750 * (2 ** (attempt - 1)), 5_000);
  return base + Math.floor(Math.random() * 350);
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const toGeminiError = (error) => {
  if (error instanceof ApiError) return error;
  const status = getStatus(error);
  if (status === 401 || status === 403) {
    return new ApiError(
      'GEMINI_AUTH_FAILED',
      'The AI provider could not be authenticated by the SkyWings server.',
      503
    );
  }
  if (status === 429) {
    return new ApiError(
      'GEMINI_RATE_LIMITED',
      'The AI provider is rate limiting requests. Please try again later.',
      429
    );
  }
  if (status === 502 || status === 503) {
    return new ApiError(
      'GEMINI_UNAVAILABLE',
      'The AI provider is currently unavailable. Please try again later.',
      503
    );
  }
  if (status === 504 || error?.name === 'AbortError') {
    return new ApiError(
      'GEMINI_TIMEOUT',
      'The AI provider timed out. Please try again.',
      504
    );
  }
  return new ApiError(
    'GEMINI_REQUEST_FAILED',
    'The AI provider could not complete the request.',
    502
  );
};

const generate = async ({ contents, systemInstruction, responseMimeType, timeoutMs = REQUEST_TIMEOUT_MS }) => {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          ...(systemInstruction ? { systemInstruction } : {}),
          ...(responseMimeType ? { responseMimeType } : {}),
          httpOptions: { timeout: timeoutMs, retryOptions: { attempts: 1 } },
          abortSignal: controller.signal,
        },
      });

      const text = response.text;
      if (typeof text !== 'string' || !text.trim()) {
        throw new ApiError(
          'GEMINI_INVALID_RESPONSE',
          'The AI provider returned an empty response.',
          502
        );
      }
      return text.trim();
    } catch (error) {
      lastError = error;
      const status = getStatus(error);
      if (!RETRYABLE_STATUSES.has(status) || attempt === MAX_ATTEMPTS) break;
      await sleep(retryAfterMs(error, attempt));
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  }

  throw toGeminiError(lastError);
};

const parseJsonResponse = (text) => {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new ApiError(
      'GEMINI_INVALID_RESPONSE',
      'The AI provider returned malformed structured data.',
      502
    );
  }
};

const isNonEmptyString = (value, maxLength = 2_000) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;

const validateItinerary = (value) => {
  if (
    !value ||
    !isNonEmptyString(value.title, 300) ||
    !Array.isArray(value.days) ||
    value.days.length < 1 ||
    value.days.length > 31 ||
    !Array.isArray(value.practicalTips) ||
    value.practicalTips.length > 30
  ) {
    return null;
  }

  const days = value.days.map((day) => {
    if (
      !day ||
      !isNonEmptyString(day.header, 300) ||
      !Array.isArray(day.sections) ||
      day.sections.length < 1 ||
      day.sections.length > 12
    ) return null;

    const sections = day.sections.map((section) => {
      if (
        !section ||
        !isNonEmptyString(section.title, 200) ||
        !Array.isArray(section.items) ||
        section.items.length < 1 ||
        section.items.length > 20 ||
        !section.items.every((item) => isNonEmptyString(item, 1_000))
      ) return null;
      return {
        title: section.title.trim(),
        items: section.items.map((item) => item.trim()),
      };
    });

    if (sections.some((section) => section === null)) return null;
    return { header: day.header.trim(), sections };
  });

  if (
    days.some((day) => day === null) ||
    !value.practicalTips.every((tip) => isNonEmptyString(tip, 1_000))
  ) return null;

  return {
    title: value.title.trim(),
    days,
    practicalTips: value.practicalTips.map((tip) => tip.trim()),
    ...(isNonEmptyString(value.footerNote, 1_000) ? { footerNote: value.footerNote.trim() } : {}),
  };
};

export const generateChatReply = async ({ message, history = [] }) => {
  const safeHistory = history.slice(-10).map((entry) => ({
    role: entry.role === 'model' ? 'model' : 'user',
    parts: [{ text: entry.text }],
  }));
  const contents = [...safeHistory, { role: 'user', parts: [{ text: message }] }];
  return generate({
    contents,
    systemInstruction:
      'You are Sky Wings, a concise travel-planning assistant. Clearly distinguish general guidance from verified live information. Never claim to complete bookings, process payments, or provide verified flight inventory. For safety, legal, health, or immigration topics, tell users to verify with authoritative sources.',
  });
};

export const generateTravelPlan = async ({ destination, typeAndLength, season, hobbies, language }) => {
  const prompt = `
Create a detailed travel itinerary for ${destination}.
Type and duration: ${typeAndLength}
Season: ${season}
Interests: ${hobbies || 'Not specified'}
Write the content in ${language === 'ar' ? 'Arabic' : 'English'}.

Return JSON only with this structure:
{
  "title": "Trip title",
  "days": [
    {
      "header": "Day 1 — title",
      "sections": [
        { "title": "Morning", "items": ["Activity details"] }
      ]
    }
  ],
  "practicalTips": ["Practical tip"]
}
Do not claim reservations have been made. Recommend verification of opening hours, prices, and entry requirements.`;

  const text = await generate({ contents: prompt, responseMimeType: 'application/json' });
  const itinerary = validateItinerary(parseJsonResponse(text));
  if (!itinerary) {
    throw new ApiError(
      'GEMINI_INVALID_RESPONSE',
      'The AI provider returned an invalid itinerary structure.',
      502
    );
  }
  return itinerary;
};

export const generateVisaGuidance = async ({ citizenship, destination }) => {
  const prompt = `
Provide concise, general visa and entry guidance for a traveler holding a passport from ${citizenship} who plans to visit ${destination}.
Cover likely visa status, typical stay limits, and commonly requested documents.
Do not invent citations, official links, or certainty. Explicitly state that rules change and must be verified with the destination government, embassy, or official immigration authority.`;

  const guidance = await generate({ contents: prompt });
  return { guidance, disclaimer: VISA_DISCLAIMER };
};

export const generatePackingItems = async ({ destination, duration }) => {
  const prompt = `
Generate a practical packing list for a trip to ${destination} lasting ${duration}.
Return JSON only as an array of 10 to 20 short item strings. Do not include commentary or markdown.`;
  const value = parseJsonResponse(await generate({
    contents: prompt,
    responseMimeType: 'application/json',
  }));

  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 20 ||
    !value.every((item) => isNonEmptyString(item, 200))
  ) {
    throw new ApiError(
      'GEMINI_INVALID_RESPONSE',
      'The AI provider returned an invalid packing list.',
      502
    );
  }

  return value.map((item) => item.trim());
};
