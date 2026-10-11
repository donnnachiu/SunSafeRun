// api/intervals/webhook.js
import { kv } from '@vercel/kv';
import { waitUntil } from '@vercel/functions';

const WEBHOOK_SECRET = process.env.INTERVALS_WEBHOOK_SECRET;

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const challenge = req.query.challenge;
        if (!challenge) return res.status(400).json({ error: 'Missing challenge' });
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(challenge);
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const authHeader = req.headers['authorization'] || '';
    if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const event = req.body || {};

    waitUntil(
        handleActivityEvent(event).catch(err =>
            console.error('Webhook background processing error:', err)
        )
    );

    return res.status(200).json({ ok: true });
}

async function handleActivityEvent(event) {
    if (event.type !== 'ACTIVITY_UPLOADED' && event.type !== 'ACTIVITY_UPDATED') return;

    const activityId = event.id || event.activity_id;
    const athleteId = event.athlete_id;
    if (!activityId || !athleteId) return;

    let accessToken = null;
    try {
        accessToken = await kv.get(`intervals_token:${athleteId}`);
    } catch (kvErr) {
        console.error('KV get error:', kvErr);
    }

    if (!accessToken) {
        console.error(`No access token for athlete ${athleteId}`);
        return;
    }

    // 1. Fetch completed activity details (to get actual distance in meters)
    const activityRes = await fetch(
        `https://intervals.icu/api/v1/activity/${activityId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!activityRes.ok) return;

    const activity = await activityRes.json();
    const currentDescription = activity.description || '';
    const actualDistanceMeters = activity.distance || 0;

    // Avoid duplicate processing if description is already updated
    if (currentDescription.includes('☀️ SunSafeRun Route') || currentDescription.includes('☀️ Sun Safe Run Stats')) {
        return;
    }

    // 2. Fetch athlete's calendar events for the activity date
    const actDate = activity.start_date_local
        ? activity.start_date_local.split('T')[0]
        : new Date().toISOString().split('T')[0];

    let richDescription = '';
    try {
        const eventsRes = await fetch(
            `https://intervals.icu/api/v1/athlete/${athleteId}/events?oldest=${actDate}&newest=${actDate}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (eventsRes.ok) {
            const events = await eventsRes.json();
            // Filter all SunSafeRun planned workouts on this day
            const sunSafeWorkouts = events.filter(
                e => e.category === 'WORKOUT' && e.description && e.description.includes('SunSafeRun')
            );

            if (sunSafeWorkouts.length > 0) {
                // Find the workout whose distance closest matches the actual GPS run distance
                let bestMatch = sunSafeWorkouts[0];
                let minDiff = Infinity;

                for (const w of sunSafeWorkouts) {
                    const match = w.description && w.description.match(/\(([\d.]+)\s*km\)/);
                    if (match) {
                        const plannedMeters = parseFloat(match[1]) * 1000;
                        const diff = Math.abs(plannedMeters - actualDistanceMeters);
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestMatch = w;
                        }
                    }
                }
                richDescription = bestMatch.description;
                console.log(`Matched planned workout with distance diff: ${Math.round(minDiff)}m for actual distance: ${Math.round(actualDistanceMeters)}m`);
            }
        }
    } catch (err) {
        console.error('Error fetching calendar events for webhook:', err);
    }

    // 3. Fallback if no matching planned workout was found
    if (!richDescription) {
        richDescription = `☀️ SunSafeRun Stats:\n🛡️ Route successfully optimized for minimal UV exposure.`;
    }

    const finalDescription = `${currentDescription}\n\n${richDescription}`.trim();

    // 4. Push the updated description back to Intervals.icu
    await fetch(`https://intervals.icu/api/v1/activity/${activityId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ description: finalDescription })
    });
}