// api/feedback.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { routeId, routeName, rating, comment, timestamp } = req.body;
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;

    if (!webhookUrl) {
        console.error('GOOGLE_SHEET_WEBHOOK_URL environment variable is missing.');
        return res.status(500).json({ error: 'Server misconfiguration' });
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                timestamp: timestamp || new Date().toISOString(),
                routeName: routeName || 'Custom Route',
                routeId: routeId || 'N/A',
                rating,
                comment,
            }),
        });

        if (!response.ok) {
            throw new Error(`Google Apps Script responded with HTTP ${response.status}`);
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('Failed to append feedback to Google Sheet:', err);
        return res.status(500).json({ error: 'Failed to record feedback' });
    }
}