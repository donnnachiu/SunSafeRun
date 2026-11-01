// api/tracks.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    const { venueId, date } = req.query;

    if (!venueId || !date) {
        return res.status(400).json({ error: 'Missing venueId or date parameters' });
    }

    // Consistent key pattern for all venues and dates
    const storageKey = `track:${venueId}:${date}`;

    try {
        const schedule = await redis.get(storageKey);

        if (!schedule) {
            // Return 404 if this specific track and date haven't been seeded/synced yet
            return res.status(404).json({ error: 'Schedule not found in database for this venue/date' });
        }

        return res.status(200).json(typeof schedule === 'string' ? JSON.parse(schedule) : schedule);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}