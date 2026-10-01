// api/intervals/callback.js
export default async function handler(req, res) {
    const { code } = req.query;
    const clientId = process.env.INTERVALS_CLIENT_ID;
    const clientSecret = process.env.INTERVALS_CLIENT_SECRET;
    const redirectUri = process.env.APP_URL
        ? `${process.env.APP_URL}/api/intervals/callback`
        : 'https://sun-safe-run.vercel.app/api/intervals/callback';

    if (!code) {
        return res.redirect('/?error=no_code_provided');
    }

    try {
        // Base64 encode client credentials for Basic Auth
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const tokenResponse = await fetch('https://intervals.icu/api/v1/oauth/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: String(code),
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Intervals OAuth Token Error:', errorText);
            return res.redirect('/?error=token_exchange_failed');
        }

        const data = await tokenResponse.json();

        // Set secure HTTP-only cookie with access_token
        if (data.access_token) {
            res.setHeader(
                'Set-Cookie',
                `intervals_token=${data.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
            );
        }

        res.redirect('/?connected=true');
    } catch (err) {
        console.error('OAuth Exchange Error:', err);
        res.redirect('/?error=oauth_failed');
    }
}