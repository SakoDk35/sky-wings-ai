import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getAirportCoordinates } from '../services/airportCoordinates';

interface FlightPathMapProps {
  origin: string;
  destination: string;
}

// Fix for default marker icon issue in Leaflet with Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const FlightPathMap: React.FC<FlightPathMapProps> = ({ origin, destination }) => {
  const originCoords = getAirportCoordinates(origin);
  const destCoords = getAirportCoordinates(destination);

  // Calculate center point for map view
  const centerLat = (originCoords.lat + destCoords.lat) / 2;
  const centerLng = (originCoords.lng + destCoords.lng) / 2;

  // Create curved path points (great circle approximation)
  const createCurvedPath = () => {
    const points: [number, number][] = [];
    const segments = 50;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // Simple interpolation with slight curve
      const lat = originCoords.lat + (destCoords.lat - originCoords.lat) * t;
      const lng = originCoords.lng + (destCoords.lng - originCoords.lng) * t;
      
      // Add slight arc for visual appeal (higher latitude for long distances)
      const distance = Math.sqrt(
        Math.pow(destCoords.lat - originCoords.lat, 2) + 
        Math.pow(destCoords.lng - originCoords.lng, 2)
      );
      
      if (distance > 20) { // Only curve for long flights
        const arcHeight = Math.sin(t * Math.PI) * (distance * 0.1);
        points.push([lat + arcHeight, lng]);
      } else {
        points.push([lat, lng]);
      }
    }
    
    return points;
  };

  const pathPoints = createCurvedPath();

  return (
    <div className="w-full h-[300px] rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 relative z-0">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={4}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        doubleClickZoom={false}
        className="w-full h-full"
      >
        {/* Dark mode tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Curved flight path */}
        <Polyline
          positions={pathPoints}
          color="#0ea5e9"
          weight={3}
          opacity={0.8}
          dashArray="10, 10"
        />
        
        {/* Origin Marker */}
        <Marker position={[originCoords.lat, originCoords.lng]}>
          <Popup>
            <strong>{origin}</strong><br />Departure
          </Popup>
        </Marker>
        
        {/* Destination Marker */}
        <Marker position={[destCoords.lat, destCoords.lng]}>
          <Popup>
            <strong>{destination}</strong><br />Arrival
          </Popup>
        </Marker>
      </MapContainer>
      
      {/* Map overlay info */}
      <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 z-[400]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-sky-500 rounded-full"></span>
          Flight Route
        </div>
      </div>
    </div>
  );
};

export default FlightPathMap;
