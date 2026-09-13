export interface RiskIntelligence {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  weatherAlerts: string[];
  politicalStability: string;
  delaysExpected: boolean;
  seasonalFactors: string[];
  safetyScore: number;
}

/**
 * Analyze travel risk using internal database and seasonal logic
 * No external APIs required
 */
export const analyzeTravelRisk = (destination: string, date: string): RiskIntelligence => {
  // Parse the date to determine season
  const travelDate = new Date(date);
  const month = travelDate.getMonth(); // 0-11
  const isRainySeason = [5, 6, 7, 8].includes(month); // May-August
  const isWinterSeason = [11, 0, 1].includes(month); // Dec-Feb
  const isHurricaneSeason = [7, 8, 9].includes(month); // Aug-Oct
  const isSummerPeak = [6, 7].includes(month); // Peak tourist season

  // Extract airport code from destination (e.g., "London (LHR)" -> "LHR")
  const extractCode = (loc: string) => {
    const match = loc.match(/\(([A-Z]{3})\)$/);
    return match ? match[1] : 'XXX';
  };
  
  const destCode = extractCode(destination).toUpperCase();

  // Expanded safety database with more cities and varied risk profiles
  const safetyDatabase: Record<string, any> = {
    // Europe - Generally safe (safety scores 85-95)
    'PAR': { safetyScore: 88, politicalStability: 'Very stable', weatherRiskBase: 'low', region: 'Europe' },
    'LON': { safetyScore: 86, politicalStability: 'Very stable', weatherRiskBase: 'medium', region: 'Europe' },
    'ROM': { safetyScore: 84, politicalStability: 'Stable', weatherRiskBase: 'low', region: 'Europe' },
    'BER': { safetyScore: 91, politicalStability: 'Very stable', weatherRiskBase: 'medium', region: 'Europe' },
    'MAD': { safetyScore: 87, politicalStability: 'Stable', weatherRiskBase: 'low', region: 'Europe' },
    'AMS': { safetyScore: 90, politicalStability: 'Very stable', weatherRiskBase: 'medium', region: 'Europe' },
    'BCN': { safetyScore: 85, politicalStability: 'Stable', weatherRiskBase: 'low', region: 'Europe' },
    'VIE': { safetyScore: 92, politicalStability: 'Very stable', weatherRiskBase: 'medium', region: 'Europe' },
    'ZRH': { safetyScore: 94, politicalStability: 'Very stable', weatherRiskBase: 'medium', region: 'Europe' },
    'BRU': { safetyScore: 83, politicalStability: 'Stable', weatherRiskBase: 'medium', region: 'Europe' },
    
    // Middle East - Variable (safety scores 70-95)
    'DXB': { safetyScore: 95, politicalStability: 'Very stable', weatherRiskBase: 'high', region: 'Middle East' },
    'DOH': { safetyScore: 93, politicalStability: 'Stable', weatherRiskBase: 'high', region: 'Middle East' },
    'IST': { safetyScore: 72, politicalStability: 'Moderate', weatherRiskBase: 'medium', region: 'Middle East' },
    'AUH': { safetyScore: 94, politicalStability: 'Very stable', weatherRiskBase: 'high', region: 'Middle East' },
    'RUH': { safetyScore: 78, politicalStability: 'Stable', weatherRiskBase: 'high', region: 'Middle East' },
    'TLV': { safetyScore: 75, politicalStability: 'Moderate', weatherRiskBase: 'low', region: 'Middle East' },
    
    // Asia - Generally safe but varied (safety scores 65-98)
    'TYO': { safetyScore: 98, politicalStability: 'Very stable', weatherRiskBase: 'low', region: 'Asia' },
    'SIN': { safetyScore: 97, politicalStability: 'Very stable', weatherRiskBase: 'medium', region: 'Asia' },
    'BKK': { safetyScore: 78, politicalStability: 'Stable', weatherRiskBase: 'high', region: 'Asia' },
    'DEL': { safetyScore: 62, politicalStability: 'Moderate', weatherRiskBase: 'high', region: 'Asia' },
    'BOM': { safetyScore: 64, politicalStability: 'Moderate', weatherRiskBase: 'high', region: 'Asia' },
    'KUL': { safetyScore: 82, politicalStability: 'Stable', weatherRiskBase: 'medium', region: 'Asia' },
    'JKT': { safetyScore: 70, politicalStability: 'Moderate', weatherRiskBase: 'medium', region: 'Asia' },
    'MNL': { safetyScore: 68, politicalStability: 'Moderate', weatherRiskBase: 'high', region: 'Asia' },
    'SEL': { safetyScore: 94, politicalStability: 'Very stable', weatherRiskBase: 'medium', region: 'Asia' },
    'PEK': { safetyScore: 80, politicalStability: 'Stable', weatherRiskBase: 'medium', region: 'Asia' },
    'SHA': { safetyScore: 82, politicalStability: 'Stable', weatherRiskBase: 'medium', region: 'Asia' },
    
    // North America (safety scores 78-90)
    'NYC': { safetyScore: 80, politicalStability: 'Stable', weatherRiskBase: 'medium', region: 'North America' },
    'LAX': { safetyScore: 78, politicalStability: 'Stable', weatherRiskBase: 'low', region: 'North America' },
    'YTO': { safetyScore: 92, politicalStability: 'Very stable', weatherRiskBase: 'high', region: 'North America' },
    'YVR': { safetyScore: 91, politicalStability: 'Very stable', weatherRiskBase: 'medium', region: 'North America' },
    'MIA': { safetyScore: 79, politicalStability: 'Stable', weatherRiskBase: 'high', region: 'North America' },
    'CHI': { safetyScore: 81, politicalStability: 'Stable', weatherRiskBase: 'high', region: 'North America' },
    'SFO': { safetyScore: 82, politicalStability: 'Stable', weatherRiskBase: 'low', region: 'North America' },
    
    // South America (safety scores 60-78)
    'SAO': { safetyScore: 68, politicalStability: 'Moderate', weatherRiskBase: 'medium', region: 'South America' },
    'BUE': { safetyScore: 74, politicalStability: 'Stable', weatherRiskBase: 'low', region: 'South America' },
    'BOG': { safetyScore: 62, politicalStability: 'Moderate', weatherRiskBase: 'medium', region: 'South America' },
    'LIM': { safetyScore: 65, politicalStability: 'Moderate', weatherRiskBase: 'low', region: 'South America' },
    'GRU': { safetyScore: 66, politicalStability: 'Moderate', weatherRiskBase: 'medium', region: 'South America' },
    
    // Africa (safety scores 55-75)
    'CAI': { safetyScore: 60, politicalStability: 'Moderate', weatherRiskBase: 'low', region: 'Africa' },
    'JNB': { safetyScore: 58, politicalStability: 'Moderate', weatherRiskBase: 'low', region: 'Africa' },
    'CPT': { safetyScore: 62, politicalStability: 'Moderate', weatherRiskBase: 'low', region: 'Africa' },
    'ADD': { safetyScore: 55, politicalStability: 'Unstable', weatherRiskBase: 'medium', region: 'Africa' },
    'LOS': { safetyScore: 52, politicalStability: 'Unstable', weatherRiskBase: 'high', region: 'Africa' },
    
    // Oceania (safety scores 90-95)
    'SYD': { safetyScore: 93, politicalStability: 'Very stable', weatherRiskBase: 'low', region: 'Oceania' },
    'MEL': { safetyScore: 92, politicalStability: 'Very stable', weatherRiskBase: 'low', region: 'Oceania' },
    'AKL': { safetyScore: 94, politicalStability: 'Very stable', weatherRiskBase: 'low', region: 'Oceania' }
  };

  // Get destination data or use defaults
  const destData = safetyDatabase[destCode] || {
    safetyScore: 75,
    politicalStability: 'Generally stable',
    weatherRiskBase: 'medium' as 'low' | 'medium' | 'high',
    region: 'Unknown'
  };

  // Apply base weather risk from city data (used for weather alerts)
  const baseWeatherRisk = destData.weatherRiskBase || 'medium';

  // ========================================================================
  // INTEGRATED RISK LOGIC: Overall Risk determines Safety Score
  // ========================================================================
  
  // Step 1: Build weather alerts to determine Weather Risk
  const weatherAlerts: string[] = [];
  
  if (isRainySeason) {
    if (baseWeatherRisk === 'high') {
      weatherAlerts.push('Monsoon/rainy season - expect heavy rainfall and possible disruptions');
    } else if (baseWeatherRisk === 'medium') {
      weatherAlerts.push('Rainy season - pack waterproof clothing and check weather forecasts');
    }
  }
  
  if (isWinterSeason) {
    if (['CHI', 'YTO', 'YVR', 'BER', 'AMS'].includes(destCode)) {
      weatherAlerts.push('Winter conditions - snow and ice possible, monitor weather before travel');
    } else if (baseWeatherRisk !== 'low') {
      weatherAlerts.push('Winter season - cooler temperatures expected');
    }
  }
  
  if (isHurricaneSeason && ['MIA', 'CUN', 'SJU', 'NAS', 'LAX', 'SFO'].includes(destCode)) {
    weatherAlerts.push('Hurricane/cyclone season - monitor tropical storm activity and consider travel insurance');
  }
  
  if (isSummerPeak) {
    if (['PAR', 'ROM', 'BCN', 'AMS', 'LON'].includes(destCode)) {
      weatherAlerts.push('Peak summer tourist season - expect extreme heat and large crowds');
    }
    if (['DXB', 'DOH', 'AUH', 'RUH'].includes(destCode)) {
      weatherAlerts.push('Extreme summer heat - temperatures can exceed 45°C (113°F), stay hydrated');
    }
    if (['BKK', 'SIN', 'JKT', 'MNL'].includes(destCode)) {
      weatherAlerts.push('Hot and humid conditions - high chance of afternoon thunderstorms');
    }
  }
  
  // Add city-specific alerts
  if (destCode === 'DEL' || destCode === 'BOM') {
    if ([9, 10, 11].includes(month)) {
      weatherAlerts.push('Air quality concerns - sensitive individuals should take precautions');
    }
  }
  
  if (destCode === 'TYO' || destCode === 'SEL') {
    if ([7, 8].includes(month)) {
      weatherAlerts.push('Typhoon season possible - monitor weather updates');
    }
  }
  
  if (destCode === 'IST') {
    if ([0, 1, 2].includes(month)) {
      weatherAlerts.push('Cold and wet winter conditions - pack accordingly');
    }
  }

  // Step 2: Determine Weather Risk level from alerts
  let weatherRisk: 'low' | 'medium' | 'high' = 'low';
  if (weatherAlerts.length >= 1 && weatherAlerts.length <= 2) {
    weatherRisk = 'medium';
  }
  if (weatherAlerts.length >= 3 || weatherAlerts.some(alert => 
    alert.toLowerCase().includes('hurricane') || 
    alert.toLowerCase().includes('typhoon') ||
    alert.toLowerCase().includes('extreme') ||
    alert.toLowerCase().includes('monsoon')
  )) {
    weatherRisk = 'high';
  }
  if (weatherAlerts.length === 0) {
    weatherRisk = 'low';
  }

  // Step 3: Determine Security Risk from political stability database
  let securityRisk: 'low' | 'medium' | 'high';
  const politicalStabilityLower = destData.politicalStability.toLowerCase();
  if (politicalStabilityLower.includes('very stable') || politicalStabilityLower.includes('stable')) {
    securityRisk = 'low';
  } else if (politicalStabilityLower.includes('moderate')) {
    securityRisk = 'medium';
  } else { // unstable
    securityRisk = 'high';
  }

  // Step 4: Determine OVERALL RISK as the HIGHEST (worst) of Weather and Security
  const toRank = (v: 'low' | 'medium' | 'high') => v === 'low' ? 1 : v === 'medium' ? 2 : 3;
  const overallRiskRank = Math.max(toRank(weatherRisk), toRank(securityRisk));
  
  let overallRisk: 'low' | 'medium' | 'high';
  if (overallRiskRank === 1) {
    overallRisk = 'low';
  } else if (overallRiskRank === 2) {
    overallRisk = 'medium';
  } else {
    overallRisk = 'high';
  }

  // Step 5: Generate Safety Score based on Overall Risk (with random variance ±4)
  // LOW: 80-95, MEDIUM: 50-70, HIGH: 20-45
  let baseScore: number;
  let varianceRange: number;
  
  if (overallRisk === 'low') {
    baseScore = 87; // Middle of 80-95 range
    varianceRange = 8; // ±4 gives us 83-91, well within 80-95
  } else if (overallRisk === 'medium') {
    baseScore = 60; // Middle of 50-70 range
    varianceRange = 10; // ±5 gives us 55-65, well within 50-70
  } else { // high
    baseScore = 32; // Middle of 20-45 range
    varianceRange = 12; // ±6 gives us 26-38, well within 20-45
  }
  
  // Add small random variance so different flights show slightly different scores
  const randomVariance = Math.floor(Math.random() * (varianceRange + 1)) - Math.floor(varianceRange / 2);
  let safetyScore = baseScore + randomVariance;
  
  // Ensure score stays within the correct range for the risk level
  if (overallRisk === 'low') {
    safetyScore = Math.max(80, Math.min(95, safetyScore));
  } else if (overallRisk === 'medium') {
    safetyScore = Math.max(50, Math.min(70, safetyScore));
  } else {
    safetyScore = Math.max(20, Math.min(45, safetyScore));
  }

  // Step 6: Set riskLevel to match overallRisk (for backward compatibility)
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  if (overallRisk === 'low') {
    riskLevel = 'LOW';
  } else if (overallRisk === 'medium') {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'HIGH';
  }

  // Check for expected delays based on season, region, and city
  const delaysExpected = 
    isWinterSeason || 
    isHurricaneSeason || 
    isSummerPeak ||
    ['LON', 'NYC', 'CHI', 'FRA', 'PAR', 'AMS'].includes(destCode) ||
    weatherAlerts.length >= 2;

  // Add seasonal factors
  const seasonalFactors: string[] = [];
  if (isRainySeason && baseWeatherRisk !== 'low') seasonalFactors.push('Increased rainfall');
  if (isWinterSeason) seasonalFactors.push('Potential snow/ice conditions');
  if (isHurricaneSeason) seasonalFactors.push('Tropical storm activity');
  if (isSummerPeak) seasonalFactors.push('Peak tourist season - expect crowds');

  return {
    riskLevel,
    weatherAlerts,
    politicalStability: destData.politicalStability,
    delaysExpected,
    seasonalFactors,
    safetyScore
  };
};

