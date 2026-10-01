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

    // 1. Safely extract token from cookies across Vercel environments
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

        // Build Garmin note payload
        let descriptionLines = [
            `☀️ SunSafeRun Route (${formattedDistance} km)`,
            `🛡️ You have planned your route around the sun and protected your skin!`,
            ``
        ];

        if (uvIndex !== undefined && uvIndex !== null) {
            descriptionLines.push(`🌡️ UV Index: ${uvIndex.toFixed(1)} (${getUvLabel(uvIndex)})`);
        }

        if (shadePct !== undefined && shadePct !== null) {
            descriptionLines.push(`🌳 Shade Coverage: ${Math.round(shadePct)}%`);
        }

        if (lowExposureMeters) {
            descriptionLines.push(`🕶️ Shielded Distance: ${Math.round(lowExposureMeters)}m`);
        }

        const description = descriptionLines.join('\n');

        // 2. Post workout event to athlete's Intervals calendar
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
                moving_time: Math.round(distanceMeters / 2.7), // estimated duration at ~6:10/km pace
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