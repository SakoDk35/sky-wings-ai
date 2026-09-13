import React from 'react';
import { Plane, Clock, MapPin } from 'lucide-react';

interface FlightPathTimelineProps {
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  stopDetails?: string;
}

const FlightPathTimeline: React.FC<FlightPathTimelineProps> = ({
  origin,
  destination,
  departureTime,
  arrivalTime,
  duration,
  stops,
  stopDetails
}) => {
  const formatTimeDisplay = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return timeStr;
    }
  };

  const formatDateDisplay = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Timeline Container */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#4338CA] via-slate-300 to-[#4338CA]"></div>

        {/* Departure Point */}
        <div className="relative flex items-start gap-6 pb-12">
          {/* Icon */}
          <div className="absolute left-6 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-[#4338CA] to-indigo-600 flex items-center justify-center shadow-lg z-10">
            <Plane className="w-8 h-8 text-white transform -rotate-45" />
          </div>

          {/* Content Card */}
          <div className="ml-20 flex-1 bg-white rounded-xl shadow-md border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-2xl font-bold text-[#1E293B]">{formatTimeDisplay(departureTime)}</h3>
                <p className="text-sm font-medium text-slate-600 mt-1">{origin}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-[#4338CA] bg-indigo-50 px-3 py-1 rounded-full">
                  {formatDateDisplay(departureTime)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin size={16} />
              <span className="text-sm font-medium">Departure</span>
            </div>
          </div>
        </div>

        {/* Duration Segment */}
        {stops === 0 ? (
          // Direct Flight
          <div className="relative flex items-center gap-6 pb-12 pl-16">
            <div className="flex-1 flex items-center gap-4">
              <div className="flex-1 h-0.5 bg-gradient-to-r from-[#4338CA] to-indigo-400"></div>
              <div className="flex-shrink-0 bg-white rounded-lg shadow-md border border-slate-200 px-5 py-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#4338CA]" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-[#1E293B]">{duration}</p>
                    <p className="text-xs font-medium text-slate-600">Direct Flight</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-indigo-400 to-[#4338CA]"></div>
            </div>
          </div>
        ) : (
          // Connecting Flight
          <>
            <div className="relative flex items-center gap-6 pb-12 pl-16">
              <div className="flex-1 h-0.5 bg-dashed border-t-2 border-slate-300"></div>
              <div className="flex-shrink-0 bg-white rounded-lg shadow-md border border-slate-200 px-5 py-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#4338CA]" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-[#1E293B]">{duration}</p>
                    <p className="text-xs font-medium text-slate-600">
                      {stops} {stops === 1 ? 'stop' : 'stops'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-1 h-0.5 bg-dashed border-t-2 border-slate-300"></div>
            </div>

            {/* Stop Details */}
            {stopDetails && (
              <div className="relative flex items-center gap-6 pb-12 pl-20">
                <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 px-5 py-3">
                  <p className="text-sm font-medium text-slate-700">{stopDetails}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Arrival Point */}
        <div className="relative flex items-start gap-6 pl-16">
          {/* Icon */}
          <div className="absolute left-6 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg z-10">
            <MapPin className="w-8 h-8 text-white" />
          </div>

          {/* Content Card */}
          <div className="ml-20 flex-1 bg-white rounded-xl shadow-md border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-2xl font-bold text-[#1E293B]">{formatTimeDisplay(arrivalTime)}</h3>
                <p className="text-sm font-medium text-slate-600 mt-1">{destination}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                  {formatDateDisplay(arrivalTime)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin size={16} />
              <span className="text-sm font-medium">Arrival</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="mt-8 bg-gradient-to-r from-[#1E293B] to-slate-800 rounded-xl shadow-lg p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              <span className="text-sm font-medium">Total Duration:</span>
            </div>
            <span className="text-lg font-bold text-sky-400">{duration}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              stops === 0 
                ? 'bg-emerald-500/20 text-emerald-300' 
                : 'bg-amber-500/20 text-amber-300'
            }`}>
              {stops === 0 ? '✓ Direct' : `${stops} Stop${stops > 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightPathTimeline;
