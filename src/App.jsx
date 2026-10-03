// src/App.jsx
import { useCallback, useState, useEffect } from 'react';
import { Gauge, CloudRain } from 'lucide-react';
import MapView from './components/MapView';
import POILayer from './components/POILayer';
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
import { fetchRunnerPOIs } from './services/poiService';
import { POI_CATEGORIES } from './constants/poiCategories';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const MIN_HOUR = 5;
const MAX_HOUR = 20;
const FALLBACK_HOUR = 10;

function currentHourClamped() {
  const now = new Date();
  const fractional = now.getHours() + now.getMinutes() / 60;
  if (fractional < MIN_HOUR || fractional > MAX_HOUR) return FALLBACK_HOUR;
  return fractional;
}

export default function App() {
  const [routePoints, setRoutePoints] = useState([]);
  const [hour, setHour] = useState(currentHourClamped);
  const [flyTarget, setFlyTarget] = useState(null);
  const [sheetSnap, setSheetSnap] = useState('collapsed');
  const [isConnected, setIsConnected] = useState(false);
  const { theme, isDaytime, toggleTheme } = useTheme();

  // POI state using imported constants
  const [poiList, setPoiList] = useState([]);
  const [activeCategories, setActiveCategories] = useState([
    POI_CATEGORIES.WATER.id,
    POI_CATEGORIES.RESTROOM.id,
  ]);

  const { segments, originSun, totalDistance, summary, reading, hourly, weatherStatus, weatherError } =
      useSunExposure(routePoints, hour);

  // Load static POIs on component mount
  useEffect(() => {
    const pois = fetchRunnerPOIs();
    setPoiList(pois);
  }, []);

  // ── FIX 1: Updated to recognize the new 'hidden' snap ────────────────────
  // The sheet is only considered "open" when it's at half or full. Collapsed,
  // hidden, and the legacy 'peek' value are all treated as "not open".
  const isBottomDetailsOpen = sheetSnap === 'half' || sheetSnap === 'full';

  useEffect(() => {
    if (localStorage.getItem('intervals_connected') === 'true') {
      setIsConnected(true);
    }

    const handleMessage = (event) => {
      if (event.data?.type === 'INTERVALS_AUTH_SUCCESS') {
        setIsConnected(true);
        localStorage.setItem('intervals_connected', 'true');
      } else if (event.data?.type === 'INTERVALS_AUTH_ERROR') {
        console.error('Intervals/Garmin Auth Failed:', event.data.error);
      }
    };
    window.addEventListener('message', handleMessage);

    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      const savedPoints = localStorage.getItem('sunsaferun_route_points');
      if (savedPoints) {
        try {
          const parsed = JSON.parse(savedPoints);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRoutePoints(parsed);
            setFlyTarget({ lat: parsed[0].lat, lng: parsed[0].lng, nonce: Date.now() });
          }
        } catch (e) {
          console.error('Failed to parse saved route points:', e);
        }
        localStorage.removeItem('sunsaferun_route_points');
      }

      const savedHour = localStorage.getItem('sunsaferun_hour');
      if (savedHour) {
        try {
          const parsedHour = JSON.parse(savedHour);
          if (typeof parsedHour === 'number') {
            setHour(parsedHour);
          }
        } catch (e) {
          console.error('Failed to parse saved hour:', e);
        }
        localStorage.removeItem('sunsaferun_hour');
      }

      setIsConnected(true);
      localStorage.setItem('intervals_connected', 'true');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleInitiateGarminAuth = useCallback(() => {
    localStorage.setItem('sunsaferun_route_points', JSON.stringify(routePoints));
    localStorage.setItem('sunsaferun_hour', JSON.stringify(hour));

    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
        '/api/intervals/auth',
        'IntervalsAuthWindow',
        `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.href = '/api/intervals/auth';
    }
  }, [routePoints, hour]);

  const handleMapClick = useCallback((point) => {
    setRoutePoints((prev) => [...prev, point]);
  }, []);

  const handleUndo = useCallback(() => {
    setRoutePoints((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setRoutePoints([]);
  }, []);

  const handleSelectStart = useCallback((place) => {
    setRoutePoints((prev) => [{ lat: place.lat, lng: place.lng }, ...prev.slice(1)]);
    setFlyTarget({ lat: place.lat, lng: place.lng, nonce: Date.now() });
  }, []);

  const handleSelectStop = useCallback((place) => {
    setRoutePoints((prev) => [...prev, { lat: place.lat, lng: place.lng }]);
    setFlyTarget({ lat: place.lat, lng: place.lng, nonce: Date.now() });
  }, []);

  const toggleCategory = (categoryId) => {
    setActiveCategories((prev) =>
        prev.includes(categoryId)
            ? prev.filter((c) => c !== categoryId)
            : [...prev, categoryId]
    );
  };

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
            routePoints={routePoints}
            isConnectedToGarmin={isConnected}
            onConnect={handleInitiateGarminAuth}
        />
      </>
  );

  return (
      <div className={`app-height flex flex-col bg-ink ${theme}`}>
        <Header
            isDaytime={isDaytime}
            onToggleTheme={toggleTheme}
            isConnected={isConnected}
            onConnectGarmin={handleInitiateGarminAuth}
        />

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          <div className="relative flex-1 min-h-0">
            <MapView
                routePoints={routePoints}
                segments={segments}
                originSun={originSun}
                onMapClick={handleMapClick}
                isDaytime={isDaytime}
                flyTarget={flyTarget}
                isCollapsed={isBottomDetailsOpen}
            >
              {/* ── FIX 2: keyed POILayer forces a clean remount when the
                  active category set changes. This prevents react-leaflet
                  from leaving stale markers on the map when filters toggle. */}
              <POILayer
                  key={activeCategories.join(',')}
                  poiList={poiList}
                  activeCategories={activeCategories}
              />
            </MapView>

            {/* Top Control Stack (Search Bar, Controls, & Filter Pills) */}
            <div className="pointer-events-none absolute inset-x-0 top-0 p-3 flex flex-col gap-2 z-[1000]">
              <div className="pointer-events-auto">
                <RouteSearchBar onSelectStart={handleSelectStart} onSelectStop={handleSelectStop} />
              </div>
              <div className="pointer-events-auto">
                <RouteControls pointCount={routePoints.length} onUndo={handleUndo} onClear={handleClear} />
              </div>

              {/* Water & Toilets Toggle Pills */}
              <div className="pointer-events-auto flex gap-2">
                <button
                    type="button"
                    onClick={() => toggleCategory(POI_CATEGORIES.WATER.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-md border transition-all ${
                        activeCategories.includes(POI_CATEGORIES.WATER.id)
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sky-600/20'
                            : 'bg-surface text-paper border-line hover:bg-surface/80'
                    }`}
                >
                  {POI_CATEGORIES.WATER.icon} {POI_CATEGORIES.WATER.label}
                </button>
                <button
                    type="button"
                    onClick={() => toggleCategory(POI_CATEGORIES.RESTROOM.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-md border transition-all ${
                        activeCategories.includes(POI_CATEGORIES.RESTROOM.id)
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20'
                            : 'bg-surface text-paper border-line hover:bg-surface/80'
                    }`}
                >
                  {POI_CATEGORIES.RESTROOM.icon} {POI_CATEGORIES.RESTROOM.label}
                </button>
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

            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 hidden lg:flex justify-center z-[1000]">
              <div className="pointer-events-auto">
                <Legend />
              </div>
            </div>

            <BottomSheet peek={peekSummary} snap={sheetSnap} onSnapChange={setSheetSnap}>
              <div className="space-y-4">{sidebarContent}</div>
            </BottomSheet>
          </div>

          <aside className="hidden lg:flex w-[380px] shrink-0 border-l border-line bg-ink flex-col min-h-0">
            <div className="p-4 space-y-4 overflow-y-auto thin-scroll">{sidebarContent}</div>
          </aside>
        </div>
      </div>
  );
}