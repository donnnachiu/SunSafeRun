// weatherApi.js Thin client for the free Open-Meteo forecast API (no key required).
// Docs: https://open-meteo.com/en/docs
///

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

// Fetch hourly UV index, cloud cover, and precipitation for today at a given coordinate //
export async function fetchHourlyExposureData(lat, lng) {
  const url = new URL(BASE_URL);
  url.searchParams.set('latitude', lat.toFixed(5));
  url.searchParams.set('longitude', lng.toFixed(5));
  url.searchParams.set('hourly', 'uv_index,cloud_cover,precipitation_probability,precipitation');
  url.searchParams.set('forecast_days', '1');
  url.searchParams.set('timezone', 'auto');

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Open-Meteo request failed (${res.status})`);
  }
  const data = await res.json();

  const times = data?.hourly?.time ?? [];
  const uv = data?.hourly?.uv_index ?? [];
  const cloud = data?.hourly?.cloud_cover ?? [];
  const rainProb = data?.hourly?.precipitation_probability ?? [];
  const precip = data?.hourly?.precipitation ?? [];

  const hours = times.map((iso, i) => ({
    hour: new Date(iso).getHours(),
    time: iso,
    uvIndex: uv[i] ?? 0,
    cloudCoverPct: cloud[i] ?? 0,
    rainProbabilityPct: rainProb[i] ?? 0,
    precipMm: precip[i] ?? 0,
  }));

  return { hours, timezone: data?.timezone ?? 'UTC' };
}

/** Pick the closest hourly reading for a fractional hour like 14.5 for 2:30pm */
export function pickHourlyReading(hours, fractionalHour) {
  if (!hours || hours.length === 0) return null;
  const target = Math.round(fractionalHour) % 24;
  return hours.find((h) => h.hour === target) ?? hours[0];
}
