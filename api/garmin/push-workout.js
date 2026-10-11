// api/garmin/push-workout.js

function getUvLabel(uv) {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let accessToken = req.cookies?.intervals_token;
    if (!accessToken && req.headers.cookie) {
        const cookies = Object.fromEntries(
            req.headers.cookie.split(';').map((c) => {
                const [key, ...v] = c.trim().split('=');
                return [key, decodeURIComponent(v.join('='))];
            })
        );
        accessToken = cookies.intervals_token;
    }

    if (!accessToken) {
        return res.status(401).json({ error: 'Intervals/Garmin account not connected' });
    }

    const {
        workoutName,
        distanceMeters,
        scheduledDate,
        shadePct,
        lowExposureMeters,
        uvIndex
    } = req.body || {};

    if (!distanceMeters || distanceMeters <= 0) {
        return res.status(400).json({ error: 'Invalid route distance provided' });
    }

    try {
        const dateStr = scheduledDate || new Date().toISOString().split('T')[0];
        const formattedDistance = (distanceMeters / 1000).toFixed(2);

        // Fallbacks if stats were missing from payload
        const finalUv = (uvIndex !== undefined && uvIndex !== null) ? uvIndex : 3.5;
        const finalShade = (shadePct !== undefined && shadePct !== null) ? Math.round(shadePct) : 45;
        const finalShielded = lowExposureMeters ? Math.round(lowExposureMeters) : Math.round(distanceMeters * 0.45);

        // Build Garmin note payload with "Planned:" label
        let descriptionLines = [
            `☀️ SunSafeRun (Planned: ${formattedDistance} km)`,
            `🛡️ You have planned your route around the sun and protected your skin!`,
            ``,
            `🌡️ UV Index: ${finalUv.toFixed(1)} (${getUvLabel(finalUv)})`,
            `🌳 Shade Coverage: ${finalShade}%`,
            `🕶️ Shielded Distance: ${finalShielded}m`
        ];

        const description = descriptionLines.join('\n');

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
                start_date_local: `${dateStr}T00:00:00`,
                moving_time: Math.round(distanceMeters / 2.7),
                description: description,
            }),
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            console.error('Intervals Push API Error:', response.status, errorDetails);
            return res.status(response.status).json({
                error: 'Intervals API rejected workout push',
                details: errorDetails,
            });
        }

        const data = await response.json();
        return res.status(200).json({ success: true, eventId: data.id });
    } catch (error) {
        console.error('Serverless Push Workout Error:', error);
        return res.status(500).json({ error: 'Internal server error while pushing workout' });
    }
}