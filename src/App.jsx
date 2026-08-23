import { useCallback, useState } from 'react';
import { Gauge, CloudRain } from 'lucide-react';
import MapView from './components/MapView';
import SunArcSlider, { formatHour } from './components/SunArcSlider';
import StatsPanel from './components/StatsPanel';
import RouteControls from './components/RouteControls';
import RouteSearchBar from './components/RouteSearchBar';
import RainBanner from './components/RainBanner';
import BottomSheet from './components/BottomSheet';
import Legend from './components/Legend';
import Header from './components/Header';
import { useSunExposure } from './hooks/useSunExposure';
import { useTheme } from './hooks/useTheme';
import { getSunTimes } from './utils/sunCalculations';
import { classifyRain, RAIN_LABELS, RAIN_COLORS } from './utils/rainModel';

const DEFAULT_HOUR = 7.5;

export default function App() {
  const [routePoints, setRoutePoints] = useState([]);
  const [hour, setHour] = useState(DEFAULT_HOUR);
  const [flyTarget, setFlyTarget] = useState(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const { theme, isDaytime, toggleTheme } = useTheme();

  const { segments, originSun, totalDistance, summary, reading, hourly, weatherStatus, weatherError } =
      useSunExposure(routePoints, hour);

  const handleMapClick = useCallback((point) => {
    setRoutePoints((prev) => [...prev, point]);
  }, []);

  const handleUndo = useCallback(() => {
    setRoutePoints((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setRoutePoints([]);
  }, []);

  // Typed search sets/replaces the route's first point (keeps any stops
  // that were already placed) and pans the map there.
  const handleSelectStart = useCallback((place) => {
    setRoutePoints((prev) => [{ lat: place.lat, lng: place.lng }, ...prev.slice(1)]);
    setFlyTarget({ lat: place.lat, lng: place.lng, nonce: Date.now() });
  }, []);

  // Typed search appends a stop to the end of the route, same as clicking
  // the map — lets you build a route by search alone, like Google Maps.
  const handleSelectStop = useCallback((place) => {
    setRoutePoints((prev) => [...prev, { lat: place.lat, lng: place.lng }]);
    setFlyTarget({ lat: place.lat, lng: place.lng, nonce: Date.now() });
  }, []);

  const sunTimes =
      routePoints.length > 0
          ? getSunTimes(new Date(), routePoints[0].lat, routePoints[0].lng)
          : null;

  const rainLevel = routePoints.length > 0
      ? classifyRain({
        rainProbabilityPct: reading?.rainProbabilityPct ?? 0,
        precipMm: reading?.precipMm ?? 0,
      })
      : 'clear';

  const uv = reading?.uvIndex ?? 0;

  // One-line status shown on the collapsed mobile sheet, so the map stays
  // almost fully visible while still surfacing the info that matters most.
  const peekSummary = (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
        <span className="font-mono font-semibold text-paper">{formatHour(hour)}</span>
        {routePoints.length > 0 ? (
            <>
          <span className="flex items-center gap-1 text-muted">
            <Gauge size={12} className="text-amber" />
            UV {uv.toFixed(1)}
          </span>
              {rainLevel !== 'clear' && (
                  <span className="flex items-center gap-1" style={{ color: RAIN_COLORS[rainLevel] }}>
              <CloudRain size={12} />
                    {RAIN_LABELS[rainLevel]}
            </span>
              )}
            </>
        ) : (
            <span className="text-muted">Draw a route to see run details</span>
        )}
      </div>
  );

  const sidebarContent = (
      <>
        <SunArcSlider hour={hour} onChange={setHour} sunTimes={sunTimes} hourly={hourly} />
        <StatsPanel
            reading={reading}
            originSun={originSun}
            summary={summary}
            totalDistance={totalDistance}
            weatherStatus={weatherStatus}
            weatherError={weatherError}
            hasRoute={routePoints.length > 0}
            hour={hour}
            hourly={hourly}
        />
      </>
  );

  return (
      <div className={`app-height flex flex-col bg-ink ${theme}`}>
        <Header isDaytime={isDaytime} onToggleTheme={toggleTheme} />

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Map fills the full remaining height on every breakpoint — nothing
            in document flow shrinks it anymore. On mobile, the stats live in
            a BottomSheet that overlays the map instead of pushing it up. */}
          <div className="relative flex-1 min-h-0">
            <MapView
                routePoints={routePoints}
                segments={segments}
                originSun={originSun}
                onMapClick={handleMapClick}
                isDaytime={isDaytime}
                flyTarget={flyTarget}
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 p-3 flex flex-col gap-2 z-[1000]">
              <div className="pointer-events-auto">
                <RouteSearchBar onSelectStart={handleSelectStart} onSelectStop={handleSelectStop} />
              </div>
              <div className="pointer-events-auto">
                <RouteControls pointCount={routePoints.length} onUndo={handleUndo} onClear={handleClear} />
              </div>
              {rainLevel !== 'clear' && (
                  <div className="flex justify-center">
                    <RainBanner
                        level={rainLevel}
                        probabilityPct={reading?.rainProbabilityPct ?? 0}
                        precipMm={reading?.precipMm ?? 0}
                    />
                  </div>
              )}
            </div>

            {/* Legend stays as a map overlay only where there's room for it (desktop) */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 hidden lg:flex justify-center z-[1000]">
              <div className="pointer-events-auto">
                <Legend />
              </div>
            </div>

            <BottomSheet peek={peekSummary} expanded={sheetExpanded} onExpandedChange={setSheetExpanded}>
              <div className="space-y-4">{sidebarContent}</div>
            </BottomSheet>
          </div>

          {/* Desktop sidebar */}
          <aside className="hidden lg:flex w-[380px] shrink-0 border-l border-line bg-ink flex-col min-h-0">
            <div className="p-4 space-y-4 overflow-y-auto thin-scroll">{sidebarContent}</div>
          </aside>
        </div>
      </div>
  );
}
