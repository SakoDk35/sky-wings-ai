import { Flight } from "../types";

export interface PriceIntelligence {
  priceCategory: 'LOW' | 'FAIR' | 'HIGH';
  percentileRank: number;
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  savingsAmount: number;
  confidenceScore: number;
  sampleSize?: number; // Number of flights used for real-time calculation
}

export interface PriceClassification {
  category: 'GREAT_DEAL' | 'GOOD_PRICE' | 'FAIR' | 'ABOVE_AVERAGE' | 'EXPENSIVE';
  percentageDifference: number;
  uiCategory: 'cheap' | 'average' | 'expensive';
}

export interface EnhancedPriceIntelligence extends PriceIntelligence {
  classification: PriceClassification;
  valueScore: number; // 0-10 scale
}

/**
 * Calculate real-time market average from actual search results
 * This provides data-driven insights based on current market conditions
 */
export const calculateRealTimeMarketAverage = (
  flights: Flight[],
  targetFlight?: Flight
): {
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  sampleSize: number;
  isSimulated: boolean;
} => {
  if (!flights || flights.length === 0) {
    // No results - return simulated data
    return {
      averagePrice: 0,
      lowestPrice: 0,
      highestPrice: 0,
      sampleSize: 0,
      isSimulated: true
    };
  }

  // Extract and validate prices from all flights
  const prices = flights
    .map(f => typeof f.price === 'number' ? f.price : parseFloat(String(f.price).replace(/[^0-9.]/g, '')))
    .filter(p => !isNaN(p) && p > 0);

  if (prices.length === 0) {
    return {
      averagePrice: 0,
      lowestPrice: 0,
      highestPrice: 0,
      sampleSize: 0,
      isSimulated: true
    };
  }

  // Calculate real-time statistics
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const lowestPrice = sortedPrices[0];
  const highestPrice = sortedPrices[sortedPrices.length - 1];
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

  return {
    averagePrice: Math.round(averagePrice),
    lowestPrice: Math.round(lowestPrice),
    highestPrice: Math.round(highestPrice),
    sampleSize: prices.length,
    isSimulated: false
  };
};

/**
 * Simulate market average price based on route characteristics
 * This creates realistic variation instead of using current flight price
 */
const simulateMarketAverage = (
  origin: string,
  destination: string,
  airline: string,
  departureDate: string
): number => {
  // Extract airport codes
  const extractCode = (loc: string) => {
    const match = loc.match(/\(([A-Z]{3})\)$/);
    return match ? match[1] : 'XXX';
  };
  
  const originCode = extractCode(origin);
  const destCode = extractCode(destination);
  const route = `${originCode}-${destCode}`;
  
  // Base prices for common routes (in USD)
  const routeBasePrices: Record<string, number> = {
    'NYC-LON': 650, 'LON-NYC': 650,
    'DXB-NYC': 900, 'NYC-DXB': 900,
    'LON-PAR': 150, 'PAR-LON': 150,
    'TYO-SIN': 450, 'SIN-TYO': 450,
    'DXB-LON': 550, 'LON-DXB': 550,
    'AMS-IST': 280, 'IST-AMS': 280,
    'PAR-ROM': 180, 'ROM-PAR': 180,
    'BER-MAD': 200, 'MAD-BER': 200,
    'LAX-TYO': 750, 'TYO-LAX': 750,
    'SIN-BKK': 120, 'BKK-SIN': 120,
    'DOH-LON': 600, 'LON-DOH': 600,
    'IST-DXB': 350, 'DXB-IST': 350,
    'NYC-LAX': 300, 'LAX-NYC': 300,
    'PAR-NYC': 700, 'NYC-PAR': 700
  };
  
  // Get base price or calculate from distance (fallback)
  let basePrice = routeBasePrices[route] || routeBasePrices[`${destCode}-${originCode}`] || 400;
  
  // Airline premium factor
  const airlineLower = airline.toLowerCase();
  let airlineFactor = 1.0;
  
  if (['emirates', 'qatar', 'etihad', 'singapore'].some(a => airlineLower.includes(a))) {
    airlineFactor = 1.3; // Premium carriers
  } else if (['lufthansa', 'british', 'air france', 'swiss'].some(a => airlineLower.includes(a))) {
    airlineFactor = 1.15; // Full-service carriers
  } else if (['ryanair', 'wizz', 'easyjet', 'spirit'].some(a => airlineLower.includes(a))) {
    airlineFactor = 0.75; // Budget carriers
  }
  
  // Seasonal factor
  const travelDate = new Date(departureDate);
  const month = travelDate.getMonth();
  let seasonalFactor = 1.0;
  
  // Summer peak (Jun-Aug)
  if ([5, 6, 7].includes(month)) {
    seasonalFactor = 1.2;
  }
  // Holiday season (Dec)
  else if ([11].includes(month)) {
    seasonalFactor = 1.25;
  }
  // Low season (Jan-Feb)
  else if ([0, 1].includes(month)) {
    seasonalFactor = 0.85;
  }
  
  // Add realistic random variation (±15%)
  const randomVariation = 0.85 + Math.random() * 0.30;
  
  return Math.round(basePrice * airlineFactor * seasonalFactor * randomVariation);
};

