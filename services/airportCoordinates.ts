/**
 * Airport Coordinates Database
 * Common airport IATA codes with their latitude/longitude coordinates
 */

export interface AirportCoordinates {
  iata: string;
  city: string;
  lat: number;
  lng: number;
}

export const airportCoordinates: Record<string, AirportCoordinates> = {
  // Europe
  'CDG': { iata: 'CDG', city: 'Paris', lat: 49.0097, lng: 2.5479 },
  'ORY': { iata: 'ORY', city: 'Paris', lat: 48.7233, lng: 2.3794 },
  'LHR': { iata: 'LHR', city: 'London', lat: 51.4700, lng: -0.4543 },
  'LGW': { iata: 'LGW', city: 'London', lat: 51.1537, lng: -0.1821 },
  'BCN': { iata: 'BCN', city: 'Barcelona', lat: 41.2974, lng: 2.0833 },
  'MAD': { iata: 'MAD', city: 'Madrid', lat: 40.4936, lng: -3.5668 },
  'FCO': { iata: 'FCO', city: 'Rome', lat: 41.8003, lng: 12.2389 },
  'MXP': { iata: 'MXP', city: 'Milan', lat: 45.6306, lng: 8.7281 },
  'AMS': { iata: 'AMS', city: 'Amsterdam', lat: 52.3086, lng: 4.7639 },
  'FRA': { iata: 'FRA', city: 'Frankfurt', lat: 50.0379, lng: 8.5622 },
  'MUC': { iata: 'MUC', city: 'Munich', lat: 48.3538, lng: 11.7861 },
  'ZRH': { iata: 'ZRH', city: 'Zurich', lat: 47.4647, lng: 8.5492 },
  'VIE': { iata: 'VIE', city: 'Vienna', lat: 48.1103, lng: 16.5697 },
  'BRU': { iata: 'BRU', city: 'Brussels', lat: 50.9014, lng: 4.4844 },
  'LIS': { iata: 'LIS', city: 'Lisbon', lat: 38.7813, lng: -9.1359 },
  'DUB': { iata: 'DUB', city: 'Dublin', lat: 53.4213, lng: -6.2701 },
  'CPH': { iata: 'CPH', city: 'Copenhagen', lat: 55.6180, lng: 12.6560 },
  'ARN': { iata: 'ARN', city: 'Stockholm', lat: 59.6519, lng: 17.9186 },
  'OSL': { iata: 'OSL', city: 'Oslo', lat: 60.1939, lng: 11.1004 },
  'HEL': { iata: 'HEL', city: 'Helsinki', lat: 60.3172, lng: 24.9633 },
  
  // Middle East
  'DXB': { iata: 'DXB', city: 'Dubai', lat: 25.2532, lng: 55.3657 },
  'AUH': { iata: 'AUH', city: 'Abu Dhabi', lat: 24.4330, lng: 54.6511 },
  'DOH': { iata: 'DOH', city: 'Doha', lat: 25.2731, lng: 51.6080 },
  'IST': { iata: 'IST', city: 'Istanbul', lat: 41.2753, lng: 28.7519 },
  'SAW': { iata: 'SAW', city: 'Istanbul', lat: 40.8986, lng: 29.3092 },
  'BEY': { iata: 'BEY', city: 'Beirut', lat: 33.8209, lng: 35.4884 },
  
  // North America
  'JFK': { iata: 'JFK', city: 'New York', lat: 40.6413, lng: -73.7781 },
  'LGA': { iata: 'LGA', city: 'New York', lat: 40.7769, lng: -73.8740 },
  'LAX': { iata: 'LAX', city: 'Los Angeles', lat: 33.9425, lng: -118.4081 },
  'SFO': { iata: 'SFO', city: 'San Francisco', lat: 37.6213, lng: -122.3790 },
  'ORD': { iata: 'ORD', city: 'Chicago', lat: 41.9742, lng: -87.9073 },
  'MIA': { iata: 'MIA', city: 'Miami', lat: 25.7959, lng: -80.2870 },
  'YYZ': { iata: 'YYZ', city: 'Toronto', lat: 43.6777, lng: -79.6248 },
  'YVR': { iata: 'YVR', city: 'Vancouver', lat: 49.1947, lng: -123.1815 },
  
  // Asia
  'NRT': { iata: 'NRT', city: 'Tokyo', lat: 35.7720, lng: 140.3929 },
  'HND': { iata: 'HND', city: 'Tokyo', lat: 35.5494, lng: 139.7798 },
  'ICN': { iata: 'ICN', city: 'Seoul', lat: 37.4602, lng: 126.4407 },
  'PVG': { iata: 'PVG', city: 'Shanghai', lat: 31.1443, lng: 121.8083 },
  'PEK': { iata: 'PEK', city: 'Beijing', lat: 40.0799, lng: 116.6031 },
  'SIN': { iata: 'SIN', city: 'Singapore', lat: 1.3644, lng: 103.9915 },
  'BKK': { iata: 'BKK', city: 'Bangkok', lat: 13.6900, lng: 100.7501 },
  'KUL': { iata: 'KUL', city: 'Kuala Lumpur', lat: 2.7456, lng: 101.7072 },
  'DEL': { iata: 'DEL', city: 'Delhi', lat: 28.5562, lng: 77.1000 },
  'BOM': { iata: 'BOM', city: 'Mumbai', lat: 19.0896, lng: 72.8656 },
  
  // Africa
  'CAI': { iata: 'CAI', city: 'Cairo', lat: 30.1219, lng: 31.4056 },
  'JNB': { iata: 'JNB', city: 'Johannesburg', lat: -26.1392, lng: 28.2460 },
  'CPT': { iata: 'CPT', city: 'Cape Town', lat: -33.9648, lng: 18.6017 },
  
  // Oceania
  'SYD': { iata: 'SYD', city: 'Sydney', lat: -33.9399, lng: 151.1753 },
  'MEL': { iata: 'MEL', city: 'Melbourne', lat: -37.6690, lng: 144.8410 },
};

/**
 * Get coordinates for an IATA code
 * Returns mock coordinates based on IATA if not in database
 */
export const getAirportCoordinates = (iataCode: string): { lat: number; lng: number } => {
  const upperCode = iataCode.toUpperCase();
  
  if (airportCoordinates[upperCode]) {
    return {
      lat: airportCoordinates[upperCode].lat,
      lng: airportCoordinates[upperCode].lng
    };
  }
  
  // Generate mock coordinates based on IATA code hash
  // This creates consistent but approximate locations
  const hash = upperCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Rough regional approximation based on common IATA patterns
  const lat = ((hash % 180) - 90) * 0.8; // Between -72 and 72
  const lng = ((hash % 360) - 180) * 0.7; // Between -126 and 126
  
  return { lat, lng };
};

/**
 * Calculate the midpoint between two coordinates
 */
export const getMidpoint = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): { lat: number; lng: number } => {
  return {
    lat: (lat1 + lat2) / 2,
    lng: (lng1 + lng2) / 2
  };
};
