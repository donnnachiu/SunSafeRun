// api/intervals/auth.js
export default function handler(req, res) {
    const clientId = process.env.INTERVALS_CLIENT_ID;

    // Check if INTERVALS_CLIENT_ID is defined
    if (!clientId || clientId === 'undefined') {
        console.error('Missing INTERVALS_CLIENT_ID environment variable.');
        return res.status(500).json({
            error: 'Server misconfiguration: INTERVALS_CLIENT_ID is missing.'
        });
    }

    const redirectUri = encodeURIComponent('https://sun-safe-run.vercel.app/api/intervals/callback');
    const scope = 'calendar:write,activity:write';

    const authUrl = `https://intervals.icu/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;

    res.redirect(authUrl);
}