/**
 * Best Time to Book Analysis Service
 * Analyzes optimal booking timing based on days before departure
 */

import { Flight } from "../types";

export interface BookingTimingAnalysis {
  optimalWindow: string;
  currentDaysBefore: number;
  recommendation: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Analyze the best time to book based on days before departure
 */
export const analyzeBookingTiming = (flight: Flight): BookingTimingAnalysis => {
  // Calculate days before departure
  const departureDate = new Date(flight.departureTime);
  const today = new Date();
  const daysBeforeDeparture = Math.max(0, Math.round(
    (departureDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  ));

  // Determine optimal window and recommendation
  let optimalWindow: string;
  let recommendation: string;
  let urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';

  if (daysBeforeDeparture < 7) {
    // Last minute booking
    optimalWindow = 'Past optimal window';
    recommendation = 'Prices are usually highest this close to departure. Book immediately if you need this flight.';
    urgencyLevel = 'HIGH';
  } else if (daysBeforeDeparture >= 7 && daysBeforeDeparture < 21) {
    // Getting close
    optimalWindow = 'Closing soon';
    recommendation = 'Prices may start increasing soon. Consider booking within the next few days.';
    urgencyLevel = 'MEDIUM';
  } else if (daysBeforeDeparture >= 21 && daysBeforeDeparture <= 60) {
    // Optimal window
    optimalWindow = 'Optimal booking window (3-8 weeks before)';
    recommendation = 'You are in the optimal booking window. Prices are typically stable during this period.';
    urgencyLevel = 'LOW';
  } else if (daysBeforeDeparture > 60 && daysBeforeDeparture <= 90) {
    // Early but reasonable
    optimalWindow = 'Early booking';
    recommendation = 'Good time to book for peace of mind, though prices may fluctuate slightly.';
    urgencyLevel = 'LOW';
  } else if (daysBeforeDeparture > 90 && daysBeforeDeparture <= 180) {
    // Very early
    optimalWindow = 'Very early booking';
    recommendation = 'You are booking very early. Prices may still decrease, but you have good selection.';
    urgencyLevel = 'LOW';
  } else {
    // Extremely early (> 6 months)
    optimalWindow = 'Extremely early';
    recommendation = 'This is very far in advance. Prices are likely to change significantly.';
    urgencyLevel = 'LOW';
  }

  return {
    optimalWindow,
    currentDaysBefore: daysBeforeDeparture,
    recommendation,
    urgencyLevel
  };
};
