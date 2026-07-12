import { useCallback, useState } from 'react';
import MapView from './components/MapView';
import SunArcSlider from './components/SunArcSlider';
import StatsPanel from './components/StatsPanel';
import RouteControls from './components/RouteControls';
import Legend from './components/Legend';
import Header from './components/Header';
import { useSunExposure } from './hooks/useSunExposure';
import { getSunTimes } from './utils/sunCalculations';

const DEFAULT_HOUR = 7.5;

export default function App() {
  const [routePoints, setRoutePoints] = useState([]);
  const [hour, setHour] = useState(DEFAULT_HOUR);

  const { segments, originSun, totalDistance, summary, reading, weatherStatus, weatherError } =
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

  const sunTimes =
    routePoints.length > 0
      ? getSunTimes(new Date(), routePoints[0].lat, routePoints[0].lng)
      : null;

  return (
    <div className="h-screen flex flex-col bg-ink">
      <Header />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Map column */}
        <div className="relative flex-1 min-h-[45vh] lg:min-h-0">
          <MapView
            routePoints={routePoints}
            segments={segments}
            originSun={originSun}
            onMapClick={handleMapClick}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 p-3 flex flex-col gap-2 z-[500]">
            <div className="pointer-events-auto">
              <RouteControls pointCount={routePoints.length} onUndo={handleUndo} onClear={handleClear} />
            </div>
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
            <SunArcSlider hour={hour} onChange={setHour} sunTimes={sunTimes} />
            <StatsPanel
              reading={reading}
              originSun={originSun}
              summary={summary}
              totalDistance={totalDistance}
              weatherStatus={weatherStatus}
              weatherError={weatherError}
              hasRoute={routePoints.length > 0}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
