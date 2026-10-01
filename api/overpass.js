export default async function handler(req, res) {
    const { bbox } = req.query;

    if (!bbox) {
        return res.status(400).json({ error: 'Missing bbox query parameter' });
    }

    const [south, west, north, east] = bbox.split(',');
    const query = `[out:json][timeout:15];(way["building"](${south},${west},${north},${east});relation["building"](${south},${west},${north},${east}););out body;>;out skel qt;`;

    const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.private.coffee/api/interpreter'
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();

                // Cache responses at CDN edge for 1 hour to reduce upstream Overpass server load
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
                return res.status(200).json(data);
            }
        } catch (err) {
            console.error(`Overpass backend proxy attempt failed for ${endpoint}:`, err);
        }
    }

    return res.status(502).json({ error: 'All upstream Overpass instances failed' });
}