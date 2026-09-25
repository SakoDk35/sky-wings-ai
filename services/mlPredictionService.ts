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
  'UNSUPPORTED_ROUTE',
  'UNSUPPORTED_AIRLINE',
  'UNSUPPORTED_CURRENCY',
  'UNSUPPORTED_DATE_RANGE',
]);

const extractAirportCode = (location: string): string | null => {
  const exactCode = location.trim().toUpperCase().match(/^[A-Z]{3}$/);
  if (exactCode) return exactCode[0];

  const parentheticalCode = location.toUpperCase().match(/\(([A-Z]{3})\)$/);
  return parentheticalCode ? parentheticalCode[1] : null;
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
  const originCode = extractAirportCode(flight.origin);
  const destinationCode = extractAirportCode(flight.destination);
  const departureDate = flight.departureTime.split('T')[0];

  if (!originCode || !destinationCode) {
    return {
      status: 'unsupported',
      code: 'UNSUPPORTED_ROUTE',
      message: 'This route is not supported by the experimental model.',
    };
  }

  try {
    const response = await fetch('/api/ml/price-prediction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        route: `${originCode}-${destinationCode}`,
        airline: flight.airline,
        departure_date: departureDate,
        current_price: flight.price,
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
