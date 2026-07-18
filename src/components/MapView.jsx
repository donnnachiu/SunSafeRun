import { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { destinationPoint, calculateRouteDistance } from '../utils/routeUtils';
import { EXPOSURE_COLORS } from '../utils/sunCalculations';

export const DEFAULT_CENTER = { lat: 22.3026, lng: 114.1602 };
const DEFAULT_ZOOM = 15;

function ClickCapture({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Handles moving the map smoothly once the user's browser geolocation is detected */
function LocationInitializer({ onLocationFound }) {
  const map = useMap();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          onLocationFound(userLoc);
          map.flyTo([userLoc.lat, userLoc.lng], DEFAULT_ZOOM, { animate: true, duration: 1.5 });
        },
        (error) => {
          console.log('Location permission denied or unavailable. Using default fallback.', error);
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

/** Smoothly pans/zooms to wherever a location search result was picked. */
function FlyToHandler({ target }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), DEFAULT_ZOOM), {
      animate: true,
      duration: 1.2,
    });
    // target.nonce changes on every selection, even re-selecting the same place
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.nonce]);

  return null;
}

/** Small glowing sun glyph, positioned relative to the route start to show the sun's direction. */
function sunDivIcon(altitudeDeg, isDaytime) {
  const belowHorizon = altitudeDeg <= 0;
  const ringColor = belowHorizon ? '#3A4650' : '#F2A93B';
  const glow = belowHorizon ? 'none' : '0 0 4px 2px rgba(242,169,59,0.55)';
  const borderColor = isDaytime ? '#FFFFFF' : '#10151A';
  const glyphColor = isDaytime ? '#FFFFFF' : '#10151A';
  const html = `
    <div style="width:28px;height:28px;border-radius:999px;background:${ringColor};
      box-shadow:${glow}; border:2px solid ${borderColor}; display:flex;
      align-items:center;justify-content:center;">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${glyphColor}" stroke-width="2.5" stroke-linecap="round">
        <circle cx="12" cy="12" r="4.5" fill="${glyphColor}"/>
        <line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/>
        <line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/>
        <line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/>
        <line x1="4.2" y1="19.8" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.8" y2="4.2"/>
      </svg>
    </div>`;
  return L.divIcon({ html, className: 'sun-glyph-marker', iconSize: [28, 28], iconAnchor: [14, 14] });
}

export default function MapView({ routePoints, segments, originSun, onMapClick, isDaytime, flyTarget }) {
  const [currentCenter, setCurrentCenter] = useState(DEFAULT_CENTER);
  const start = routePoints[0];

  const totalDistance = useMemo(() => calculateRouteDistance(routePoints), [routePoints]);
  const sunRadius = Math.min(Math.max(totalDistance * 0.4, 250), 2500);
  const sunMarkerPos =
    start && originSun ? destinationPoint(start, originSun.azimuthDeg, sunRadius) : null;

  const markerBorder = isDaytime ? '#FFFFFF' : '#10151A';
  const ringColor = isDaytime ? '#C7CCD4' : '#2A3640';
  const previewColor = isDaytime ? '#98A2AE' : '#8FA0AA';

  return (
    <MapContainer
      center={[currentCenter.lat, currentCenter.lng]}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors'
        url={
          isDaytime
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        }
      />
      <ClickCapture onMapClick={onMapClick} />

      {/* Listens for the user's location on mount and smoothly moves the view */}
      <LocationInitializer onLocationFound={setCurrentCenter} />

      {/* Pans/zooms to a location search result */}
      <FlyToHandler target={flyTarget} />

      {/* Compass ring for orientation context around the route start */}
      {start && (
        <Circle
          center={[start.lat, start.lng]}
          radius={sunRadius}
          pathOptions={{ color: ringColor, weight: 1, dashArray: '4 6', fill: false }}
        />
      )}

      {/* Scored route segments, color-coded by exposure danger */}
      {segments.map((seg) => (
        <Polyline
          key={seg.id}
          positions={[
            [seg.a.lat, seg.a.lng],
            [seg.b.lat, seg.b.lng],
          ]}
          pathOptions={{
            color: EXPOSURE_COLORS[seg.exposure.level],
            weight: 6,
            opacity: 0.95,
            lineCap: 'round',
          }}
        />
      ))}

      {/* Unscored preview while a route is still being drawn */}
      {segments.length === 0 && routePoints.length > 0 && (
        <Polyline
          positions={routePoints.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: previewColor, weight: 4, dashArray: '2 8' }}
        />
      )}

      {routePoints.map((p, i) => {
        const kind =
          i === 0 ? 'start' : i === routePoints.length - 1 && routePoints.length > 1 ? 'end' : 'waypoint';
        return (
          <CircleMarker
            key={i}
            center={[p.lat, p.lng]}
            radius={kind === 'waypoint' ? 4 : 7}
            pathOptions={{
              color: markerBorder,
              weight: 2,
              fillColor: kind === 'start' ? '#4C9A6A' : kind === 'end' ? '#D64545' : isDaytime ? '#12161C' : '#EDEFE9',
              fillOpacity: 1,
            }}
          />
        );
      })}

      {sunMarkerPos && originSun && (
        <Marker
          position={[sunMarkerPos.lat, sunMarkerPos.lng]}
          icon={sunDivIcon(originSun.altitudeDeg, isDaytime)}
          interactive={false}
        />
      )}
    </MapContainer>
  );
}
