import { Flight, MLPrediction, MLPredictionState } from '../types';

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
}

interface MLPredictionPayload {
  data?: {
    predicted_price?: unknown;
    trend?: unknown;
    price_change_percent?: unknown;
    summary?: unknown;
    currency?: unknown;
    model_output_label?: unknown;
  };
}

const UNSUPPORTED_CODES = new Set([
  'UNSUPPORTED_CURRENCY',
  'UNSUPPORTED_DATE_RANGE',
  'UNSUPPORTED_PRICE_RANGE',
  'UNSUPPORTED_DURATION_RANGE',
  'UNSUPPORTED_STOPS',
  'INVALID_DURATION',
  'INVALID_STOPS',
]);

const parseDurationMinutes = (duration: string): number | null => {
  if (typeof duration !== 'string') return null;
  const match = duration.trim().match(/^(?:(\d+)h)?(?:\s*(\d+)m)?$/i);
  if (!match || (!match[1] && !match[2])) return null;
  const minutes = Number(match[1] || 0) * 60 + Number(match[2] || 0);
  return Number.isInteger(minutes) && minutes > 0 ? minutes : null;
};

const parsePrediction = (payload: MLPredictionPayload): MLPrediction | null => {
  const data = payload.data;
  if (
    !data ||
    typeof data.predicted_price !== 'number' ||
    !Number.isFinite(data.predicted_price) ||
    data.predicted_price <= 0 ||
    !['increase', 'decrease', 'stable'].includes(String(data.trend)) ||
    typeof data.price_change_percent !== 'number' ||
    !Number.isFinite(data.price_change_percent) ||
    typeof data.summary !== 'string' ||
    !data.summary.trim() ||
    data.currency !== 'USD' ||
    typeof data.model_output_label !== 'string' ||
    !data.model_output_label.trim()
  ) {
    return null;
  }

  return {
    predictedPrice: data.predicted_price,
    trend: data.trend as MLPrediction['trend'],
    priceChangePercent: data.price_change_percent,
    summary: data.summary.trim(),
    currency: 'USD',
    outputLabel: data.model_output_label.trim(),
  };
};

export const getMLPricePrediction = async (flight: Flight): Promise<MLPredictionState> => {
  const departureDate = flight.departureTime.split('T')[0];
  const totalDurationMinutes = parseDurationMinutes(flight.duration);

  if (totalDurationMinutes === null) {
    return {
      status: 'unsupported',
      code: 'INVALID_DURATION',
      message: 'This flight does not include a usable provider duration.',
    };
  }

  try {
    const response = await fetch('/api/ml/price-prediction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        departure_date: departureDate,
        current_price: flight.price,
        total_duration_minutes: totalDurationMinutes,
        stops: flight.stops,
        currency: flight.currency || 'USD',
      }),
    });

    const payload = await response.json().catch(() => null) as
      | (MLPredictionPayload & ApiErrorPayload)
      | null;

    if (!response.ok) {
      const code = payload?.error?.code || 'ML_REQUEST_FAILED';
      if (UNSUPPORTED_CODES.has(code)) {
        return {
          status: 'unsupported',
          code,
          message: payload?.error?.message || 'This flight is not supported by the experimental model.',
        };
      }
      return {
        status: 'unavailable',
        message: 'Experimental ML prediction is currently unavailable.',
      };
    }

    const prediction = payload ? parsePrediction(payload) : null;
    if (!prediction) {
      return {
        status: 'unavailable',
        message: 'Experimental ML prediction returned an invalid response.',
      };
    }

    return { status: 'result', prediction };
  } catch {
    return {
      status: 'unavailable',
      message: 'Experimental ML prediction is currently unavailable.',
    };
  }
};
