// api/intervals/callback.js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    const { code } = req.query;
    const clientId = process.env.INTERVALS_CLIENT_ID;
    const clientSecret = process.env.INTERVALS_CLIENT_SECRET;
    const redirectUri = process.env.APP_URL
        ? `${process.env.APP_URL}/api/intervals/callback`
        : 'https://sun-safe-run.vercel.app/api/intervals/callback';

    if (!code) {
        return res.status(400).send('Missing authorization code.');
    }

    try {
        const tokenResponse = await fetch('https://intervals.icu/api/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: String(code),
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            return res.status(tokenResponse.status).send('Token exchange failed.');
        }

        const data = await tokenResponse.json();
        const athleteRes = await fetch('https://intervals.icu/api/v1/athlete/0', {
            headers: { Authorization: `Bearer ${data.access_token}` }
        });

        if (!athleteRes.ok) {
            return res.status(500).send('Failed to fetch athlete profile.');
        }

        const athleteData = await athleteRes.json();
        const athleteId = athleteData.id || athleteData.athlete?.id;

        // Store per-user token in Vercel KV
        await kv.set(`intervals_token:${athleteId}`, data.access_token);

        res.setHeader(
            'Set-Cookie',
            `intervals_token=${data.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
        );

        return res.send(`<html><body><p>Connected successfully as athlete ${athleteId}!</p><script>window.close();</script></body></html>`);
    } catch (err) {
        console.error('OAuth Callback Error:', err);
        return res.status(500).send('Internal server error during callback.');
    }
}