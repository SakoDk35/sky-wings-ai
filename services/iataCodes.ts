// City name to IATA airport code mapping
// Maps common city names to their primary airport IATA codes

const cityToIATA: Record<string, string> = {
  // Middle East
  'doha': 'DOH',
  'dubai': 'DXB',
  'abu dhabi': 'AUH',
  'riyadh': 'RUH',
  'jeddah': 'JED',
  'kuwait': 'KWI',
  'muscat': 'MCT',
  'bahrain': 'BAH',
  'dammam': 'DMM',
  'sharjah': 'SHJ',
  'tehran': 'IKA',
  'amman': 'AMM',
  'beirut': 'BEY',
  'baghdad': 'BGW',

  // Europe
  'london': 'LHR',
  'paris': 'CDG',
  'amsterdam': 'AMS',
  'frankfurt': 'FRA',
  'munich': 'MUC',
  'berlin': 'BER',
  'rome': 'FCO',
  'milan': 'MXP',
  'madrid': 'MAD',
  'barcelona': 'BCN',
  'istanbul': 'IST',
  'vienna': 'VIE',
  'zurich': 'ZRH',
  'geneva': 'GVA',
  'brussels': 'BRU',
  'copenhagen': 'CPH',
  'stockholm': 'ARN',
  'oslo': 'OSL',
  'helsinki': 'HEL',
  'warsaw': 'WAW',
  'prague': 'PRG',
  'budapest': 'BUD',
  'athens': 'ATH',
  'lisbon': 'LIS',
  'dublin': 'DUB',
  'edinburgh': 'EDI',
  'manchester': 'MAN',
  'moscow': 'SVO',
  'st petersburg': 'LED',
  'kiev': 'KBP',
  'bucharest': 'OTP',
  'sofia': 'SOF',
  'zagreb': 'ZAG',
  'belgrade': 'BEG',

  // North America
  'new york': 'JFK',
  'los angeles': 'LAX',
  'chicago': 'ORD',
  'san francisco': 'SFO',
  'miami': 'MIA',
  'boston': 'BOS',
  'washington': 'IAD',
  'seattle': 'SEA',
  'las vegas': 'LAS',
  'orlando': 'MCO',
  'denver': 'DEN',
  'atlanta': 'ATL',
  'dallas': 'DFW',
  'houston': 'IAH',
  'phoenix': 'PHX',
  'philadelphia': 'PHL',
  'toronto': 'YYZ',
  'vancouver': 'YVR',
  'montreal': 'YUL',
  'mexico city': 'MEX',
  'cancun': 'CUN',

  // Asia
  'tokyo': 'NRT',
  'osaka': 'KIX',
  'seoul': 'ICN',
  'beijing': 'PEK',
  'shanghai': 'PVG',
  'hong kong': 'HKG',
  'singapore': 'SIN',
  'bangkok': 'BKK',
  'kuala lumpur': 'KUL',
  'jakarta': 'CGK',
  'manila': 'MNL',
  'taipei': 'TPE',
  'ho chi minh': 'SGN',
  'hanoi': 'HAN',
  'mumbai': 'BOM',
  'delhi': 'DEL',
  'bangalore': 'BLR',
  'chennai': 'MAA',
  'hyderabad': 'HYD',
  'kolkata': 'CCU',
  'karachi': 'KHI',
  'lahore': 'LHE',
  'dhaka': 'DAC',
  'colombo': 'CMB',
  'kathmandu': 'KTM',

  // Australia & Oceania
  'sydney': 'SYD',
  'melbourne': 'MEL',
  'brisbane': 'BNE',
  'perth': 'PER',
  'auckland': 'AKL',
  'wellington': 'WLG',
  'christchurch': 'CHC',

  // Africa
  'cairo': 'CAI',
  'johannesburg': 'JNB',
  'cape town': 'CPT',
  'nairobi': 'NBO',
  'casablanca': 'CMN',
  'lagos': 'LOS',
  'addis ababa': 'ADD',
  'tunis': 'TUN',
  'algiers': 'ALG',
  'accra': 'ACC',
  'dar es salaam': 'DAR',
  'mauritius': 'MRU',

  // South America
  'sao paulo': 'GRU',
  'rio de janeiro': 'GIG',
  'buenos aires': 'EZE',
  'santiago': 'SCL',
  'lima': 'LIM',
  'bogota': 'BOG',
  'quito': 'UIO',
  'caracas': 'CCS',

  // Additional common destinations
  'maldives': 'MLE',
  'phuket': 'HKT',
  'bali': 'DPS',
  'goa': 'GOI',
  'male': 'MLE',
  'zeytinburnu': 'IST',
  'sabiha gokcen': 'SAW',
  'gatwick': 'LGW',
  'stansted': 'STN',
  'heathrow': 'LHR',
  'newark': 'EWR',
  'la guardia': 'LGA',
  'john f kennedy': 'JFK',
  'jfk': 'JFK',
  'lax': 'LAX',
};

// Reverse mapping for display purposes
const iataToCity: Record<string, string> = {
  'DOH': 'Doha',
  'DXB': 'Dubai',
  'AUH': 'Abu Dhabi',
  'RUH': 'Riyadh',
  'JED': 'Jeddah',
  'KWI': 'Kuwait',
  'MCT': 'Muscat',
  'BAH': 'Bahrain',
  'DMM': 'Dammam',
  'SHJ': 'Sharjah',
  'LHR': 'London',
  'CDG': 'Paris',
  'AMS': 'Amsterdam',
  'FRA': 'Frankfurt',
  'MUC': 'Munich',
  'BER': 'Berlin',
  'FCO': 'Rome',
  'MXP': 'Milan',
  'MAD': 'Madrid',
  'BCN': 'Barcelona',
  'IST': 'Istanbul',
  'JFK': 'New York',
  'LAX': 'Los Angeles',
  'ORD': 'Chicago',
  'SFO': 'San Francisco',
  'MIA': 'Miami',
  'BOS': 'Boston',
  'NRT': 'Tokyo',
  'HKG': 'Hong Kong',
  'SIN': 'Singapore',
  'BKK': 'Bangkok',
  'SYD': 'Sydney',
  'MEL': 'Melbourne',
  'CAI': 'Cairo',
  'JNB': 'Johannesburg',
  'CPT': 'Cape Town',
  'DEL': 'Delhi',
  'BOM': 'Mumbai',
};

/**
 * Convert a city name to IATA airport code
 * Returns the IATA code if found, otherwise returns the original input (assumed to already be an IATA code)
 */
export const getIATACode = (cityName: string): string => {
  if (!cityName) return '';

  // Check if already an IATA code (3 uppercase letters)
  const upperInput = cityName.toUpperCase().trim();
  if (/^[A-Z]{3}$/.test(upperInput)) {
    return upperInput;
  }

  // Look up in mapping
  const normalized = cityName.toLowerCase().trim();
  return cityToIATA[normalized] || upperInput;
};

/**
 * Get city name from IATA code
 * Returns the city name if found, otherwise returns the IATA code
 */
export const getCityName = (iataCode: string): string => {
  if (!iataCode) return '';
  return iataToCity[iataCode.toUpperCase()] || iataCode.toUpperCase();
};

/**
 * Check if a string is a valid IATA code
 */
export const isValidIATACode = (code: string): boolean => {
  return /^[A-Z]{3}$/.test(code.toUpperCase());
};
