// City name to IATA airport code mapping
// Maps common city names to their primary airport IATA codes

const cityToIATA: Record<string, string> = {
  'yerevan': 'EVN',
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

export interface AirportOption {
  city: string;
  name: string;
  iata: string;
  aliases?: string[];
}

export const AIRPORTS: AirportOption[] = [
  { city: 'Yerevan', name: 'Zvartnots International', iata: 'EVN' },
  { city: 'Dubai', name: 'Dubai International', iata: 'DXB' },
  { city: 'Abu Dhabi', name: 'Zayed International', iata: 'AUH' },
  { city: 'Doha', name: 'Hamad International', iata: 'DOH' },
  { city: 'Istanbul', name: 'Istanbul Airport', iata: 'IST' },
  { city: 'Istanbul', name: 'Sabiha Gökçen International', iata: 'SAW', aliases: ['sabiha gokcen'] },
  { city: 'London', name: 'Heathrow', iata: 'LHR', aliases: ['heathrow'] },
  { city: 'London', name: 'Gatwick', iata: 'LGW', aliases: ['gatwick'] },
  { city: 'London', name: 'Stansted', iata: 'STN', aliases: ['stansted'] },
  { city: 'Paris', name: 'Charles de Gaulle', iata: 'CDG' },
  { city: 'Amsterdam', name: 'Schiphol', iata: 'AMS' },
  { city: 'Frankfurt', name: 'Frankfurt Airport', iata: 'FRA' },
  { city: 'Munich', name: 'Munich Airport', iata: 'MUC' },
  { city: 'Berlin', name: 'Berlin Brandenburg', iata: 'BER' },
  { city: 'Rome', name: 'Fiumicino', iata: 'FCO' },
  { city: 'Milan', name: 'Malpensa', iata: 'MXP' },
  { city: 'Madrid', name: 'Adolfo Suárez Madrid–Barajas', iata: 'MAD' },
  { city: 'Barcelona', name: 'Josep Tarradellas Barcelona–El Prat', iata: 'BCN' },
  { city: 'Vienna', name: 'Vienna International', iata: 'VIE' },
  { city: 'Zurich', name: 'Zurich Airport', iata: 'ZRH' },
  { city: 'Geneva', name: 'Geneva Airport', iata: 'GVA' },
  { city: 'Brussels', name: 'Brussels Airport', iata: 'BRU' },
  { city: 'Copenhagen', name: 'Copenhagen Airport', iata: 'CPH' },
  { city: 'Stockholm', name: 'Stockholm Arlanda', iata: 'ARN' },
  { city: 'Oslo', name: 'Oslo Gardermoen', iata: 'OSL' },
  { city: 'Helsinki', name: 'Helsinki Airport', iata: 'HEL' },
  { city: 'Warsaw', name: 'Warsaw Chopin', iata: 'WAW' },
  { city: 'Prague', name: 'Václav Havel Airport Prague', iata: 'PRG' },
  { city: 'Budapest', name: 'Ferenc Liszt International', iata: 'BUD' },
  { city: 'Athens', name: 'Athens International', iata: 'ATH' },
  { city: 'Lisbon', name: 'Humberto Delgado', iata: 'LIS' },
  { city: 'Dublin', name: 'Dublin Airport', iata: 'DUB' },
  { city: 'Edinburgh', name: 'Edinburgh Airport', iata: 'EDI' },
  { city: 'Manchester', name: 'Manchester Airport', iata: 'MAN' },
  { city: 'Belgrade', name: 'Belgrade Nikola Tesla', iata: 'BEG' },
  { city: 'Bucharest', name: 'Henri Coandă International', iata: 'OTP' },
  { city: 'Sofia', name: 'Sofia Airport', iata: 'SOF' },
  { city: 'New York', name: 'John F. Kennedy International', iata: 'JFK', aliases: ['john f kennedy'] },
  { city: 'New York', name: 'Newark Liberty International', iata: 'EWR', aliases: ['newark'] },
  { city: 'New York', name: 'LaGuardia', iata: 'LGA', aliases: ['la guardia'] },
  { city: 'Los Angeles', name: 'Los Angeles International', iata: 'LAX' },
  { city: 'Chicago', name: "O'Hare International", iata: 'ORD' },
  { city: 'San Francisco', name: 'San Francisco International', iata: 'SFO' },
  { city: 'Miami', name: 'Miami International', iata: 'MIA' },
  { city: 'Boston', name: 'Logan International', iata: 'BOS' },
  { city: 'Washington', name: 'Dulles International', iata: 'IAD' },
  { city: 'Seattle', name: 'Seattle–Tacoma International', iata: 'SEA' },
  { city: 'Las Vegas', name: 'Harry Reid International', iata: 'LAS' },
  { city: 'Orlando', name: 'Orlando International', iata: 'MCO' },
  { city: 'Atlanta', name: 'Hartsfield–Jackson Atlanta International', iata: 'ATL' },
  { city: 'Dallas', name: 'Dallas Fort Worth International', iata: 'DFW' },
  { city: 'Toronto', name: 'Toronto Pearson International', iata: 'YYZ' },
  { city: 'Vancouver', name: 'Vancouver International', iata: 'YVR' },
  { city: 'Montreal', name: 'Montréal–Trudeau International', iata: 'YUL' },
  { city: 'Tokyo', name: 'Narita International', iata: 'NRT' },
  { city: 'Osaka', name: 'Kansai International', iata: 'KIX' },
  { city: 'Seoul', name: 'Incheon International', iata: 'ICN' },
  { city: 'Beijing', name: 'Beijing Capital International', iata: 'PEK' },
  { city: 'Shanghai', name: 'Shanghai Pudong International', iata: 'PVG' },
  { city: 'Hong Kong', name: 'Hong Kong International', iata: 'HKG' },
  { city: 'Singapore', name: 'Singapore Changi', iata: 'SIN' },
  { city: 'Bangkok', name: 'Suvarnabhumi', iata: 'BKK' },
  { city: 'Kuala Lumpur', name: 'Kuala Lumpur International', iata: 'KUL' },
  { city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj International', iata: 'BOM' },
  { city: 'Delhi', name: 'Indira Gandhi International', iata: 'DEL' },
  { city: 'Sydney', name: 'Sydney Kingsford Smith', iata: 'SYD' },
  { city: 'Melbourne', name: 'Melbourne Airport', iata: 'MEL' },
  { city: 'Auckland', name: 'Auckland Airport', iata: 'AKL' },
  { city: 'Cairo', name: 'Cairo International', iata: 'CAI' },
  { city: 'Johannesburg', name: 'O. R. Tambo International', iata: 'JNB' },
  { city: 'Cape Town', name: 'Cape Town International', iata: 'CPT' },
  { city: 'Nairobi', name: 'Jomo Kenyatta International', iata: 'NBO' },
  { city: 'São Paulo', name: 'São Paulo/Guarulhos International', iata: 'GRU', aliases: ['sao paulo'] },
  { city: 'Buenos Aires', name: 'Ministro Pistarini International', iata: 'EZE' },
];

const normalizeAirportSearch = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const searchAirports = (query: string, limit = 7): AirportOption[] => {
  const normalized = normalizeAirportSearch(query);
  if (!normalized) return [];

  return AIRPORTS
    .map((airport) => {
      const city = normalizeAirportSearch(airport.city);
      const name = normalizeAirportSearch(airport.name);
      const iata = airport.iata.toLowerCase();
      const aliases = (airport.aliases || []).map(normalizeAirportSearch);
      const matches = city.includes(normalized) || name.includes(normalized) ||
        iata.includes(normalized) || aliases.some((alias) => alias.includes(normalized));
      if (!matches) return null;

      const score = iata === normalized
        ? 0
        : city === normalized
          ? 1
          : city.startsWith(normalized)
            ? 2
            : name.startsWith(normalized)
              ? 3
              : 4;
      return { airport, score };
    })
    .filter((entry): entry is { airport: AirportOption; score: number } => entry !== null)
    .sort((a, b) => a.score - b.score || a.airport.city.localeCompare(b.airport.city))
    .slice(0, limit)
    .map((entry) => entry.airport);
};

// Reverse mapping for display purposes
const iataToCity: Record<string, string> = {
  'EVN': 'Yerevan',
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