/**
 * Analyze flight prices using market range buckets instead of only
 * the average. Also returns statistics used downstream for scoring.
 */
export const analyzePriceIntelligence = (flights: Flight[], targetFlight?: Flight): PriceIntelligence => {
  if (!flights || flights.length === 0) {
    return {
      priceCategory: 'FAIR',
      percentileRank: 50,
      averagePrice: 0,
      lowestPrice: 0,
      highestPrice: 0,
      savingsAmount: 0,
      confidenceScore: 0
    };
  }

  // Extract and validate prices
  const prices = flights
    .map(f => typeof f.price === 'number' ? f.price : parseFloat(String(f.price).replace(/[^0-9.]/g, '')))
    .filter(p => !isNaN(p) && p > 0);

  if (prices.length === 0) {
    return {
      priceCategory: 'FAIR',
      percentileRank: 50,
      averagePrice: 0,
      lowestPrice: 0,
      highestPrice: 0,
      savingsAmount: 0,
      confidenceScore: 0
    };
  }

  // Calculate statistics
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const lowestPrice = sortedPrices[0];
  const highestPrice = sortedPrices[sortedPrices.length - 1];
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const range = Math.max(0, highestPrice - lowestPrice);

  // Get target flight price or use average
  const targetPrice = targetFlight 
    ? (typeof targetFlight.price === 'number' ? targetFlight.price : parseFloat(String(targetFlight.price).replace(/[^0-9.]/g, '')))
    : averagePrice;

  // Calculate percentile rank (what percentage of flights are cheaper)
  const cheaperFlights = prices.filter(p => p < targetPrice).length;
  const percentileRank = Math.round((cheaperFlights / prices.length) * 100);

  // Determine price category using market range buckets
  let priceCategory: 'LOW' | 'FAIR' | 'HIGH';
  if (range === 0) {
    // All prices identical – treat as FAIR
    priceCategory = 'FAIR';
  } else {
    const cheapThreshold = lowestPrice + 0.25 * range;
    const expensiveThreshold = lowestPrice + 0.75 * range;

    if (targetPrice <= cheapThreshold) {
      priceCategory = 'LOW';        // CHEAP
    } else if (targetPrice >= expensiveThreshold) {
      priceCategory = 'HIGH';       // EXPENSIVE
    } else {
      priceCategory = 'FAIR';       // AVERAGE
    }
  }

  // Calculate potential savings
  const savingsAmount = Math.max(0, targetPrice - lowestPrice);

  // Calculate confidence score based on sample size
  const confidenceScore = Math.min(100, Math.round((prices.length / 10) * 100));

  return {
    priceCategory,
    percentileRank,
    averagePrice,
    lowestPrice,
    highestPrice,
    savingsAmount,
    confidenceScore,
    sampleSize: prices.length // Include sample size for hybrid logic
  };
};

