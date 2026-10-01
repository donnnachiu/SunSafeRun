// api/intervals/auth.js
export default function handler(req, res) {
    const clientId = process.env.INTERVALS_CLIENT_ID;
    const redirectUri = encodeURIComponent('https://sun-safe-run.vercel.app/api/intervals/callback');
    const scope = 'calendar:write,activity:write';

    const authUrl = `https://intervals.icu/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;

    res.redirect(authUrl);
}