/**
 * Convert risk intelligence to risk analysis format
 */
export const convertToRiskAnalysis = (intelligence: RiskIntelligence): any => {
  const { riskLevel, weatherAlerts, politicalStability, delaysExpected, seasonalFactors, safetyScore } = intelligence;

  // Generate overall assessment
  const overallAssessment = generateOverallAssessment(riskLevel, politicalStability, safetyScore, seasonalFactors);

  // Derive local risk bands for UI based on number and severity of alerts
  let weatherRisk: 'low' | 'medium' | 'high' = 'low';
  if (weatherAlerts.length >= 1 && weatherAlerts.length <= 2) {
    weatherRisk = 'medium';
  }
  if (weatherAlerts.length >= 3 || weatherAlerts.some(alert => 
    alert.toLowerCase().includes('hurricane') || 
    alert.toLowerCase().includes('typhoon') ||
    alert.toLowerCase().includes('extreme') ||
    alert.toLowerCase().includes('monsoon')
  )) {
    weatherRisk = 'high';
  }
  if (weatherAlerts.length === 0) {
    weatherRisk = 'low';
  }

  // Safety risk with aligned thresholds: >70=LOW, 40-70=MEDIUM, <40=HIGH
  let safetyRisk: 'low' | 'medium' | 'high';
  if (safetyScore > 70) {
    safetyRisk = 'low';
  } else if (safetyScore >= 40) {
    safetyRisk = 'medium';
  } else {
    safetyRisk = 'high';
  }

  // Overall risk is the HIGHEST (worst) level between weather and safety
  const toRank = (v: 'low' | 'medium' | 'high') => (v === 'low' ? 1 : v === 'medium' ? 2 : 3);
  const overallRisk: 'low' | 'medium' | 'high' =
    toRank(weatherRisk) >= toRank(safetyRisk) ? weatherRisk : safetyRisk;

  // Generate dynamic explanation that matches the actual labels
  const explanation = `Weather risk is ${weatherRisk.toUpperCase()}, safety risk is ${safetyRisk.toUpperCase()} (score: ${safetyScore}/100), overall risk is ${overallRisk.toUpperCase()}. ${overallAssessment}`;

  return {
    riskLevel,
    weatherAlerts,
    politicalStability,
    delaysExpected,
    overallAssessment,
    safetyScore,
    weatherRisk,
    safetyRisk,
    overallRisk,
    explanation
  };
};

