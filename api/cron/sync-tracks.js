// api/cron/sync-tracks.js
import { Redis } from '@upstash/redis';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const redis = Redis.fromEnv();

// Complete list of all 25 LCSD Sports Grounds in Hong Kong
const VENUE_PDF_MAP = [
    { id: 'aberdeen', name: 'Aberdeen Sports Ground', district: 'HK Island', pdfId: '1' },
    { id: 'causeway_bay', name: 'Causeway Bay Sports Ground', district: 'HK Island', pdfId: '15' },
    { id: 'happy_valley', name: 'Happy Valley Recreation Ground', district: 'HK Island', pdfId: '18' },
    { id: 'wan_chai', name: 'Wan Chai Sports Ground', district: 'HK Island', pdfId: '55' },
    { id: 'hammer_hill', name: 'Hammer Hill Road Sports Ground', district: 'Kowloon', pdfId: '38' },
    { id: 'kowloon_tsai', name: 'Kowloon Tsai Sports Ground', district: 'Kowloon', pdfId: '48' },
    { id: 'sham_shui_po', name: 'Sham Shui Po Sports Ground', district: 'Kowloon', pdfId: '26' },
    { id: 'siu_sai_wan', name: 'Siu Sai Wan Sports Ground', district: 'HK Island', pdfId: '41' },
    { id: 'fanling', name: 'North District Sports Ground', district: 'New Territories', pdfId: '22' },
    { id: 'yuen_long', name: 'Yuen Long Stadium', district: 'New Territories', pdfId: '44' },
    { id: 'tuen_mun', name: 'Tuen Mun Area 16 Sports Ground', district: 'New Territories', pdfId: '39' },
    { id: 'tin_shui_wai', name: 'Tin Shui Wai Sports Ground', district: 'New Territories', pdfId: '58' },
    { id: 'tai_po', name: 'Tai Po Sports Ground', district: 'New Territories', pdfId: '31' },
    { id: 'sha_tin', name: 'Sha Tin Sports Ground', district: 'New Territories', pdfId: '33' },
    { id: 'ma_on_shan', name: 'Ma On Shan Sports Ground', district: 'New Territories', pdfId: '56' },
    { id: 'sai_kung', name: 'Sai Kung Tang Shiu Kin Sports Ground', district: 'New Territories', pdfId: '28' },
    { id: 'kwai_chung', name: 'Kwai Chung Sports Ground', district: 'New Territories', pdfId: '12' },
    { id: 'tsing_yi', name: 'Tsing Yi Sports Ground', district: 'New Territories', pdfId: '52' },
    { id: 'tseung_kwan_o', name: 'Tseung Kwan O Sports Ground', district: 'New Territories', pdfId: '35' },
    { id: 'choi_yuen_road', name: 'Choi Yuen Road Sports Ground', district: 'New Territories', pdfId: '60' },
    { id: 'hau_tak', name: 'Hau Tak Sports Ground', district: 'New Territories', pdfId: '61' },
    { id: 'tai_tung', name: 'Tai Tung Sports Ground', district: 'New Territories', pdfId: '62' },
    { id: 'tsuen_wan', name: 'Tsuen Wan Syndicate Ground', district: 'New Territories', pdfId: '51' },
    { id: 'Yuen_long_muni', name: 'Lau Fau Shan Ground', district: 'New Territories', pdfId: '45' },
    { id: 'peng_chau', name: 'Outlying Islands Track', district: 'New Territories', pdfId: '64' }
];

export default async function handler(req, res) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dateStr = now.toISOString().split('T')[0];

    const results = [];

    try {
        // Safely load pdf-parse worker and parser modules to prevent DOMMatrix crash
        const { CanvasFactory } = require('pdf-parse/worker');
        const { PDFParse } = require('pdf-parse');

        for (const venue of VENUE_PDF_MAP) {
            const pdfUrl = `https://www.lcsd.gov.hk/file_upload_clpss/leisure_facilities/lsb/jogging/${venue.pdfId}_${year}${month}.pdf`;

            try {
                const response = await fetch(pdfUrl);
                if (!response.ok) {
                    results.push({ venue: venue.id, status: 'skipped', reason: 'PDF not published' });
                    continue;
                }

                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // Initialize parser with the serverless CanvasFactory to avoid DOMMatrix error
                const parser = new PDFParse({ data: new Uint8Array(buffer), CanvasFactory });
                const pdfData = await parser.getText();

                const slots = parseLcsdPdfText(pdfData.text, now.getDate());

                const storageKey = `track:${venue.id}:${dateStr}`;
                await redis.set(storageKey, {
                    venueId: venue.id,
                    name: venue.name,
                    district: venue.district,
                    date: dateStr,
                    slots: slots
                }, { ex: 60 * 60 * 24 * 30 }); // 30 days retention

                results.push({ venue: venue.id, status: 'synced' });
            } catch (err) {
                results.push({ venue: venue.id, status: 'error', message: err.message });
            }
        }

        return res.status(200).json({ success: true, totalVenues: VENUE_PDF_MAP.length, results });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

function parseLcsdPdfText(text, currentDay) {
    const defaultTimes = [
        '06:30 - 07:00', '07:00 - 07:30', '07:30 - 08:00', '08:00 - 08:30',
        '08:30 - 09:00', '09:00 - 09:30', '09:30 - 10:00', '10:00 - 10:30',
        '10:30 - 11:00', '11:00 - 11:30', '11:30 - 12:00', '12:00 - 12:30',
        '12:30 - 13:00', '13:00 - 13:30', '13:30 - 14:00', '14:00 - 14:30',
        '14:30 - 15:00', '15:00 - 15:30', '15:30 - 16:00', '16:00 - 16:30',
        '16:30 - 17:00', '17:00 - 17:30', '17:30 - 18:00', '18:00 - 18:30',
        '18:30 - 19:00', '19:00 - 19:30', '19:30 - 20:00', '20:00 - 20:30',
        '20:30 - 21:00', '21:00 - 21:30', '21:30 - 22:00', '22:00 - 22:30'
    ];

    return defaultTimes.map((time) => {
        let status = 'open';
        if (text && text.includes(`Day ${currentDay}`) && text.includes(' L ')) {
            status = 'partial'; // Outer lanes only (Yellow 🟡)
        } else if (text && text.includes(`Day ${currentDay}`) && text.includes(' X ')) {
            status = 'closed'; // Fully closed (Red 🔴)
        }
        return { time, status };
    });
}