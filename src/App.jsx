import { useCallback, useState } from 'react';
import MapView from './components/MapView';
import SunArcSlider from './components/SunArcSlider';
import StatsPanel from './components/StatsPanel';
import RouteControls from './components/RouteControls';
import RouteSearchBar from './components/RouteSearchBar';
import RainBanner from './components/RainBanner';
import Legend from './components/Legend';
import Header from './components/Header';
import { useSunExposure } from './hooks/useSunExposure';
import { useTheme } from './hooks/useTheme';
import { getSunTimes } from './utils/sunCalculations';
import { classifyRain } from './utils/rainModel';

const DEFAULT_HOUR = 7.5;

export default function App() {
  const [routePoints, setRoutePoints] = useState([]);
  const [hour, setHour] = useState(DEFAULT_HOUR);
  const [flyTarget, setFlyTarget] = useState(null);
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

  return (
    <div className={`h-screen flex flex-col bg-ink ${theme}`}>
      <Header isDaytime={isDaytime} onToggleTheme={toggleTheme} />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Map column */}
        <div className="relative flex-1 min-h-[45vh] lg:min-h-0">
          <MapView
            routePoints={routePoints}
            segments={segments}
            originSun={originSun}
            onMapClick={handleMapClick}
            isDaytime={isDaytime}
            flyTarget={flyTarget}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 p-3 flex flex-col gap-2 z-[500]">
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

          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 flex justify-center z-[500]">
            <div className="pointer-events-auto">
              <Legend />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-line bg-ink flex flex-col min-h-0">
          <div className="p-4 space-y-4 overflow-y-auto thin-scroll">
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
          </div>
        </aside>
      </div>
    </div>
  );
}
