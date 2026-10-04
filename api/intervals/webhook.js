// api/intervals/webhook.js
import { kv } from '@vercel/kv';

const WEBHOOK_SECRET = process.env.INTERVALS_WEBHOOK_SECRET;

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const challenge = req.query.challenge;
        if (!challenge) {
            return res.status(400).json({ error: 'Missing challenge parameter' });
        }
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(challenge);
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers['authorization'] || '';
    if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const event = req.body || {};

    // Respond 200 immediately to prevent timeouts from Intervals.icu
    res.status(200).json({ ok: true });

    try {
        await handleActivityEvent(event);
    } catch (err) {
        console.error('Webhook background processing error:', err);
    }
}

async function handleActivityEvent(event) {
    console.log('Handling event type:', event.type);
    if (event.type !== 'ACTIVITY_UPLOADED' && event.type !== 'ACTIVITY_UPDATED') {
        console.log('Ignored event type:', event.type);
        return;
    }

    const activityId = event.id || event.activity_id;
    const athleteId = event.athlete_id;
    console.log('Extracted activityId:', activityId, 'athleteId:', athleteId);

    if (!activityId || !athleteId) {
        console.log('Missing activityId or athleteId');
        return;
    }

    let accessToken = await kv.get(`intervals_token:${athleteId}`);
    if (!accessToken) {
        accessToken = process.env.INTERVALS_API_KEY; // Fallback for testing
        console.log('Using fallback INTERVALS_API_KEY from environment');
    }

    if (!accessToken) {
        console.error(`No access token available for athlete ${athleteId}`);
        return;
    }

    console.log(`Fetching activity ${activityId} from Intervals.icu...`);
    const activityRes = await fetch(
        `https://intervals.icu/api/v1/activity/${activityId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    console.log('Intervals fetch response status:', activityRes.status);
    if (!activityRes.ok) {
        const errText = await activityRes.text();
        console.error('Failed to fetch activity from Intervals:', errText);
        return;
    }

    const activity = await activityRes.json();
    const description = activity.description || '';

    if (!description.includes('☀️ Sun Safe Run Stats')) {
        const updatedDescription = `${description}\n\n☀️ Sun Safe Run Stats: Route successfully optimized for minimal UV exposure.`.trim();

        console.log('Updating activity description on Intervals.icu...');
        const updateRes = await fetch(`https://intervals.icu/api/v1/activity/${activityId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ description: updatedDescription })
        });
        console.log('Update response status:', updateRes.status);
    } else {
        console.log('Description already contains Sun Safe Run Stats.');
    }
}