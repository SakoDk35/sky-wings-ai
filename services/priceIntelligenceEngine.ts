import type { Flight, PredictionAnalysis } from '../types';

const NEAR_AVERAGE_THRESHOLD_PERCENT = 5;

const normalizedCurrency = (flight: Flight): string =>
  (flight.currency || 'USD').trim().toUpperCase();

const hasValidPrice = (flight: Flight): boolean =>
  typeof flight.price === 'number' && Number.isFinite(flight.price) && flight.price > 0;

const roundToOneDecimal = (value: number): number => Math.round(value * 10) / 10;

/**
 * Compare each displayed flight only with valid displayed prices in the same
 * currency. The arithmetic mean is intentionally left unadjusted: there are
 * no provider, carrier, route, seasonal, or simulated inputs.
 */
export const analyzeDisplayedFlightPrices = (
  displayedFlights: Flight[],
): Record<string, PredictionAnalysis> => {
  if (displayedFlights.length === 0) return {};

  const validFlightsByCurrency = new Map<string, Flight[]>();
  for (const flight of displayedFlights) {
    if (!hasValidPrice(flight)) continue;
    const currency = normalizedCurrency(flight);
    const comparableFlights = validFlightsByCurrency.get(currency) || [];
    comparableFlights.push(flight);
    validFlightsByCurrency.set(currency, comparableFlights);
  }

  const analyses: Record<string, PredictionAnalysis> = {};

  for (const flight of displayedFlights) {
    if (!hasValidPrice(flight)) {
      analyses[flight.id] = {
        status: 'unavailable',
        message: 'A comparative price analysis is not available because this result has no valid price.',
      };
      continue;
    }

    const comparableFlights = validFlightsByCurrency.get(normalizedCurrency(flight)) || [];
    if (comparableFlights.length < 2) {
      analyses[flight.id] = {
        status: 'unavailable',
        message: displayedFlights.length === 1
          ? 'Only one result is currently displayed, so a comparative price analysis is not available.'
          : 'Fewer than two displayed results have valid prices in this currency, so a comparative price analysis is not available.',
      };
      continue;
    }

    const resultSetAverage = comparableFlights.reduce((sum, item) => sum + item.price, 0)
      / comparableFlights.length;
    const priceDifferencePercent = roundToOneDecimal(
      ((flight.price - resultSetAverage) / resultSetAverage) * 100,
    );
    const classification = priceDifferencePercent < -NEAR_AVERAGE_THRESHOLD_PERCENT
      ? 'BELOW_AVERAGE'
      : priceDifferencePercent > NEAR_AVERAGE_THRESHOLD_PERCENT
        ? 'ABOVE_AVERAGE'
        : 'NEAR_AVERAGE';

    analyses[flight.id] = {
      status: 'comparison',
      resultSetAverage,
      priceDifferencePercent,
      classification,
    };
  }

  return analyses;
};
