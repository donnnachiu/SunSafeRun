// api/intervals/callback.js
export default async function handler(req, res) {
    const { code } = req.query;
    const clientId = process.env.INTERVALS_CLIENT_ID;
    const clientSecret = process.env.INTERVALS_CLIENT_SECRET;

    try {
        const tokenResponse = await fetch('https://intervals.icu/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: 'authorization_code',
            }),
        });

        const data = await tokenResponse.json();
        // Save data.access_token and data.athlete.id securely (or return to client session)

        res.redirect('/?connected=true');
    } catch (err) {
        console.error('OAuth Exchange Error:', err);
        res.redirect('/?error=oauth_failed');
    }
}