/**
 * Convert price intelligence to prediction analysis format and
 * enrich it with local "Price Intelligence" metrics used by the UI.
 */
export const convertToPredictionAnalysis = (intelligence: PriceIntelligence, flight: Flight): any => {
  const { priceCategory, percentileRank, averagePrice, lowestPrice, highestPrice, savingsAmount, confidenceScore } = intelligence;

  // Calculate current price
  const currentPrice = typeof flight.price === 'number' ? flight.price : parseFloat(String(flight.price).replace(/[^0-9.]/g, ''));

  // Calculate predicted price change percentage (kept for ML compatibility)
  const predictedPriceChange = priceCategory === 'LOW' 
    ? Math.round(((averagePrice - currentPrice) / currentPrice) * 100)
    : priceCategory === 'HIGH'
      ? Math.round(((lowestPrice - currentPrice) / currentPrice) * 100)
      : 0;

  // Generate detailed reasoning
  const reasoning = generateReasoning(priceCategory, percentileRank, currentPrice, averagePrice, lowestPrice, savingsAmount);

  // Local "Price Intelligence Engine" fields (no external AI)
  // HYBRID APPROACH: Use real-time average from search results when available,
  // fallback to simulated market average for small samples or no results
  const useSimulatedFallback = intelligence.averagePrice === 0 || intelligence.sampleSize < 2;
  
  let marketAverage: number;
  
  if (useSimulatedFallback) {
    // FALLBACK: Use simulated market average with full factors
    // (needed because we don't have real data)
    marketAverage = simulateMarketAverage(
      flight.origin, 
      flight.destination, 
      flight.airline, 
      flight.departureTime
    );
  } else {
    // REAL-TIME DATA: Use raw mathematical average with MINIMAL adjustments
    // When we have actual market data, trust the numbers!
    marketAverage = intelligence.averagePrice;
    
    // Optional: Apply very subtle airline adjustment (±5% max)
    // This accounts for premium vs budget carriers without distorting reality
    const airlineLower = flight.airline.toLowerCase();
    let airlineAdjustment = 1.0;
    
    if (['emirates', 'qatar', 'etihad', 'singapore'].some(a => airlineLower.includes(a))) {
      airlineAdjustment = 1.05; // Premium: +5%
    } else if (['ryanair', 'wizz', 'easyjet', 'spirit'].some(a => airlineLower.includes(a))) {
      airlineAdjustment = 0.95; // Budget: -5%
    }
    
    // Apply minimal adjustment (±5% instead of ±30%)
    marketAverage = Math.round(marketAverage * airlineAdjustment);
  }
  
  const priceDifferencePercent = marketAverage > 0
    ? Math.round(((currentPrice - marketAverage) / marketAverage) * 100)
    : 0;

  // ========================================================================
  // PRICE CLASSIFICATION SYSTEM (FACTS ONLY - NO RECOMMENDATIONS)
  // Provides objective market analysis without prescriptive advice
  // ========================================================================
  
  // Classify price using professional thresholds (5 categories)
  const classification = classifyPriceByThreshold(priceDifferencePercent);
  
  // Generate factual, descriptive explanation (no recommendations)
  const explanation = generateEnhancedPriceExplanation(classification.category, priceDifferencePercent);

  return {
    recommendation: undefined, // Removed - handled by ML Prediction instead
    confidence: confidenceScore,
    reasoning,
    predictedPriceChange,
    priceCategory: classification.uiCategory, // Map 5 categories to 3 UI categories
    score: undefined, // Removed - no grading system
    marketAverage,
    priceDifferencePercent,
    explanation,
    classification: classification.category // Detailed 5-category classification
  };
};

/**
 * Generate human-readable reasoning for the price analysis
 */
