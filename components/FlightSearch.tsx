
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Calendar, MapPin, TrendingUp, Loader2, Users, Briefcase, Sparkles, SlidersHorizontal, Check, X, Filter, CheckCircle, ChevronDown, ChevronUp, Luggage, Utensils, Wifi, Zap, Clock, Lock, Plane } from 'lucide-react';
import { Flight, MLPredictionState } from '../types';
import { findRealFlights } from '../services/geminiService';
import { getMLPricePrediction } from '../services/mlPredictionService';
import { analyzeBookingTiming } from '../services/bookingTimingService';
import { analyzeDisplayedFlightPrices } from '../services/priceIntelligenceEngine';
import { getAirportCoordinates, getMidpoint } from '../services/airportCoordinates';
import { AirportOption, getCityName, searchAirports } from '../services/iataCodes';
import FlightPathMap from './FlightPathTimeline';

interface FlightSearchProps {
  isLoggedIn: boolean;
  onAuthRequest: () => void;
  onBookingComplete: (flight: Flight) => Promise<void>;
  language?: 'en' | 'ar';
}

interface AirportAutocompleteProps {
  name: 'origin' | 'destination';
  placeholder: string;
}

const AirportAutocomplete: React.FC<AirportAutocompleteProps> = ({ name, placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedAirport, setSelectedAirport] = useState<AirportOption | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(inputValue), 200);
    return () => window.clearTimeout(timer);
  }, [inputValue]);

  const suggestions = useMemo(
    () => selectedAirport ? [] : searchAirports(debouncedQuery),
    [debouncedQuery, selectedAirport]
  );

  useEffect(() => {
    setActiveIndex(suggestions.length > 0 ? 0 : -1);
  }, [suggestions]);

  const selectAirport = (airport: AirportOption) => {
    setSelectedAirport(airport);
    setInputValue(`${airport.city} — ${airport.name} (${airport.iata})`);
    setDebouncedQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (event.key === 'ArrowDown' && inputValue.trim()) setIsOpen(true);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectAirport(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center pointer-events-none z-10">
        <MapPin className="text-slate-400 group-focus-within:text-brand-500" size={18} />
      </div>
      <input type="hidden" name={name} value={selectedAirport?.iata || ''} />
      <input
        type="text"
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
          setSelectedAirport(null);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-controls={`${name}-airport-options`}
        aria-activedescendant={activeIndex >= 0 ? `${name}-airport-${activeIndex}` : undefined}
        required
        className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400"
      />
      {isOpen && debouncedQuery.trim() && !selectedAirport && (
        <div
          id={`${name}-airport-options`}
          role="listbox"
          className="absolute z-20 mt-2 w-full min-w-0 sm:min-w-[290px] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
        >
          {suggestions.length > 0 ? suggestions.map((airport, index) => (
            <button
              id={`${name}-airport-${index}`}
              key={airport.iata}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onPointerDown={(event) => {
                event.preventDefault();
                selectAirport(airport);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`w-full px-4 py-3 text-left rtl:text-right border-b last:border-b-0 border-slate-100 dark:border-slate-800 ${index === activeIndex ? 'bg-brand-50 dark:bg-brand-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <div className="text-sm font-semibold text-slate-800 dark:text-white">
                {airport.city} — {airport.name}
              </div>
              <div className="text-xs font-bold text-brand-600 dark:text-brand-400 mt-0.5">{airport.iata}</div>
            </button>
          )) : (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              No matching airport. Select an airport from the supported list.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  const localTime = timeStr.match(/[T\s](\d{2}):(\d{2})/);
  if (localTime) {
    const hour = Number(localTime[1]);
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${localTime[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
  }
  return timeStr;
};

const formatMoney = (amount: number, currency = 'USD') => {
  if (!Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
};

const formatFlightPrice = (flight?: Flight | null) =>
  flight ? formatMoney(Number(flight.price), flight.currency || 'USD') : '—';

// Extract IATA carrier code from airline string
// Providers return formats like: "Air France (AF)", "TK", "Turkish Airlines", etc.
const extractCarrierCode = (airline: string): string | null => {
  // Try to extract code from parentheses first (e.g., "Air France (AF)")
  const parenMatch = airline.match(/\(([A-Z]{2})\)/);
  if (parenMatch) return parenMatch[1];

  // If airline string is just 2 uppercase letters, use it directly
  if (/^[A-Z]{2}$/.test(airline.trim())) return airline.trim();

  return null;
};

// Get airline logo URL using Aviasales CDN (CORS-friendly) with CSS fallback
const getAirlineLogo = (airline: string, carrierCode?: string) => {
  // Priority 1: Use provided carrier code directly with Aviasales CDN
  if (carrierCode) {
    return `https://pics.avs.io/al_square/64/${carrierCode.toUpperCase()}.png`;
  }

  // Priority 2: Try to extract IATA code from airline string
  const extractedCode = extractCarrierCode(airline);
  if (extractedCode) {
    return `https://pics.avs.io/al_square/64/${extractedCode.toUpperCase()}.png`;
  }

  // Priority 3: Manual mapping for airlines without proper code format
  // This handles cases like "Emirates EK" or just "Emirates"
  const airlineCodeMap: Record<string, string> = {
    'emirates': 'EK',
    'qatar': 'QR',
    'british airways': 'BA',
    'lufthansa': 'LH',
    'air france': 'AF',
    'turkish': 'TK',
    'swiss': 'LX',
    'etihad': 'EY',
    'wizz': 'W6',
    'ryanair': 'FR',
    'easyjet': 'U2',
    'transavia': 'HV',
    'middle east': 'ME',
    'delta': 'DL',
    'american': 'AA',
    'united': 'UA',
    'singapore': 'SQ',
    'cathay': 'CX',
    'klm': 'KL',
    'ita': 'AZ',
    'virgin': 'VS',
    'alaska': 'AS',
    'jetblue': 'B6',
    'southwest': 'WN',
    'air canada': 'AC',
    'ana': 'NH',
    'jal': 'JL',
    'korean': 'KE',
    'china eastern': 'MU',
    'china southern': 'CZ',
    'air china': 'CA',
    'thaiairways': 'TG',
    'malaysia': 'MH',
    'garuda': 'GA',
    'philippine': 'PR',
    'vietnam': 'VN',
    'el al': 'LY',
    'saudia': 'SV',
    'gulf': 'GF',
    'royal jordanian': 'RJ',
  };

  const lowerAirline = airline.toLowerCase();
  for (const [name, code] of Object.entries(airlineCodeMap)) {
    if (lowerAirline.includes(name)) {
      return `https://pics.avs.io/al_square/64/${code.toUpperCase()}.png`;
    }
  }

  // Priority 4: Return null to trigger CSS fallback
  return null;
};

const getFallbackLogo = (airline: string) => {
  // Generate initials-based avatar using DiceBear API (CORS-friendly, SVG format)
  const initials = airline
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(initials)}&backgroundColor=0ea5e9&textColor=ffffff&fontSize=36&bold=true`;
};

// Reusable Airline Logo Component that handles fallback logic
export const AirlineLogo: React.FC<{ airline: string, carrierCode?: string, className?: string }> = ({ airline, carrierCode, className }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(getAirlineLogo(airline, carrierCode));
  const [useCssFallback, setUseCssFallback] = useState(false);

  // Reset state when airline or carrierCode changes (important for list rendering)
  useEffect(() => {
    const logoUrl = getAirlineLogo(airline, carrierCode);
    setImgSrc(logoUrl);
    setUseCssFallback(!logoUrl); // Use CSS fallback if no logo URL
  }, [airline, carrierCode]);

  const handleError = () => {
    // Switch to CSS fallback on image error
    setImgSrc(null);
    setUseCssFallback(true);
  };

  // CSS-only fallback - no external requests
  if (useCssFallback) {
    const initial = airline.charAt(0).toUpperCase();
    return (
      <div
        className={`${className} bg-gradient-to-br from-sky-500 to-blue-600 dark:from-sky-600 dark:to-blue-700 flex items-center justify-center text-white font-bold rounded-full`}
        style={{ minWidth: '24px' }}
      >
        <span className="text-sm">{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc || ''}
      alt={airline}
      className={`${className} object-contain`}
      onError={handleError}
      loading="lazy"
      crossOrigin="anonymous"
    />
  );
};

// Helper for parsing duration "4h 50m" -> minutes
const parseDurationToMinutes = (str: string) => {
  let minutes = 0;
  if (!str) return 0;
  const hoursMatch = str.match(/(\d+)h/);
  const minsMatch = str.match(/(\d+)m/);
  if (hoursMatch) minutes += parseInt(hoursMatch[1]) * 60;
  if (minsMatch) minutes += parseInt(minsMatch[1]);
  return minutes || 0;
};

const parseValidDurationToMinutes = (duration: string): number | null => {
  if (typeof duration !== 'string') return null;
  const match = duration.trim().match(/^(?:(\d+)h)?(?:\s*(\d+)m)?$/i);
  if (!match || (!match[1] && !match[2])) return null;
  const minutes = Number(match[1] || 0) * 60 + Number(match[2] || 0);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
};

const formatMinuteDifference = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

interface FlightHighlights {
  price: string | null;
  duration: string | null;
  stops: string;
  badges: string[];
}

const getFlightHighlights = (flight: Flight, displayedFlights: Flight[]): FlightHighlights => {
  const canCompare = displayedFlights.length > 1;
  const currentPrice = Number(flight.price);
  const validPrices = displayedFlights
    .map(item => Number(item.price))
    .filter(price => Number.isFinite(price) && price > 0);
  const currentDuration = parseValidDurationToMinutes(flight.duration);
  const validDurations = displayedFlights
    .map(item => parseValidDurationToMinutes(item.duration))
    .filter((duration): duration is number => duration !== null);

  let price: string | null = null;
  let isCheapest = false;
  if (canCompare) {
    if (Number.isFinite(currentPrice) && currentPrice > 0 && validPrices.length >= 2) {
      const cheapestPrice = Math.min(...validPrices);
      isCheapest = Math.abs(currentPrice - cheapestPrice) < 0.005;
      price = isCheapest
        ? 'Cheapest option'
        : `${formatMoney(currentPrice - cheapestPrice, flight.currency || 'USD')} more than cheapest shown`;
    } else {
      price = 'Price comparison unavailable';
    }
  }

  let duration: string | null = null;
  let isFastest = false;
  if (canCompare) {
    if (currentDuration !== null && validDurations.length >= 2) {
      const fastestDuration = Math.min(...validDurations);
      isFastest = currentDuration === fastestDuration;
      duration = isFastest
        ? 'Fastest option'
        : `${formatMinuteDifference(currentDuration - fastestDuration)} slower than fastest shown`;
    } else {
      duration = 'Duration comparison unavailable';
    }
  }

  const validStops = Number.isInteger(flight.stops) && flight.stops >= 0;
  const stops = !validStops
    ? 'Stop information unavailable'
    : flight.stops === 0
      ? 'Direct flight'
      : `${flight.stops} ${flight.stops === 1 ? 'stop' : 'stops'}`;
  const badges = [
    ...(isCheapest ? ['Cheapest'] : []),
    ...(isFastest ? ['Fastest'] : []),
    ...(validStops && flight.stops === 0 ? ['Non-stop'] : []),
  ];

  return { price, duration, stops, badges };
};

export const FlightSearch: React.FC<FlightSearchProps> = ({ isLoggedIn, onAuthRequest, onBookingComplete, language = 'en' }) => {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Flight[]>([]);
  const [mlPredictionStates, setMlPredictionStates] = useState<Record<string, MLPredictionState>>({});
  const mlRequests = useRef(new Map<string, Promise<MLPredictionState>>());
  const searchGeneration = useRef(0);

  useEffect(() => () => { searchGeneration.current += 1; }, []);
  const [bookingTimings, setBookingTimings] = useState<Record<string, { optimalWindow: string; currentDaysBefore: number; recommendation: string; urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' }>>({});

  // Toggle States for Expandable Sections
  const [expandedAmenities, setExpandedAmenities] = useState<Record<string, boolean>>({});
  const [expandedML, setExpandedML] = useState<Record<string, boolean>>({});
  const [expandedPath, setExpandedPath] = useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({}); // Unified flight details

  // Sorting and Filtering State
  const [sortBy, setSortBy] = useState<string>('price_asc');
  const [filterStops, setFilterStops] = useState<number[]>([]); // empty = all
  const [filterAirlines, setFilterAirlines] = useState<string[]>([]); // empty = all
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Booking Modal State
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'processing' | 'confirmed' | 'error'>('idle');
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Expanded Details State
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Search error state
  const [searchError, setSearchError] = useState<string | null>(null);

  // Flight Comparison State
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    searchGeneration.current += 1;
    setSearching(true);
    setResults([]);
    setMlPredictionStates({});
    setBookingTimings({});
    setExpandedId(null);
    setSearchError(null);

    const formData = new FormData(e.currentTarget);
    const origin = formData.get('origin') as string;
    const destination = formData.get('destination') as string;
    const date = formData.get('date') as string;
    const passengers = formData.get('passengers') as string;
    const travelClass = formData.get('class') as string;

    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
      setSearchError(t(
        'Select both airports from the autocomplete suggestions.',
        'اختر مطاري المغادرة والوصول من اقتراحات البحث.'
      ));
      setSearching(false);
      return;
    }

    try {
      const realFlights = await findRealFlights(origin, destination, date, undefined, passengers, travelClass);

      if (realFlights && realFlights.length > 0) {
        setResults(realFlights);
        // Preserve the existing automatic booking-timing calculation. Price
        // Analysis is derived synchronously from the displayed result set.
        setTimeout(() => {
          realFlights.forEach(flight => {
            const bookingTiming = analyzeBookingTiming(flight);
            setBookingTimings(prev => ({ ...prev, [flight.id]: bookingTiming }));
          });
        }, 500);
      } else {
        setSearchError('No verified live flight offers were returned for this search.');
      }
    } catch (error: any) {
      console.error("Search failed", error);
      setSearchError(error?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const requestMLPrediction = async (flight: Flight) => {
    // Cache both pending and completed requests by inputs, not reusable offer IDs.
    const key = JSON.stringify([flight.origin, flight.destination, flight.airline,
      flight.departureTime, flight.price, flight.currency, flight.duration, flight.stops]);
    const generation = searchGeneration.current;
    setMlPredictionStates(prev => ({ ...prev, [flight.id]: { status: 'loading' } }));
    let pending = mlRequests.current.get(key);
    if (!pending) {
      pending = getMLPricePrediction(flight).catch((): MLPredictionState => ({
        status: 'unavailable', message: 'The experimental ML service is temporarily unavailable.'
      }));
      mlRequests.current.set(key, pending);
    }
    const state = await pending;
    // A previous search must not populate a new offer with the same ID.
    if (generation === searchGeneration.current) {
      setMlPredictionStates(prev => ({ ...prev, [flight.id]: state }));
    }
  };

  const handleBook = (flight: Flight) => {
    if (!isLoggedIn) {
      onAuthRequest();
      return;
    }
    setSelectedFlight(flight);
    setBookingStatus('idle');
    setBookingError(null);
  };

  const processBooking = async () => {
    if (!selectedFlight) return;
    setBookingStatus('processing');
    setBookingError(null);
    try {
      await onBookingComplete(selectedFlight);
      setBookingStatus('confirmed');
    } catch {
      setBookingStatus('error');
      setBookingError('The demo record could not be saved. No booking or payment was created. Please try again.');
    }
  };

  const closeBookingModal = () => {
    setSelectedFlight(null);
    setBookingStatus('idle');
    setBookingError(null);
  };

  const toggleDetails = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // Toggle Handlers for Expandable Sections
  const toggleAmenities = (id: string) => {
    setExpandedAmenities(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMLPrediction = (id: string) => {
    setExpandedML(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFlightPath = (id: string) => {
    setExpandedPath(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Unified Flight Details Toggle - Opens Both Amenities & Path
  const toggleFlightDetails = (id: string) => {
    setExpandedDetails(prev => ({ ...prev, [id]: !prev[id] }));
    // Also toggle both amenities and path when details is clicked
    setExpandedAmenities(prevPrev => ({ ...prevPrev, [id]: !prevPrev[id] }));
    setExpandedPath(prevPrev => ({ ...prevPrev, [id]: !prevPrev[id] }));
  };

  // Helper function to check if any detail section is expanded for a flight
  const isAnySectionExpanded = (flightId: string): boolean => {
    return !!(expandedDetails[flightId] || expandedML[flightId]);
  };

  // Flight Comparison Handlers
  const toggleCompare = (flightId: string) => {
    setCompareList(prev => {
      if (prev.includes(flightId)) {
        return prev.filter(id => id !== flightId);
      }
      if (prev.length >= 2) {
        return [prev[1], flightId]; // Remove oldest, add new
      }
      return [...prev, flightId];
    });
  };

  const clearComparison = () => {
    setCompareList([]);
    setShowComparisonModal(false);
  };

  // --- Derived State for Filtered/Sorted Results ---
  const availableAirlines = useMemo(() => {
    const airlines = new Set(results.map(f => f.airline));
    return Array.from(airlines).sort();
  }, [results]);

  const filteredAndSortedResults = useMemo(() => {
    let res = [...results];

    // Filter: Stops
    if (filterStops.length > 0) {
      res = res.filter(f => {
        if (filterStops.includes(2)) {
          return filterStops.includes(f.stops) || f.stops >= 2;
        }
        return filterStops.includes(f.stops);
      });
    }

    // Filter: Airlines
    if (filterAirlines.length > 0) {
      res = res.filter(f => filterAirlines.includes(f.airline));
    }

    // Sort
    res.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return Number(a.price) - Number(b.price);
        case 'price_desc':
          return Number(b.price) - Number(a.price);
        case 'duration':
          return parseDurationToMinutes(a.duration) - parseDurationToMinutes(b.duration);
        case 'departure':
          return (a.departureTime || '').localeCompare(b.departureTime || '');
        default: return 0;
      }
    });

    return res;
  }, [results, filterStops, filterAirlines, sortBy]);

  const priceAnalyses = useMemo(
    () => analyzeDisplayedFlightPrices(filteredAndSortedResults),
    [filteredAndSortedResults],
  );

  const toggleStopFilter = (stop: number) => {
    setFilterStops(prev =>
      prev.includes(stop) ? prev.filter(s => s !== stop) : [...prev, stop]
    );
  };

  const toggleAirlineFilter = (airline: string) => {
    setFilterAirlines(prev =>
      prev.includes(airline) ? prev.filter(a => a !== airline) : [...prev, airline]
    );
  };

  const clearFilters = () => {
    setFilterStops([]);
    setFilterAirlines([]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-20">
      {/* Search Form */}
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/90 rounded-2xl shadow-xl p-6 md:p-8 -mt-10 relative z-10 focus-within:z-30 border border-slate-100 dark:border-slate-800 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
          <Search className="text-brand-600 dark:text-brand-400" size={24} />
          {t('Find Your Perfect Flight', 'ابحث عن رحلتك المثالية')}
        </h2>
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          <AirportAutocomplete
            name="origin"
            placeholder={t('From city or airport', 'من مدينة أو مطار')}
          />

          <AirportAutocomplete
            name="destination"
            placeholder={t('To city or airport', 'إلى مدينة أو مطار')}
          />

          {/* Departure Date */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center pointer-events-none">
              <Calendar className="text-slate-400 group-focus-within:text-brand-500" size={18} />
            </div>
            <input
              name="date"
              type="text"
              onFocus={(e) => e.target.type = 'date'}
              onBlur={(e) => { if (!e.target.value) e.target.type = 'text' }}
              placeholder={t('Departure Date', 'تاريخ المغادرة')}
              className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400"
              required
            />
          </div>

          {/* Passengers */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center pointer-events-none">
              <Users className="text-slate-400 group-focus-within:text-brand-500" size={18} />
            </div>
            <select
              name="passengers"
              className="w-full pl-10 pr-8 rtl:pl-8 rtl:pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
              defaultValue="1"
            >
              <option value="1">{t('1 Passenger', 'مسافر واحد')}</option>
              <option value="2">{t('2 Passengers', 'مسافران')}</option>
              <option value="3">{t('3 Passengers', '3 مسافرين')}</option>
              <option value="4+">{t('4+ Passengers', '4+ مسافرين')}</option>
            </select>
            <div className="absolute inset-y-0 right-3 rtl:right-auto rtl:left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          {/* Class Selection */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center pointer-events-none">
              <Briefcase className="text-slate-400 group-focus-within:text-brand-500" size={18} />
            </div>
            <select
              name="class"
              className="w-full pl-10 pr-8 rtl:pl-8 rtl:pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
              defaultValue="economy"
            >
              <option value="economy">{t('Economy', 'الاقتصادية')}</option>
              <option value="business">{t('Business Class', 'درجة رجال الأعمال')}</option>
              <option value="first">{t('First Class', 'الدرجة الأولى')}</option>
            </select>
            <div className="absolute inset-y-0 right-3 rtl:right-auto rtl:left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          <button
            type="submit"
            disabled={searching}
            className="bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg hover:shadow-brand-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {searching ? <Loader2 className="animate-spin" size={20} /> : t('Search Flights', 'بحث عن الرحلات')}
          </button>
        </form>
      </div>

      {/* Validation Error Banner */}
      {searchError && (
        <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">{searchError}</p>
          </div>
          <button
            onClick={() => setSearchError(null)}
            className="flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Results & Filtering */}
      <div className="mt-12 space-y-6">

        {/* Filters & Sorting Toolbar */}
        <div className="relative z-20">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-200/60 dark:border-slate-800/60 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                disabled={results.length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isFilterOpen || filterStops.length > 0 || filterAirlines.length > 0
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 ring-1 ring-brand-200 dark:ring-brand-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
              >
                <Filter size={16} />
                {t('Filters', 'تصنيفات')}
                {(filterStops.length > 0 || filterAirlines.length > 0) && (
                  <span className="bg-brand-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                    {filterStops.length + filterAirlines.length}
                  </span>
                )}
              </button>

              {/* Quick Sort Tabs (Desktop) */}
              <div className="hidden md:flex items-center gap-2 border-l rtl:border-l-0 rtl:border-r border-slate-200 dark:border-slate-700 pl-4 rtl:pl-0 rtl:pr-4 ml-1 rtl:ml-0 rtl:mr-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 rtl:mr-0 rtl:ml-2">{t('Sort by', 'ترتيب حسب')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  disabled={results.length === 0}
                  className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-50"
                >
                  <option value="price_asc">{t('Price: Low to High', 'السعر: من الأقل إلى الأعلى')}</option>
                  <option value="price_desc">{t('Price: High to Low', 'السعر: من الأعلى إلى الأقل')}</option>
                  <option value="duration">{t('Duration: Shortest', 'المدة: الأقصر')}</option>
                  <option value="departure">{t('Departure: Earliest', 'المغادرة: الأقرب')}</option>
                </select>
              </div>
            </div>

            {/* Mobile Sort (Visible only on small screens) */}
            <div className="md:hidden">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                disabled={results.length === 0}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50 text-slate-700 dark:text-slate-200"
              >
                <option value="price_asc">{t('Price: Low to High', 'السعر: من الأقل إلى الأعلى')}</option>
                <option value="price_desc">{t('Price: High to Low', 'السعر: من الأعلى إلى الأقل')}</option>
                <option value="duration">{t('Duration: Shortest', 'المدة: الأقصر')}</option>
                <option value="departure">{t('Departure: Earliest', 'المغادرة: الأقرب')}</option>
              </select>
            </div>
          </div>

          {/* Filter Dropdown Popover */}
          {isFilterOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-30" onClick={() => setIsFilterOpen(false)} />

              {/* Dropdown */}
              <div className="absolute top-[calc(100%+8px)] left-0 w-full md:w-[360px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/60 dark:border-slate-800/60 p-6 z-40 animate-in fade-in zoom-in-95 duration-200 origin-top-left rtl:origin-top-right">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <SlidersHorizontal size={18} className="text-brand-500" /> {t('Filter Flights', 'تصفية الرحلات')}
                  </h3>
                  {(filterStops.length > 0 || filterAirlines.length > 0) && (
                    <button onClick={clearFilters} className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline font-semibold transition">
                      {t('Reset all', 'إعادة تعيين')}
                    </button>
                  )}
                </div>

                {/* Stops Section */}
                <div className="mb-6">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">{t('Stops', 'التوقفات')}</label>
                  <div className="space-y-2.5">
                    {[0, 1, 2].map(stop => (
                      <label key={stop} className="flex items-center gap-3 cursor-pointer group select-none">
                        <div className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-all duration-200 ${filterStops.includes(stop) ? 'bg-brand-600 border-brand-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-brand-400'}`}>
                          {filterStops.includes(stop) && <Check size={14} className="text-white stroke-[3px]" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={filterStops.includes(stop)} onChange={() => toggleStopFilter(stop)} />
                        <span className={`text-sm transition-colors ${filterStops.includes(stop) ? 'text-brand-900 dark:text-brand-100 font-semibold' : 'text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                          {stop === 0 ? t('Non-stop', 'بدون توقف') : stop === 1 ? t('1 Stop', 'توقف واحد') : t('2+ Stops', 'توقفان أو أكثر')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Airlines Section */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">{t('Airlines', 'شركات الطيران')}</label>
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
                    {availableAirlines.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">No airlines available to filter</p>
                    ) : (
                      availableAirlines.map(airline => (
                        <label key={airline} className="flex items-center gap-3 cursor-pointer group select-none">
                          <div className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-all duration-200 ${filterAirlines.includes(airline) ? 'bg-brand-600 border-brand-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-brand-400'}`}>
                            {filterAirlines.includes(airline) && <Check size={14} className="text-white stroke-[3px]" />}
                          </div>
                          <input type="checkbox" className="hidden" checked={filterAirlines.includes(airline)} onChange={() => toggleAirlineFilter(airline)} />
                          <span className={`text-sm transition-colors ${filterAirlines.includes(airline) ? 'text-brand-900 dark:text-brand-100 font-semibold' : 'text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                            {airline}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button onClick={() => setIsFilterOpen(false)} className="bg-brand-600 text-white px-8 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-700 active:scale-95 transition-all shadow-md hover:shadow-lg">
                    {t('View Results', 'عرض النتائج')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {filteredAndSortedResults.map(flight => {
          const pred = priceAnalyses[flight.id];
          const highlights = getFlightHighlights(flight, filteredAndSortedResults);
          const mlState = mlPredictionStates[flight.id];
          const hasVerifiedAmenities = Boolean(
            (typeof flight.amenities?.baggage === 'string' && flight.amenities.baggage.trim()) ||
            (typeof flight.amenities?.meal === 'string' && flight.amenities.meal.trim()) ||
            typeof flight.amenities?.wifi === 'boolean' ||
            typeof flight.amenities?.power === 'boolean'
          );

          return (
            <div key={flight.id} className="bg-[#FFFFFF] rounded-2xl shadow-2xl overflow-hidden transition-all hover:shadow-3xl hover:-translate-y-1 duration-300 relative">
              {/* Compare Checkbox - Hidden when any detail section is expanded */}
              <div
                className={`absolute bottom-4 left-4 z-10 transition-opacity duration-300 ease-in-out ${isAnySectionExpanded(flight.id) ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
              >
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={compareList.includes(flight.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleCompare(flight.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">Compare</span>
                </label>
              </div>

              {/* Main Card Content */}
              <div className="p-5 md:p-6">
                <div className="flex flex-col lg:flex-row gap-6">

                  {/* Left: Flight Information */}
                  <div className="flex-1">
                    {/* Airline Info */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 p-0.5 shadow-sm overflow-hidden shrink-0">
                        <AirlineLogo airline={flight.airline} carrierCode={flight.carrierCode} className="w-full h-full" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1E293B]">{flight.airline}</span>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {flight.flightNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Flight Times & Duration */}
                    <div className="flex items-center gap-4 md:gap-8">
                      {/* Departure */}
                      <div className="flex-1">
                        <div className="text-3xl font-bold text-[#1E293B] dark:text-white tracking-tight">{formatTime(flight.departureTime)}</div>
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{flight.origin}</div>
                      </div>

                      {/* Duration Visualization */}
                      <div className="flex-1 flex flex-col items-center px-2 md:px-4 min-w-[140px]">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 whitespace-nowrap">{flight.duration}</div>
                        <div className="w-full relative flex items-center">
                          <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                          <div className="flex-1 h-px bg-slate-300 dark:bg-slate-600 mx-2 relative">
                            {flight.stops === 0 && (
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.699-3.181A1 1 0 0118 4.323V16a1 1 0 01-1 1H3a1 1 0 01-1-1V4.323a1 1 0 011.346-.619l1.699 3.181L9 4.323V3a1 1 0 011-1zm-1 8a1 1 0 012 0v4a1 1 0 01-2 0v-4z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                        </div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                          {flight.stops === 0 ? 'Direct' : `${flight.stops} ${flight.stops === 1 ? 'stop' : 'stops'}`}
                        </div>
                      </div>

                      {/* Arrival */}
                      <div className="flex-1 text-right">
                        <div className="text-3xl font-bold text-[#1E293B] dark:text-white tracking-tight">{formatTime(flight.arrivalTime)}</div>
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{flight.destination}</div>
                      </div>
                    </div>
                  </div>

                  {/* Divider - Mobile Only */}
                  <div className="lg:hidden h-px bg-slate-200 dark:bg-slate-700"></div>

                  {/* Right: Price & Actions */}
                  <div className="lg:min-w-[240px] flex flex-col gap-4">
                    {/* Price */}
                    <div className="text-center lg:text-right">
                      <div className="text-4xl font-bold text-brand-600 dark:text-[#4338CA]">{formatFlightPrice(flight)}</div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Total price</div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleBook(flight)}
                        className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg active:scale-95 transform duration-150 flex items-center justify-center gap-2 ${isLoggedIn
                            ? 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white'
                            : 'bg-cyan-400 hover:bg-cyan-500 text-white font-bold'
                          }`}
                      >
                        {!isLoggedIn && <Lock size={15} strokeWidth={3} />}
                        {isLoggedIn ? t('Open Booking Demo', 'فتح عرض الحجز') : t('Login for Booking Demo', 'سجل للدخول إلى عرض الحجز')}
                      </button>

                      {/* Toggle Buttons Row */}
                      <div className="flex flex-col gap-2">
                        {/* Experimental ML toggle */}
                        <button
                          onClick={() => toggleMLPrediction(flight.id)}
                          className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <TrendingUp size={16} />
                          {expandedML[flight.id] ? 'Hide Price Prediction' : 'Price Prediction'}
                        </button>

                        {/* Flight Details Button - Opens Both Amenities & Flight Path */}
                        <button
                          onClick={() => toggleFlightDetails(flight.id)}
                          className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          {expandedDetails[flight.id] ? 'Hide Details' : 'FLIGHT DETAILS'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable Sections */}

              {/* Search-result analysis and deterministic highlights belong to Flight Details. */}
              {expandedDetails[flight.id] && (
                <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 md:p-5 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-3">Flight Details — Price &amp; Highlights</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                    {pred && (
                      <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 border-emerald-200/70 dark:border-emerald-800/70">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 shrink-0">
                            <TrendingUp size={16} />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h5 className="font-bold text-slate-900 dark:text-white text-sm">Price Analysis</h5>
                              <span
                                className={`max-w-full text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide text-right ${
                                  pred.status === 'unavailable'
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                                    : pred.classification === 'BELOW_AVERAGE'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                    : pred.classification === 'NEAR_AVERAGE'
                                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                        : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                                  }`}
                              >
                                {pred.status === 'comparison'
                                  ? `Rule-based · ${
                                      pred.classification === 'BELOW_AVERAGE'
                                        ? 'Below current result-set average'
                                        : pred.classification === 'ABOVE_AVERAGE'
                                          ? 'Above current result-set average'
                                          : 'Near current result-set average'
                                    }`
                                  : 'Not comparable'}
                              </span>
                            </div>
                            {pred.status === 'comparison' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-1.5 pt-0.5">
                                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                                  <div className="font-semibold">Current flight price</div>
                                  <div className="font-mono text-xs text-slate-800 dark:text-slate-100">
                                    {formatFlightPrice(flight)}
                                  </div>
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                                  <div className="font-semibold">Current result-set average</div>
                                  <div className="font-mono text-xs text-slate-800 dark:text-slate-100">
                                    {formatMoney(pred.resultSetAverage, flight.currency || 'USD')}
                                  </div>
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                                  <div className="font-semibold">Difference from average</div>
                                  <div className="font-mono text-xs text-slate-800 dark:text-slate-100">
                                    {pred.priceDifferencePercent > 0 ? '+' : ''}
                                    {pred.priceDifferencePercent}%
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[11px] leading-4 text-slate-600 dark:text-slate-300">
                                {pred.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 border-sky-200/70 dark:border-sky-800/70">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300 shrink-0">
                          <Plane size={16} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h5 className="font-bold text-slate-900 dark:text-white text-sm">Flight Highlights</h5>
                            {highlights.badges.length > 0 && (
                              <div className="flex flex-wrap justify-end gap-1">
                                {highlights.badges.map(badge => (
                                  <span key={badge} className="rounded-full bg-sky-100 dark:bg-sky-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                                    {badge}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-1.5 text-[11px]">
                            {highlights.price && (
                              <div>
                                <div className="font-semibold text-slate-600 dark:text-slate-300">Price</div>
                                <div className="font-medium text-slate-800 dark:text-slate-100">{highlights.price}</div>
                              </div>
                            )}
                            {highlights.duration && (
                              <div>
                                <div className="font-semibold text-slate-600 dark:text-slate-300">Duration</div>
                                <div className="font-medium text-slate-800 dark:text-slate-100">{highlights.duration}</div>
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-600 dark:text-slate-300">Stops</div>
                              <div className="font-medium text-slate-800 dark:text-slate-100">{highlights.stops}</div>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Based on the current displayed search results.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Experimental ML is separate from the local Flight Details analyses. */}
              {expandedML[flight.id] && (
                <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5 md:p-6 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-4">Experimental ML Prototype</h4>
                  {!mlState && (
                    <div className="text-sm">
                      <button type="button" onClick={() => void requestMLPrediction(flight)}
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                        Run Experimental ML Prototype
                      </button>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Experimental ML prototype trained on synthetic data. This is not a verified airfare forecast.
                      </p>
                    </div>
                  )}
                  {mlState?.status === 'loading' && (
                    <div className="mt-4 p-4 rounded-xl border bg-white dark:bg-slate-900 border-blue-200/60 dark:border-blue-800/60 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-blue-600" />
                      Loading experimental model output…
                    </div>
                  )}
                  {mlState?.status === 'unsupported' && (
                    <div className="mt-4 p-4 rounded-xl border bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                      <h5 className="font-bold text-slate-900 dark:text-white text-sm">Experimental ML unavailable for this flight</h5>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{mlState.message}</p>
                    </div>
                  )}
                  {mlState?.status === 'unavailable' && (
                    <div className="mt-4 p-4 rounded-xl border bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                      <h5 className="font-bold text-slate-900 dark:text-white text-sm">Experimental ML service unavailable</h5>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{mlState.message}</p>
                    </div>
                  )}
                  {mlState?.status === 'result' && (
                    <div className="mt-4 p-4 rounded-xl border-2 bg-white dark:bg-slate-900 border-blue-200/60 dark:border-blue-800/60">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300">
                          <TrendingUp size={18} />
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Experimental ML prototype trained on synthetic data. This is not a verified airfare forecast.</p>

                          {/* Predicted Price */}
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {formatMoney(mlState.prediction.predictedPrice, mlState.prediction.currency)}
                          </div>

                          {/* Trend & difference */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="font-semibold text-slate-600 dark:text-slate-300">Price Trend</div>
                              <div className={`font-bold capitalize flex items-center gap-1 ${mlState.prediction.trend === 'increase' ? 'text-red-600' :
                                  mlState.prediction.trend === 'decrease' ? 'text-emerald-600' :
                                    'text-amber-600'
                                }`}>
                                {mlState.prediction.trend === 'increase' && '↑'}
                                {mlState.prediction.trend === 'decrease' && '↓'}
                                {mlState.prediction.trend === 'stable' && '→'}
                                {mlState.prediction.trend}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-slate-600 dark:text-slate-300">Model difference</div>
                              <div className="font-mono text-slate-800 dark:text-slate-100">
                                {mlState.prediction.priceChangePercent > 0 ? '+' : ''}{mlState.prediction.priceChangePercent.toFixed(1)}%
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {mlState.prediction.summary}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Itinerary, verified provider details, and timeline within Flight Details. */}
              {expandedDetails[flight.id] && (
                <div className="border-t border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 px-4 pb-4 pt-3 md:px-5 md:pb-5 md:pt-4 animate-in fade-in slide-in-from-top-2">
                  {hasVerifiedAmenities && (
                    <>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-3">Amenities &amp; Baggage</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      {flight.amenities?.baggage && (
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg text-sky-600 dark:text-sky-400"><Luggage size={16} /></div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">Baggage</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{flight.amenities.baggage}</span>
                          </div>
                        </div>
                      )}
                      {flight.amenities?.meal && (
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400"><Utensils size={16} /></div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">Meal</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{flight.amenities.meal}</span>
                          </div>
                        </div>
                      )}
                      {typeof flight.amenities?.wifi === 'boolean' && (
                        <div className={`flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${flight.amenities.wifi ? 'bg-white dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-800 opacity-60'}`}>
                          <div className={`p-2 rounded-lg ${flight.amenities.wifi ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}><Wifi size={16} /></div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">Wi-Fi</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{flight.amenities.wifi ? 'Reported available' : 'Reported unavailable'}</span>
                          </div>
                        </div>
                      )}
                      {typeof flight.amenities?.power === 'boolean' && (
                        <div className={`flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${flight.amenities.power ? 'bg-white dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-800 opacity-60'}`}>
                          <div className={`p-2 rounded-lg ${flight.amenities.power ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}><Zap size={16} /></div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">Power</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{flight.amenities.power ? 'Reported available' : 'Reported unavailable'}</span>
                          </div>
                        </div>
                      )}
                      </div>
                    </>
                  )}
                  {flight.aircraft && (
                    <div className={hasVerifiedAmenities ? 'mt-3' : ''}>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Aircraft: <span className="font-semibold text-slate-700 dark:text-slate-300">{flight.aircraft}</span></p>
                    </div>
                  )}

                  {/* Compact journey timeline; all durations come directly from provider data. */}
                  <div className={hasVerifiedAmenities || flight.aircraft ? 'mt-4' : ''}>
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Flight Timeline</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock size={11} /> {t('All times are local to the listed airports.', 'جميع الأوقات محلية للمطارات المذكورة.')}
                      </p>
                    </div>

                    <div className="min-w-0">
                      {flight.segments && flight.segments.length > 0 ? (
                        <div className={`grid grid-cols-1 gap-2.5 ${flight.segments.length > 1 ? 'md:grid-cols-2' : ''}`}>
                          {flight.segments.map((segment, idx) => {
                          const isLast = idx === flight.segments.length - 1;
                          const nextSegment = flight.segments[idx + 1];
                          const hasVerifiedConnection = Boolean(
                            nextSegment &&
                            segment.arrival.iataCode === nextSegment.departure.iataCode
                          );

                          return (
                            <div key={idx} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                              <div className="mb-2 flex min-w-0 items-center justify-between gap-2 text-[10px]">
                                <span className="font-bold uppercase tracking-wide text-slate-400">Segment {idx + 1}</span>
                                <span className="min-w-0 truncate font-medium text-slate-500 dark:text-slate-400">
                                  {segment.carrierCode} {segment.flightNumber}
                                </span>
                              </div>

                              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(72px,0.8fr)_minmax(0,1fr)] items-center gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-brand-500 bg-white dark:bg-slate-900" />
                                    <span className="whitespace-nowrap text-base font-bold leading-none text-slate-900 dark:text-white">
                                      {formatTime(segment.departure.at)}
                                    </span>
                                  </div>
                                  <div className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-200">{segment.departure.iataCode}</div>
                                  {getCityName(segment.departure.iataCode) !== segment.departure.iataCode && (
                                    <div className="truncate text-[10px] text-slate-500 dark:text-slate-400" title={getCityName(segment.departure.iataCode)}>
                                      {getCityName(segment.departure.iataCode)}
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 text-center">
                                  <div className="mb-1 flex items-center" aria-hidden="true">
                                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                                    <Plane size={12} className="mx-1 shrink-0 rotate-90 text-sky-500" />
                                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                                  </div>
                                  <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                                    <Clock size={9} className="shrink-0" />
                                    <span className="truncate">{segment.duration}</span>
                                  </span>
                                </div>

                                <div className="min-w-0 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className="whitespace-nowrap text-base font-bold leading-none text-slate-900 dark:text-white">
                                      {formatTime(segment.arrival.at)}
                                    </span>
                                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isLast ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                  </div>
                                  <div className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-200">{segment.arrival.iataCode}</div>
                                  {getCityName(segment.arrival.iataCode) !== segment.arrival.iataCode && (
                                    <div className="truncate text-[10px] text-slate-500 dark:text-slate-400" title={getCityName(segment.arrival.iataCode)}>
                                      {getCityName(segment.arrival.iataCode)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {hasVerifiedConnection && (
                                <div className="mt-2 flex justify-center">
                                  <span className="inline-flex max-w-full items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                                    <span className="truncate">
                                      {t('Connection', 'توقف')} · {segment.arrival.iataCode}
                                      {getCityName(segment.arrival.iataCode) !== segment.arrival.iataCode && ` — ${getCityName(segment.arrival.iataCode)}`}
                                    </span>
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(80px,1fr)_minmax(0,1fr)] items-center gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-brand-500 bg-white dark:bg-slate-900" />
                                <span className="whitespace-nowrap text-base font-bold text-slate-900 dark:text-white">{formatTime(flight.departureTime)}</span>
                              </div>
                              <div className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">{flight.origin}</div>
                              {getCityName(flight.origin) !== flight.origin && (
                                <div className="truncate text-[10px] text-slate-500 dark:text-slate-400" title={getCityName(flight.origin)}>{getCityName(flight.origin)}</div>
                              )}
                            </div>
                            <div className="min-w-0 text-center">
                              <div className="mb-1 flex items-center" aria-hidden="true">
                                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                                <Plane size={12} className="mx-1 shrink-0 rotate-90 text-sky-500" />
                                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                              </div>
                              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                                <Clock size={9} className="shrink-0" />
                                <span className="truncate">{flight.duration}</span>
                              </span>
                            </div>
                            <div className="min-w-0 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="whitespace-nowrap text-base font-bold text-slate-900 dark:text-white">{formatTime(flight.arrivalTime)}</span>
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                              </div>
                              <div className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">{flight.destination}</div>
                              {getCityName(flight.destination) !== flight.destination && (
                                <div className="truncate text-[10px] text-slate-500 dark:text-slate-400" title={getCityName(flight.destination)}>{getCityName(flight.destination)}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}



        {/* Empty State */}
        {filteredAndSortedResults.length === 0 && !searching && (
          <div className="mt-12 w-full h-[400px] rounded-3xl border-2 border-brand-100 dark:border-brand-900 bg-brand-50/50 dark:bg-brand-950/20 flex flex-col items-center justify-center text-center p-8 transition-all hover:bg-brand-50/70 dark:hover:bg-brand-950/30">
            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 mb-6 animate-pulse-slow">
              <MapPin size={40} className="text-slate-300 dark:text-slate-600" />
            </div>
            {results.length > 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-lg font-medium">{t('No flights match your filters.', 'لا توجد رحلات تطابق تصفيتك.')}</p>
            ) : (
              <p className="text-slate-400 dark:text-slate-500 text-lg font-medium">{t('Enter your destination above to start exploring.', 'أدخل وجهتك أعلاه لبدء الاستكشاف.')}</p>
            )}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {selectedFlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 shrink-0">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                {bookingStatus === 'confirmed' ? t('Demo Record Saved', 'تم حفظ السجل التجريبي') : t('Booking Demonstration', 'عرض توضيحي للحجز')}
              </h3>
              <button onClick={closeBookingModal} disabled={bookingStatus === 'processing'} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40">
                <X size={20} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto">
              {bookingStatus === 'processing' ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 size={48} className="text-brand-600 animate-spin" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">{t('Saving a demo record to your SkyWings account — no payment is being processed...', 'جارٍ حفظ سجل تجريبي في حساب SkyWings الخاص بك — لا تتم معالجة أي دفعة...')}</p>
                </div>
              ) : bookingStatus === 'confirmed' ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('Demo Complete', 'اكتمل العرض التجريبي')}</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-8">
                    No flight was booked, no payment was processed, and no ticket was issued. A clearly labeled demo record for {selectedFlight.destination} was saved to your SkyWings account.
                  </p>
                  <button onClick={closeBookingModal} className="w-full py-3.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition shadow-lg">
                    {t('Close Demo', 'إغلاق العرض')}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Flight Summary Card */}
                  <div className="bg-gradient-to-br from-slate-50 to-sky-50/30 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                      {/* Airline Logo Component in Modal */}
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-600 overflow-hidden shrink-0">
                        <AirlineLogo airline={selectedFlight.airline} carrierCode={selectedFlight.carrierCode} className="w-full h-full" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{selectedFlight.airline}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{selectedFlight.flightNumber}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatTime(selectedFlight.departureTime)}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{selectedFlight.origin}</div>
                      </div>
                      <div className="flex flex-col items-center px-4">
                        <span className="text-xs text-slate-400">{selectedFlight.duration}</span>
                        <div className="w-24 h-px bg-slate-300 dark:bg-slate-600 my-1 relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                        </div>
                      </div>
                      <div className="text-right text-end">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatTime(selectedFlight.arrivalTime)}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{selectedFlight.destination}</div>
                      </div>
                    </div>
                  </div>

                  {/* Demo price summary */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-1">{t('Demo Price Summary', 'ملخص السعر التجريبي')}</h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">Display only. No payment information is collected or processed.</p>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>{t('Flight Fare', 'سعر الرحلة')}</span>
                        <span>{formatFlightPrice(selectedFlight)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg text-slate-900 dark:text-white border-t border-slate-100 dark:border-slate-700 pt-3 mt-3">
                        <span>{t('Displayed price', 'السعر المعروض')}</span>
                        <span>{formatFlightPrice(selectedFlight)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  {bookingError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                      {bookingError}
                    </div>
                  )}
                  <button onClick={processBooking} className="w-full py-4 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-100 text-white dark:text-slate-900 font-bold rounded-xl hover:from-slate-800 hover:to-slate-700 dark:hover:from-slate-100 dark:hover:to-slate-200 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group active:scale-[0.98] transform duration-150">
                    <Check size={20} className="group-hover:scale-110 transition-transform" />
                    {t('Save Demo Record', 'حفظ سجل تجريبي')} · {formatFlightPrice(selectedFlight)} display only
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Compare Button */}
      {compareList.length === 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <button
            onClick={() => setShowComparisonModal(true)}
            className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white px-8 py-4 rounded-full font-bold shadow-2xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
          >
            <SlidersHorizontal size={20} />
            Compare Flights ({compareList.length})
          </button>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparisonModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowComparisonModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Compare Flights</h2>
              <button
                onClick={() => setShowComparisonModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="text-left py-4 px-4 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800">Feature</th>
                      {compareList.map(flightId => {
                        const flight = results.find(f => f.id === flightId);
                        if (!flight) return null;
                        return (
                          <th key={flightId} className="py-4 px-4 text-center font-bold text-slate-900 dark:text-white min-w-[200px]">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 p-0.5 overflow-hidden">
                                <AirlineLogo airline={flight.airline} carrierCode={flight.carrierCode} className="w-full h-full" />
                              </div>
                              <span className="text-sm">{flight.airline}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Price */}
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-300">Price</td>
                      {compareList.map(flightId => {
                        const flight = results.find(f => f.id === flightId);
                        return (
                          <td key={flightId} className="py-4 px-4 text-center">
                            <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">{formatFlightPrice(flight)}</span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Duration */}
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-300">Duration</td>
                      {compareList.map(flightId => {
                        const flight = results.find(f => f.id === flightId);
                        return (
                          <td key={flightId} className="py-4 px-4 text-center">
                            <span className="text-lg font-bold text-slate-900 dark:text-white">{flight?.duration}</span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Airline */}
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-300">Airline</td>
                      {compareList.map(flightId => {
                        const flight = results.find(f => f.id === flightId);
                        return (
                          <td key={flightId} className="py-4 px-4 text-center">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{flight?.airline}</span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Stops */}
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-300">Stops</td>
                      {compareList.map(flightId => {
                        const flight = results.find(f => f.id === flightId);
                        return (
                          <td key={flightId} className="py-4 px-4 text-center">
                            <span className={`text-sm font-bold ${flight?.stops === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              {flight?.stops === 0 ? 'Direct' : `${flight?.stops} stop${flight?.stops && flight.stops > 1 ? 's' : ''}`}
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-4 justify-end">
                <button
                  onClick={clearComparison}
                  className="px-6 py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Clear Comparison
                </button>
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
