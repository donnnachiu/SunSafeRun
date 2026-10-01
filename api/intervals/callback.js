// api/intervals/callback.js
export default async function handler(req, res) {
    const { code } = req.query;
    const clientId = process.env.INTERVALS_CLIENT_ID;
    const clientSecret = process.env.INTERVALS_CLIENT_SECRET;
    const redirectUri = process.env.APP_URL
        ? `${process.env.APP_URL}/api/intervals/callback`
        : 'https://sun-safe-run.vercel.app/api/intervals/callback';

    if (!code) {
        return res.send(`
            <script>
                if (window.opener) {
                    window.opener.postMessage({ type: 'INTERVALS_AUTH_ERROR', error: 'no_code' }, '*');
                    window.close();
                } else {
                    window.location.href = '/?error=no_code';
                }
            </script>
        `);
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
            return res.send(`
                <script>
                    if (window.opener) {
                        window.opener.postMessage({ type: 'INTERVALS_AUTH_ERROR', error: 'token_exchange_failed' }, '*');
                        window.close();
                    } else {
                        window.location.href = '/?error=token_exchange_failed';
                    }
                </script>
            `);
        }

        const data = await tokenResponse.json();

        if (data?.access_token) {
            res.setHeader(
                'Set-Cookie',
                `intervals_token=${data.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
            );
        }

        // Send success message to parent window and close popup
        return res.send(`
            <html>
                <body>
                    <p>Connecting to SunSafeRun...</p>
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
        return res.send(`
            <script>
                if (window.opener) {
                    window.opener.postMessage({ type: 'INTERVALS_AUTH_ERROR', error: 'oauth_failed' }, '*');
                    window.close();
                } else {
                    window.location.href = '/?error=oauth_failed';
                }
            </script>
        `);
    }
}