/**
 * Generate human-readable overall assessment with integrated risk logic
 * Now that Safety Score is derived from Overall Risk, they are always consistent
 */
const generateOverallAssessment = (
  riskLevel: string,
  politicalStability: string,
  safetyScore: number,
  seasonalFactors: string[]
): string => {
  // Determine risk label from safety score (guaranteed to match riskLevel now)
  let riskLabel: string;
  if (safetyScore >= 80) {
    riskLabel = 'LOW';
  } else if (safetyScore >= 50) {
    riskLabel = 'MEDIUM';
  } else {
    riskLabel = 'HIGH';
  }

  // Base text that matches the risk level with specific messaging
  const baseText = riskLevel === 'LOW'
    ? 'This destination is considered very safe for travel.'
    : riskLevel === 'MEDIUM'
      ? 'Elevated risks detected. Exercise normal precautions when traveling to this destination.'
      : 'Significant risks present. Exercise increased caution and stay informed about local conditions.';

  const stabilityText = `Political situation: ${politicalStability}.`;
  
  const seasonalText = seasonalFactors.length > 0
    ? ` Seasonal considerations: ${seasonalFactors.join(', ')}.`
    : '';

  const safetyText = ` Safety score: ${safetyScore}/100 (${riskLabel} risk).`;

  return `${baseText} ${stabilityText}${seasonalText}${safetyText}`;
};
