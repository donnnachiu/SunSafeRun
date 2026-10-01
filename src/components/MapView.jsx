import { useMemo, useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Circle,
  Marker,
  Polygon,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { destinationPoint, calculateRouteDistance } from '../utils/routeUtils';
import { EXPOSURE_COLORS } from '../utils/sunCalculations';
import { fetchBuildingFootprints, calculateBuildingShadow } from '../utils/shadowEngine';

export const DEFAULT_CENTER = { lat: 22.3026, lng: 114.1602 };
const DEFAULT_ZOOM = 15;

/** Ensures shadows sit on a Leaflet pane BELOW route lines and markers */
function ShadowPaneSetup() {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane('shadowPane')) {
      const pane = map.createPane('shadowPane');
      pane.style.zIndex = '350'; // Standard vectors/route lines render at zIndex 400
      pane.style.pointerEvents = 'none';
    }
  }, [map]);
  return null;
}

/** Captures click events on the map */
function ClickCapture({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Updates state center whenever the user pans or zooms */
function MapCenterTracker({ onCenterChange }) {
  useMapEvents({
    moveend(e) {
      const center = e.target.getCenter();
      onCenterChange({ lat: center.lat, lng: center.lng });
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

/** Automatically fetches building footprints when zooming or panning with debouncing */
function BuildingShadowLoader({ onBuildingsFetched }) {
  const map = useMap();

  useEffect(() => {
    let controller = new AbortController();
    let timer = null;

    async function loadBuildings() {
      if (map.getZoom() < 13) return; // Only fetch when zoomed in to street level

      controller.abort();
      controller = new AbortController();

      try {
        const bounds = map.getBounds();
        const buildings = await fetchBuildingFootprints(bounds, controller.signal);
        if (buildings.length > 0) {
          onBuildingsFetched(buildings);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching building shadows:', err);
        }
      }
    }

    const handleMoveEnd = () => {
      clearTimeout(timer);
      timer = setTimeout(loadBuildings, 400);
    };

    loadBuildings();
    map.on('moveend', handleMoveEnd);

    return () => {
      clearTimeout(timer);
      controller.abort();
      map.off('moveend', handleMoveEnd);
    };
  }, [map, onBuildingsFetched]);

  return null;
}

export default function MapView({
                                  routePoints = [],
                                  segments = [],
                                  originSun,
                                  onMapClick,
                                  isDaytime = true,
                                  flyTarget,
                                  selectedTime,
                                }) {
  const [currentCenter, setCurrentCenter] = useState(DEFAULT_CENTER);
  const [buildings, setBuildings] = useState([]);
  const [showShadows, setShowShadows] = useState(true); // Toggle building shadows (default: true)

  // Dynamic ground shadow calculation per building footprint
  const shadowPolygons = useMemo(() => {
    if (!showShadows || !isDaytime || buildings.length === 0) return [];
    const targetDate = selectedTime !== undefined && selectedTime !== null ? selectedTime : new Date();

    return buildings
        .map((b) => {
          if (!b.coords || b.coords.length === 0) return null;

          // 1. Correct destructuring order from GeoJSON [lng, lat]
          const [bLng, bLat] = b.coords[0];
          const shadow = calculateBuildingShadow(b, bLat, bLng, targetDate);

          // 2. Map GeoJSON [lng, lat] to Leaflet [lat, lng]
          return shadow ? shadow.map(([lng, lat]) => [lat, lng]) : null;
        })
        .filter(Boolean);
  }, [buildings, isDaytime, selectedTime, showShadows]);

  const start = routePoints[0];
  const totalDistance = useMemo(() => calculateRouteDistance(routePoints), [routePoints]);
  const sunRadius = Math.min(Math.max(totalDistance * 0.4, 250), 2500);

  const sunMarkerPos =
      start && originSun ? destinationPoint(start, originSun.azimuthDeg, sunRadius) : null;

  const markerBorder = isDaytime ? '#FFFFFF' : '#10151A';
  const ringColor = isDaytime ? '#C7CCD4' : '#2A3640';
  const previewColor = isDaytime ? '#98A2AE' : '#8FA0AA';

  return (
      <div className="relative h-full w-full">
        {/* Map Control: Building Shadow Toggle */}
        <div className="absolute top-3 right-3 z-[500]">
          <button
              type="button"
              onClick={() => setShowShadows((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md transition-all border shadow-sm ${
                  showShadows
                      ? 'bg-slate-900/80 text-amber-400 border-amber-500/30'
                      : 'bg-slate-900/60 text-slate-400 border-slate-700/50 hover:text-slate-200'
              }`}
          >
            <span className={`w-2 h-2 rounded-full ${showShadows ? 'bg-amber-400' : 'bg-slate-500'}`} />
            Building Shadows {showShadows ? 'On' : 'Off'}
          </button>
        </div>

        <MapContainer
            center={[currentCenter.lat, currentCenter.lng]}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom
            zoomControl={false}
            className="h-full w-full"
        >
          <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ShadowPaneSetup />
          <ClickCapture onMapClick={onMapClick} />
          <LocationInitializer onLocationFound={setCurrentCenter} />
          <MapCenterTracker onCenterChange={setCurrentCenter} />
          <FlyToHandler target={flyTarget} />
          <BuildingShadowLoader onBuildingsFetched={setBuildings} />

          {/* Render 3D Building Shadow Overlay on low zIndex shadowPane */}
          {shadowPolygons.map((shadowCoords, idx) => (
              <Polygon
                  key={`shadow-${idx}`}
                  positions={shadowCoords}
                  pane="shadowPane"
                  pathOptions={{
                    stroke: false,
                    fillColor: '#64748b',
                    fillOpacity: 0.22,
                    interactive: false,
                  }}
              />
          ))}

          {/* Compass ring around route start */}
          {start && (
              <Circle
                  center={[start.lat, start.lng]}
                  radius={sunRadius}
                  pathOptions={{ color: ringColor, weight: 1, dashArray: '4 6', fill: false }}
              />
          )}

          {/* Scored route segments */}
          {segments.map((seg) => (
              <Polyline
                  key={seg.id || `${seg.a.lat}-${seg.b.lat}`}
                  positions={[
                    [seg.a.lat, seg.a.lng],
                    [seg.b.lat, seg.b.lng],
                  ]}
                  pathOptions={{
                    color: EXPOSURE_COLORS[seg.exposure?.level] || '#3B82F6',
                    weight: 6,
                    opacity: 0.95,
                    lineCap: 'round',
                  }}
              />
          ))}

          {/* Unscored preview while route is drawn */}
          {segments.length === 0 && routePoints.length > 0 && (
              <Polyline
                  positions={routePoints.map((p) => [p.lat, p.lng])}
                  pathOptions={{ color: previewColor, weight: 4, dashArray: '2 8' }}
              />
          )}

          {/* Waypoint Markers */}
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
                      fillColor:
                          kind === 'start'
                              ? '#4C9A6A'
                              : kind === 'end'
                                  ? '#D64545'
                                  : isDaytime
                                      ? '#12161C'
                                      : '#EDEFE9',
                      fillOpacity: 1,
                    }}
                />
            );
          })}

          {/* Sun Position Marker */}
          {sunMarkerPos && originSun && (
              <Marker
                  position={[sunMarkerPos.lat, sunMarkerPos.lng]}
                  icon={sunDivIcon(originSun.altitudeDeg, isDaytime)}
                  interactive={false}
              />
          )}
        </MapContainer>
      </div>
  );
}