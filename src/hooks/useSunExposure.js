import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSegments, calculateRouteDistance } from '../utils/routeUtils';
import { getSunPosition, computeExposure } from '../utils/sunCalculations';
import { fetchHourlyExposureData, pickHourlyReading } from '../utils/weatherApi';

/** Turn a fractional hour (e.g. 14.5) + "today" into a real Date object. */
function dateForHour(fractionalHour) {
  const d = new Date();
  const h = Math.floor(fractionalHour);
  const m = Math.round((fractionalHour - h) * 60);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * routePoints: [{ lat, lng }, ...]
 * hour: fractional hour of day, e.g. 6.5 = 6:30 AM
 */
export function useSunExposure(routePoints, hour) {
  const [weather, setWeather] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState('idle'); // idle | loading | ready | error
  const [weatherError, setWeatherError] = useState(null);
  const lastFetchedKey = useRef(null);

  const start = routePoints[0] ?? null;

  useEffect(() => {
    if (!start) return;
    const key = `${start.lat.toFixed(3)},${start.lng.toFixed(3)}`;
    if (lastFetchedKey.current === key) return;
    lastFetchedKey.current = key;

    let cancelled = false;
    setWeatherStatus('loading');
    setWeatherError(null);

    fetchHourlyExposureData(start.lat, start.lng)
      .then((data) => {
        if (cancelled) return;
        setWeather(data);
        setWeatherStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setWeatherError(err.message || 'Could not load weather data');
        setWeatherStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [start?.lat, start?.lng]);

  const date = useMemo(() => dateForHour(hour), [hour]);

  const reading = useMemo(() => {
    if (!weather) return null;
    return pickHourlyReading(weather.hours, hour);
  }, [weather, hour]);

  const segments = useMemo(() => {
    if (routePoints.length < 2) return [];
    const raw = buildSegments(routePoints);

    return raw.map((seg) => {
      const sun = getSunPosition(date, seg.midpoint.lat, seg.midpoint.lng);
      const exposure = computeExposure({
        uvIndex: reading?.uvIndex ?? 0,
        cloudCoverPct: reading?.cloudCoverPct ?? 0,
        sunAltitudeDeg: sun.altitudeDeg,
        sunAzimuthDeg: sun.azimuthDeg,
        routeBearing: seg.bearing,
      });
      return { ...seg, sun, exposure };
    });
  }, [routePoints, date, reading]);

  const originSun = useMemo(() => {
    if (!start) return null;
    return getSunPosition(date, start.lat, start.lng);
  }, [start, date]);

  const totalDistance = useMemo(() => calculateRouteDistance(routePoints), [routePoints]);

  const summary = useMemo(() => {
    if (segments.length === 0) return null;
    const counts = { low: 0, moderate: 0, high: 0 };
    let worst = 'low';
    const order = { low: 0, moderate: 1, high: 2 };
    for (const seg of segments) {
      counts[seg.exposure.level] += seg.distance;
      if (order[seg.exposure.level] > order[worst]) worst = seg.exposure.level;
    }
    return { counts, worst };
  }, [segments]);

  return {
    segments,
    originSun,
    totalDistance,
    summary,
    reading,
    weatherStatus,
    weatherError,
  };
}
