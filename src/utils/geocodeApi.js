const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Free, keyless place search (city, address, landmark) via OpenStreetMap's
 * Nominatim service. Per Nominatim's usage policy this is for light,
 * interactive use only — callers should debounce and avoid firing a
 * request on every keystroke.
 */
export async function searchPlaces(query) {
  if (!query || query.trim().length < 3) return [];

  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '0',
    limit: '6',
  });

  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) throw new Error(`Location search failed: ${res.status}`);

  const results = await res.json();
  return results.map((r) => ({
    id: r.place_id,
    label: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}
