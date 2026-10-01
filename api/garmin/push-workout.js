export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { workoutName, distanceMeters, scheduledDate } = req.body;
    const accessToken = req.cookies.intervals_token; // or session token

    if (!accessToken) {
        return res.status(401).json({ error: 'Intervals/Garmin account not connected' });
    }

    try {
        // Post workout event to athlete's Intervals calendar
        const response = await fetch('https://intervals.icu/api/v1/athlete/0/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                category: 'WORKOUT',
                type: 'Run',
                name: workoutName || 'SunSafeRun Route ☀️',
                start_date_local: `${scheduledDate}T00:00:00`,
                moving_time: Math.round(distanceMeters / 2.7), // estimated duration at ~6:10/km pace
                description: `SunSafeRun shade-optimized workout (${Math.round(distanceMeters)}m)`,
            }),
        });

        if (!response.ok) throw new Error('Failed to push to Intervals');

        const data = await response.json();
        return res.status(200).json({ success: true, eventId: data.id });
    } catch (error) {
        console.error('Push Error:', error);
        return res.status(500).json({ error: 'Failed to push workout' });
    }
}