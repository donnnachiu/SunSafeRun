import SunCalc from 'suncalc';

// CORS-friendly Overpass mirrors
const OVERPASS_ENDPOINTS = [
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];

// Simple in-memory cache to store building footprints per tile bbox
const footprintCache = new Map();

/**
 * Fetches building footprints within map bounds, handling CORS, fallbacks, and signal cancellation.
 */
export async function fetchBuildingFootprints(bounds, signal) {
    const south = bounds.getSouth().toFixed(4);
    const west = bounds.getWest().toFixed(4);
    const north = bounds.getNorth().toFixed(4);
    const east = bounds.getEast().toFixed(4);

    const cacheKey = `${south},${west},${north},${east}`;
    if (footprintCache.has(cacheKey)) {
        return footprintCache.get(cacheKey);
    }

    const query = `[out:json][timeout:12];(way["building"](${south},${west},${north},${east});relation["building"](${south},${west},${north},${east}););out body;>;out skel qt;`;

    for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
            // Use GET with query string to bypass CORS preflight checks on public mirrors
            const url = `${endpoint}?data=${encodeURIComponent(query)}`;

            const response = await fetch(url, { signal });
            if (!response.ok) continue;

            const data = await response.json();
            const buildings = parseOverpassBuildings(data);

            footprintCache.set(cacheKey, buildings);
            return buildings;
        } catch (err) {
            if (err.name === 'AbortError') return []; // Silently ignore cancelled requests
            console.warn(`Overpass endpoint ${endpoint} failed, trying fallback...`);
        }
    }

    console.error('All Overpass API endpoints failed or were blocked by CORS.');
    return [];
}

/**
 * Converts raw Overpass nodes/ways into footprint polygon coordinates and heights.
 */
function parseOverpassBuildings(data) {
    if (!data || !data.elements) return [];

    const nodes = {};
    data.elements.forEach((el) => {
        if (el.type === 'node') {
            nodes[el.id] = [el.lat, el.lon];
        }
    });

    const buildings = [];

    data.elements.forEach((el) => {
        if ((el.type === 'way' || el.type === 'relation') && el.tags && el.tags.building) {
            const polygonCoords = [];

            if (el.nodes) {
                el.nodes.forEach((nodeId) => {
                    if (nodes[nodeId]) polygonCoords.push(nodes[nodeId]);
                });
            }

            // Ensure valid closed or open polygon loops
            if (polygonCoords.length >= 3) {
                let height = 18; // Default to ~5-story height if un-tagged

                if (el.tags.height) {
                    height = parseFloat(el.tags.height);
                } else if (el.tags['building:levels']) {
                    height = parseFloat(el.tags['building:levels']) * 3.5;
                }

                buildings.push({
                    id: el.id,
                    coords: polygonCoords,
                    height: isNaN(height) ? 18 : height,
                });
            }
        }
    });

    return buildings;
}

/**
 * Computes 2D ground shadow polygon projected from building footprint relative to sun angle.
 */
export function calculateBuildingShadow(building, centerLat, centerLng, date = new Date()) {
    const sunPos = SunCalc.getPosition(date, centerLat, centerLng);
    const altitude = sunPos.altitude; // in radians
    const azimuth = sunPos.azimuth;   // in radians (0 = South)

    // No shadow at night or when sun is below horizon
    if (altitude <= 0) return null;

    const shadowLengthRatio = 1 / Math.tan(altitude);

    // Correct offset conversions (1 deg lat ~= 111,000m, 1 deg lng ~= 111,000m * cos(lat))
    const latMetersRatio = 111000;
    const lngMetersRatio = 111000 * Math.cos((centerLat * Math.PI) / 180);

    const shadowLengthMeters = building.height * shadowLengthRatio;

    // Azimuth in SunCalc: 0 is South, positive is West, negative is East
    const shadowDy = (shadowLengthMeters * Math.cos(azimuth)) / latMetersRatio;
    const shadowDx = (shadowLengthMeters * Math.sin(azimuth)) / lngMetersRatio;

    const shadowPolygon = [];

    // Building footprint base
    building.coords.forEach(([lat, lng]) => {
        shadowPolygon.push([lat, lng]);
    });

    // Projected roof points (offset relative to sun)
    building.coords.slice().reverse().forEach(([lat, lng]) => {
        shadowPolygon.push([lat + shadowDy, lng + shadowDx]);
    });

    return shadowPolygon;
}