// api/intervals/auth.js
import crypto from 'crypto';

export default function handler(req, res) {
    const clientId = process.env.INTERVALS_CLIENT_ID;
    const redirectUri = process.env.APP_URL
        ? `${process.env.APP_URL}/api/intervals/callback`
        : 'https://sun-safe-run.vercel.app/api/intervals/callback';

    const scope = 'ACTIVITY:WRITE,CALENDAR:WRITE,SETTINGS:READ';
    const state = crypto.randomBytes(16).toString('hex');

    res.setHeader(
        'Set-Cookie',
        `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    );

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        response_type: 'code',
        state,
    });

    return res.redirect(`https://intervals.icu/oauth/authorize?${params.toString()}`);
}