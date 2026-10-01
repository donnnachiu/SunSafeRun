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
        const tokenResponse = await fetch('https://intervals.icu/api/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: String(code),
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Intervals OAuth Token Error:', errorText);
            return res.redirect('/?error=token_exchange_failed');
        }

        const data = await tokenResponse.json();

        if (data?.access_token) {
            res.setHeader(
                'Set-Cookie',
                `intervals_token=${data.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
            );
        }

        return res.redirect('/?connected=true');
    } catch (err) {
        console.error('OAuth Exchange Error:', err);
        return res.redirect('/?error=oauth_failed');
    }
}