const generateReasoning = (
  priceCategory: string,
  percentileRank: number,
  currentPrice: number,
  averagePrice: number,
  lowestPrice: number,
  savingsAmount: number
): string => {
  const categoryText = priceCategory === 'LOW' 
    ? 'excellent deal' 
    : priceCategory === 'HIGH'
      ? 'above average'
      : 'fair market price';

  const percentileText = percentileRank <= 30
    ? 'This price is in the bottom 30% - a great deal!'
    : percentileRank <= 70
      ? 'This price is typical for this route.'
      : 'This price is higher than most options.';

  const savingsText = savingsAmount > 0
    ? `You could save up to $${savingsAmount.toFixed(2)} by choosing the lowest-priced option.`
    : 'This is already the lowest-priced option available.';

  const adviceText = priceCategory === 'LOW'
    ? 'Recommendation: Book now - this is a great price!'
    : priceCategory === 'HIGH'
      ? 'Recommendation: Wait or look for alternatives - better deals may be available.'
      : 'Recommendation: Monitor prices - this is a fair deal but may improve.';

  return `${categoryText} (${percentileText}) ${savingsText} ${adviceText}`;
};

/**
 * Generate short human explanation used by the
 * “Price Intelligence” UI block.
 */
const generatePriceExplanation = (priceDifferencePercent: number): string => {
  if (!isFinite(priceDifferencePercent)) {
    return 'Price information for this route is limited.';
  }

  if (Math.abs(priceDifferencePercent) < 3) {
    return 'This flight is priced close to the average for this route.';
  }

  const absDiff = Math.abs(priceDifferencePercent);
  const direction = priceDifferencePercent < 0 ? 'cheaper' : 'more expensive';
  return `This flight is ${absDiff}% ${direction} than the average price for this route.`;
};

// --- Helper scoring functions (duration, stops, airline quality) ---

const parseDurationToMinutesLocal = (str: string | undefined): number => {
  if (!str) return 0;
  let minutes = 0;
  const hoursMatch = str.match(/(\d+)h/);
  const minsMatch = str.match(/(\d+)m/);
  if (hoursMatch) minutes += parseInt(hoursMatch[1], 10) * 60;
  if (minsMatch) minutes += parseInt(minsMatch[1], 10);
  return minutes || 0;
};

// Refined bands with smoother gradient for better differentiation
const computeDurationScore = (duration: string): number => {
  const mins = parseDurationToMinutesLocal(duration);
  if (mins === 0) return 0.5;
  
  // Exponential decay based on duration - shorter flights score much higher
  if (mins <= 180) return 1.0;           // up to 3h - excellent
  if (mins <= 240) return 0.9;           // 3-4h - very good
  if (mins <= 300) return 0.8;           // 4-5h - good
  if (mins <= 360) return 0.7;           // 5-6h - above average
  if (mins <= 420) return 0.6;           // 6-7h - average
  if (mins <= 480) return 0.5;           // 7-8h - below average
  if (mins <= 600) return 0.4;           // 8-10h - poor
  if (mins <= 720) return 0.3;           // 10-12h - very poor
  return 0.2;                            // 12h+ - extremely long
};

const computeStopsScore = (stops: number): number => {
  if (stops <= 0) return 1.0;    // Non-stop - best
  if (stops === 1) return 0.6;   // 1 stop - moderate penalty
  if (stops === 2) return 0.3;   // 2 stops - significant penalty
  return 0.1;                    // 3+ stops - very poor
};

const computeAirlineQualityScore = (airline: string): number => {
  const name = airline.toLowerCase();

  const premiumAirlines = [
    'emirates',
    'qatar',
    'etihad',
    'singapore',
    'lufthansa',
    'british',
    'swiss',
    'air france',
    'turkish'
  ];

  const budgetAirlines = [
    'ryanair',
    'wizz',
    'easyjet',
    'spirit',
    'frontier'
  ];

  if (premiumAirlines.some(a => name.includes(a))) {
    return 1.0;
  }
  if (budgetAirlines.some(a => name.includes(a))) {
    return 0.5;
  }
  return 0.8; // default for standard carriers
};

// ============================================================================
// PROFESSIONAL PRICE CLASSIFICATION SYSTEM
// Threshold-based categorization with linear 0-10 scoring
// ============================================================================

