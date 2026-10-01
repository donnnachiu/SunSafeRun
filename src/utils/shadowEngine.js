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
 * Fetches building footprints from OpenStreetMap Overpass API using fallback mirrors and POST requests.
 */
export async function fetchBuildingFootprints(bounds, signal) {
    if (!bounds) return [];

    const south = typeof bounds.getSouth === 'function' ? bounds.getSouth() : bounds.south;
    const west = typeof bounds.getWest === 'function' ? bounds.getWest() : bounds.west;
    const north = typeof bounds.getNorth === 'function' ? bounds.getNorth() : bounds.north;
    const east = typeof bounds.getEast === 'function' ? bounds.getEast() : bounds.east;

    const query = `[out:json][timeout:15];(way["building"](${south},${west},${north},${east});relation["building"](${south},${west},${north},${east}););out body;>;out skel qt;`;

    const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ];

    let data = null;

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                },
                body: `data=${encodeURIComponent(query)}`,
                signal,
            });

            if (response.ok) {
                data = await response.json();
                break;
            }
        } catch (err) {
            if (err.name === 'AbortError') throw err;
            console.warn(`Overpass mirror failed (${endpoint}), trying next...`);
        }
    }

    if (!data || !data.elements) return [];

    const nodes = {};
    data.elements.forEach((el) => {
        if (el.type === 'node') {
            nodes[el.id] = [el.lat, el.lon];
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
                    coords,
                });
            }
        }
    });

    return buildings;
}

/**
 * Computes 2D ground shadow polygon projected from building footprint relative to sun angle.
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
    const azimuth = sunPos.azimuth;

    if (altitude <= 0) return null;

    const shadowLengthRatio = 1 / Math.tan(altitude);
    const latMetersRatio = 111000;
    const lngMetersRatio = 111000 * Math.cos((lat * Math.PI) / 180);

    const shadowLengthMeters = building.height * shadowLengthRatio;

    const shadowDy = (shadowLengthMeters * Math.cos(azimuth)) / latMetersRatio;
    const shadowDx = (shadowLengthMeters * Math.sin(azimuth)) / lngMetersRatio;

    const shadowPolygon = [];

    building.coords.forEach(([bLat, bLng]) => {
        shadowPolygon.push([bLat, bLng]);
    });

    building.coords.slice().reverse().forEach(([bLat, bLng]) => {
        shadowPolygon.push([bLat + shadowDy, bLng + shadowDx]);
    });

    return shadowPolygon;
}