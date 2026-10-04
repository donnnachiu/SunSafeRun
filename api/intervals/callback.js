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
        return res.send(`<script>window.close();</script>`);
    }

    try {
        // 1. Exchange authorization code for access token
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
            const errText = await tokenResponse.text();
            console.error('OAuth token exchange failed:', tokenResponse.status, errText);
            return res.status(tokenResponse.status).send(`Token exchange failed: ${tokenResponse.status}`);
        }

        const data = await tokenResponse.json();
        console.log('Token exchange successful, fetching athlete profile...');

        // 2. Fetch the athlete's ID using the new token
        const athleteRes = await fetch('https://intervals.icu/api/v1/athlete/0', {
            headers: { Authorization: `Bearer ${data.access_token}` }
        });

        if (!athleteRes.ok) {
            const errText = await athleteRes.text();
            console.error('Failed to fetch athlete:', athleteRes.status, errText);
            return res.status(500).send(`Athlete fetch failed: ${athleteRes.status}. Check SETTINGS:READ scope.`);
        }

        const athleteData = await athleteRes.json();
        const athleteId = athleteData.id || athleteData.athlete?.id;

        if (!athleteId) {
            console.error('Athlete response missing id. Full response:', JSON.stringify(athleteData));
            return res.status(500).send('Athlete ID missing from Intervals response. See server logs.');
        }

        console.log(`Storing token for athlete ${athleteId}`);

        // 3. Save token to Vercel KV keyed by athlete ID
        await kv.set(`intervals_token:${athleteId}`, data.access_token);

        // 4. Set HttpOnly cookie for frontend actions
        res.setHeader(
            'Set-Cookie',
            `intervals_token=${data.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
        );

        return res.send(`
            <html>
                <head><title>Connected</title></head>
                <body>
                    <p>Connected to SunSafeRun successfully as athlete ${athleteId}!</p>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({ type: 'INTERVALS_AUTH_SUCCESS' }, '*');
                            window.close();
                        } else {
                            window.location.href = '/?connected=true';
                        }
                    </script>
                </body>
            </html>
        `);
    } catch (err) {
        console.error('OAuth Callback Error:', err);
        return res.status(500).send('OAuth callback error. See server logs.');
    }
}