/**
 * Fetches building footprints and estimated heights from OpenStreetMap Overpass API
 * using fallback mirrors and POST requests to bypass CORS / 406 errors.
 */
export async function fetchBuildingFootprints(bounds, signal) {
    if (!bounds) return [];

    const south = typeof bounds.getSouth === 'function' ? bounds.getSouth() : bounds.south;
    const west = typeof bounds.getWest === 'function' ? bounds.getWest() : bounds.west;
    const north = typeof bounds.getNorth === 'function' ? bounds.getNorth() : bounds.north;
    const east = typeof bounds.getEast === 'function' ? bounds.getEast() : bounds.east;

    // Clean compact query string
    const query = `[out:json][timeout:15];(way["building"](${south},${west},${north},${east});relation["building"](${south},${west},${north},${east}););out body;>;out skel qt;`;

    // List of reliable Overpass endpoints to try sequentially
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
                break; // Success! Exit mirror loop
            }
        } catch (err) {
            if (err.name === 'AbortError') throw err; // Respect user navigation cancellation
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
                let height = 12; // Fallback ~4 floors (12m)
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