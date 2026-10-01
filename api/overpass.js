// api/overpass.js
export default async function handler(req, res) {
    const { bbox } = req.query;
    if (!bbox) return res.status(400).json({ error: 'Missing bbox query parameter' });

    const [south, west, north, east] = bbox.split(',');
    const query = `[out:json][timeout:15];(way["building"](${south},${west},${north},${east});relation["building"](${south},${west},${north},${east}););out body;>;out skel qt;`;

    try {
        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(`Overpass returned status ${response.status}`);

        const data = await response.json();
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}