/**
 * Price classification thresholds based on percentage difference from market average
 * Negative percentages = cheaper than average (good for buyer)
 * Positive percentages = more expensive than average (bad for buyer)
 */
const PRICE_THRESHOLDS = {
  GREAT_DEAL: -25,          // ≤ -25% (أرخص بربع السعر فأكثر)
  GOOD_PRICE_UPPER: -5.1,   // بين -24.9% و -5.1%
  FAIR_LOWER: -5,           // نطاق السعر العادل (±5%)
  FAIR_UPPER: 5,            // يشمل الـ 0%
  ABOVE_AVERAGE_UPPER: 25,  // بين +5.1% و +25%
  EXPENSIVE: 25             // أكثر من +25% (غالي جداً)
};

/**
 * Classify price based on percentage difference from market average
 * Updated for 25% thresholds and strictly descriptive (No scores/recommendations)
 */
const classifyPriceByThreshold = (percentageDiff: number): PriceClassification => {
  let category: PriceClassification['category'];
  let uiCategory: PriceClassification['uiCategory'];
  
  if (percentageDiff <= PRICE_THRESHOLDS.GREAT_DEAL) {
    category = 'GREAT_DEAL';
    uiCategory = 'cheap';
  } else if (percentageDiff <= PRICE_THRESHOLDS.GOOD_PRICE_UPPER) {
    category = 'GOOD_PRICE';
    uiCategory = 'cheap';
  } else if (percentageDiff > PRICE_THRESHOLDS.EXPENSIVE) {
    category = 'EXPENSIVE';
    uiCategory = 'expensive';
  } else if (percentageDiff > PRICE_THRESHOLDS.FAIR_UPPER) {
    category = 'ABOVE_AVERAGE';
    uiCategory = 'expensive';
  } else {
    // Covers the ±5% range (including the 0% case)
    category = 'FAIR';
    uiCategory = 'average';
  }
  
  // NOTE: We have removed the 'score' calculation to keep the UI clean and factual.
  return { category, percentageDifference: percentageDiff, uiCategory };
};

/**
 * Calculate value score on 0-10 scale using linear formula
 * Base score: 6/10 for 0% difference (fair market price)
 * Linear scaling: +0.4 points per 1% cheaper, -0.4 points per 1% more expensive
 * 
 * Examples:
 * -20% → 6 - (0.4 * -20) = 14 → clamped to 10
 * -10% → 6 - (0.4 * -10) = 10
 * -5%  → 6 - (0.4 * -5) = 8
 * 0%   → 6 - (0.4 * 0) = 6
 * +5%  → 6 - (0.4 * 5) = 4
 * +10% → 6 - (0.4 * 10) = 2
 * +20% → 6 - (0.4 * 20) = -2 → clamped to 0
 */
const calculateValueScore = (percentageDiff: number): number => {
  const baseScore = 6;
  const slope = 0.4; // Points per percentage point
  
  let score = baseScore - (slope * percentageDiff);
  
  // Clamp to 0-10 range
  score = Math.max(0, Math.min(10, score));
  
  return Math.round(score);
};

/**
 * Generate human-readable explanation for each price category
 * Provides specific messaging based on classification and percentage difference
 */
const generateEnhancedPriceExplanation = (
  category: string, 
  percentageDiff: number
): string => {
  const absDiff = Math.abs(percentageDiff);
  
  switch (category) {
    case 'GREAT_DEAL':
      return `This flight is ${absDiff}% cheaper than the current market average.`;
    case 'GOOD_PRICE':
      return `This flight is ${absDiff}% below the market average for this route.`;
    case 'FAIR':
      if (Math.abs(percentageDiff) < 1) {
        return 'This flight is priced exactly at the current market average for this route.';
      }
      return `This flight is priced within ±2% of the market average.`;
    case 'ABOVE_AVERAGE':
      return `This flight is ${absDiff}% above the market average for this route.`;
    case 'EXPENSIVE':
      return `This flight is ${absDiff}% more expensive than the market average for this route.`;
    default:
      return 'Price information for this route is limited.';
  }
};
