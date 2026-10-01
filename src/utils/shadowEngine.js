import SunCalc from 'suncalc';

/**
 * Converts a fractional hour (e.g. 14.75 -> 2:45 PM) or base Date into a Date object.
 */
export function getSimulatedDate(fractionalHour, baseDate = new Date()) {
    if (fractionalHour instanceof Date) return fractionalHour;

    const d = new Date(baseDate);
    if (typeof fractionalHour === 'number' && !isNaN(fractionalHour)) {
        const hours = Math.floor(fractionalHour);
        const minutes = Math.round((fractionalHour - hours) * 60);
        d.setHours(hours, minutes, 0, 0);
    }
    return d;
}

/**
 * Fetches building footprints via local serverless proxy route `/api/overpass`,
 * falling back to direct GET requests on public Overpass mirrors if needed.
 */
export async function fetchBuildingFootprints(bounds, signal) {
    if (!bounds) return [];

    const south = typeof bounds.getSouth === 'function' ? bounds.getSouth() : bounds.south;
    const west = typeof bounds.getWest === 'function' ? bounds.getWest() : bounds.west;
    const north = typeof bounds.getNorth === 'function' ? bounds.getNorth() : bounds.north;
    const east = typeof bounds.getEast === 'function' ? bounds.getEast() : bounds.east;

    // Prevent huge queries when zoomed out too far (e.g., > 0.08 deg delta)
    if (Math.abs(north - south) > 0.1 || Math.abs(east - west) > 0.1) {
        console.warn('Map area too large for Overpass shadow query. Zoom in closer.');
        return [];
    }

    const bbox = `${south},${west},${north},${east}`;
    const query = `[out:json][timeout:15];(way["building"](${south},${west},${north},${east});relation["building"](${south},${west},${north},${east}););out body;>;out skel qt;`;

    const endpoints = [
        `/api/overpass?bbox=${encodeURIComponent(bbox)}`,
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
        `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`,
        `https://overpass.private.coffee/api/interpreter?data=${encodeURIComponent(query)}`
    ];

    let data = null;

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, { signal });

            if (response.ok) {
                data = await response.json();
                break;
            }
        } catch (err) {
            if (err.name === 'AbortError') throw err;
            console.warn(`Overpass endpoint failed (${endpoint}), trying next...`);
        }
    }

    if (!data || !data.elements) return [];

    // Parse nodes into [longitude, latitude] format
    const nodes = {};
    data.elements.forEach((el) => {
        if (el.type === 'node') {
            nodes[el.id] = [el.lon, el.lat];
        }
    });

    const buildings = [];
    data.elements.forEach((el) => {
        if (el.type === 'way' && el.tags && el.tags.building) {
            const coords = (el.nodes || []).map((id) => nodes[id]).filter(Boolean);
            if (coords.length >= 3) {
                let height = 12;
                if (el.tags.height) {
                    height = parseFloat(el.tags.height) || 12;
                } else if (el.tags['building:levels']) {
                    height = (parseFloat(el.tags['building:levels']) || 3) * 3.5;
                }

                buildings.push({
                    id: el.id,
                    height,
                    coords, // Array of [lng, lat]
                });
            }
        }
    });

    return buildings;
}

/**
 * Computes 2D ground shadow polygon projected from building footprint relative to sun angle.
 * Output coordinates are formatted as standard closed GeoJSON [longitude, latitude] ring.
 */
export function calculateBuildingShadow(
    building,
    centerLat = 22.3027,
    centerLng = 114.1609,
    timeOrDate = new Date()
) {
    const lat = (typeof centerLat === 'number' && !isNaN(centerLat)) ? centerLat : 22.3027;
    const lng = (typeof centerLng === 'number' && !isNaN(centerLng)) ? centerLng : 114.1609;

    const targetDate = typeof timeOrDate === 'number'
        ? getSimulatedDate(timeOrDate)
        : (timeOrDate || new Date());

    const sunPos = SunCalc.getPosition(targetDate, lat, lng);
    const altitude = sunPos.altitude;
    const azimuth = sunPos.azimuth; // SunCalc azimuth: 0 = South, pi/2 = West

    // No shadows cast when sun is below horizon
    if (altitude <= 0.02) return null;

    const shadowLengthRatio = 1 / Math.tan(altitude);
    const latMetersRatio = 111000;
    const lngMetersRatio = 111000 * Math.cos((lat * Math.PI) / 180);

    // Dynamic max shadow length for visibility
    const shadowLengthMeters = Math.min(building.height * shadowLengthRatio, 300);

    const shadowDy = (shadowLengthMeters * Math.cos(azimuth)) / latMetersRatio;
    const shadowDx = (shadowLengthMeters * Math.sin(azimuth)) / lngMetersRatio;

    const ring = [];

    // Base building footprint [lng, lat]
    building.coords.forEach(([bLng, bLat]) => {
        ring.push([bLng, bLat]);
    });

    // Projected roof footprint [lng + dx, lat + dy]
    building.coords.slice().reverse().forEach(([bLng, bLat]) => {
        ring.push([bLng + shadowDx, bLat + shadowDy]);
    });

    // CRITICAL: Close the GeoJSON polygon ring by repeating the first coordinate
    if (ring.length > 0) {
        ring.push([ring[0][0], ring[0][1]]);
    }

    return ring;
}

/**
 * Helper to build a complete GeoJSON FeatureCollection ready for Mapbox/Leaflet source rendering.
 */
export function generateShadowGeoJSON(buildings, centerLat, centerLng, timeOrDate) {
    const features = [];

    buildings.forEach((b) => {
        const ring = calculateBuildingShadow(b, centerLat, centerLng, timeOrDate);
        if (ring && ring.length >= 4) {
            features.push({
                type: 'Feature',
                properties: { buildingId: b.id },
                geometry: {
                    type: 'Polygon',
                    coordinates: [ring], // Single outer ring
                },
            });
        }
    });

    return {
        type: 'FeatureCollection',
        features,
    };
}