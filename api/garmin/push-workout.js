// api/garmin/push-workout.js (Node.js / Express or Vercel API function)

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { workout, scheduledDate } = req.body;

    // Retrieve user's stored Garmin access token (from session or database)
    const userGarminAccessToken = req.session?.garminAccessToken;

    if (!userGarminAccessToken) {
        return res.status(401).json({ error: 'Garmin account not connected' });
    }

    try {
        // 1. Post workout structure to Garmin Training API
        const workoutRes = await fetch('https://healthapi.garmin.com/training-api/workout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userGarminAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(workout),
        });

        const workoutData = await workoutRes.json();

        // 2. Schedule workout onto user's Garmin Calendar for today
        await fetch(`https://healthapi.garmin.com/training-api/schedule/${workoutData.workoutId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userGarminAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ date: scheduledDate }),
        });

        return res.status(200).json({ success: true, workoutId: workoutData.workoutId });
    } catch (error) {
        console.error('Garmin API Error:', error);
        return res.status(500).json({ error: 'Failed to push to Garmin' });
    }
}