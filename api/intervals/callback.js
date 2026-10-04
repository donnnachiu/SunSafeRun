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
            return res.send(`<script>window.close();</script>`);
        }

        const data = await tokenResponse.json();

        // Fetch the athlete's ID using their new token
        const athleteRes = await fetch('https://intervals.icu/api/v1/athlete/0', {
            headers: { Authorization: `Bearer ${data.access_token}` }
        });
        const athleteData = await athleteRes.json();
        const athleteId = athleteData.id;

        // Save token to Vercel KV database
        await kv.set(`intervals_token:${athleteId}`, data.access_token);

        // Set HttpOnly cookie for frontend actions
        res.setHeader(
            'Set-Cookie',
            `intervals_token=${data.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
        );

        return res.send(`
            <html>
                <head><title>Connected</title></head>
                <body>
                    <p>Connected to SunSafeRun successfully!</p>
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
        return res.send(`<script>window.close();</script>`);
    }
}