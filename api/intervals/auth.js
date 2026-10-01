// api/intervals/auth.js
export default function handler(req, res) {
    const clientId = process.env.INTERVALS_CLIENT_ID;

    if (!clientId || clientId === 'undefined') {
        console.error('Missing INTERVALS_CLIENT_ID environment variable.');
        return res.status(500).json({
            error: 'Server misconfiguration: INTERVALS_CLIENT_ID is missing.'
        });
    }

    const redirectUri = 'https://sun-safe-run.vercel.app/api/intervals/callback';
    const scope = 'CALENDAR:WRITE,ACTIVITY:WRITE';

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scope,
        response_type: 'code',
    });

    const authUrl = `https://intervals.icu/oauth/authorize?${params.toString()}`;

    res.redirect(authUrl);
}