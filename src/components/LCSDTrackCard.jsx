// src/components/LCSDTrackCard.jsx
import { useState, useEffect } from 'react';
import { LCSD_TRACKS } from '../constants/lcsdTracks';

export function LCSDTrackCard() {
    const [selectedTrack, setSelectedTrack] = useState('causeway_bay');
    const [dayOffset, setDayOffset] = useState('today'); // 'today' | 'tomorrow'
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(false);

    const districts = ['HK Island', 'Kowloon', 'New Territories'];

    // Compute ISO YYYY-MM-DD
    const getTargetDate = (offset) => {
        const d = new Date();
        if (offset === 'tomorrow') d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    };

    const targetDateStr = getTargetDate(dayOffset);

    useEffect(() => {
        setLoading(true);

        // Calls your Vercel serverless API route (/api/tracks.js)
        fetch(`/api/tracks?venueId=${selectedTrack}&date=${targetDateStr}`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Schedule not found in database');
                }
                return res.json();
            })
            .then((data) => {
                setSchedule(data);
                setLoading(false);
            })
            .catch((err) => {
                console.warn('API notice:', err.message);
                // If data isn't in KV yet, show null (or a clean empty state) instead of fake mock data
                setSchedule(null);
                setLoading(false);
            });
    }, [selectedTrack, dayOffset, targetDateStr]);

    return (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-800 dark:text-slate-100 shadow-xl max-w-sm">
            {/* Card Header & Day Toggle */}
            <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          🏟️ LCSD Track Availability
        </span>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={() => setDayOffset('today')}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            dayOffset === 'today'
                                ? 'bg-blue-600 text-white shadow-sm font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        onClick={() => setDayOffset('tomorrow')}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            dayOffset === 'tomorrow'
                                ? 'bg-blue-600 text-white shadow-sm font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Tomorrow
                    </button>
                </div>
            </div>

            {/* Track Dropdown */}
            <div className="mb-3">
                <select
                    value={selectedTrack}
                    onChange={(e) => setSelectedTrack(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                    {districts.map((district) => (
                        <optgroup key={district} label={district}>
                            {LCSD_TRACKS.filter((t) => t.district === district).map((track) => (
                                <option key={track.id} value={track.id}>
                                    {track.name}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            {/* Timetable Session Slots */}
            {loading ? (
                <div className="text-center py-6 text-xs text-slate-400 animate-pulse">
                    Loading track timetable...
                </div>
            ) : schedule && schedule.slots ? (
                <div className="space-y-1.5">
                    {schedule.slots.map((slot, index) => (
                        <div
                            key={index}
                            className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60"
                        >
              <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                {slot.time}
              </span>

                            {/* Minimalist Icon-Only Badges */}
                            {slot.isOpen ? (
                                <span className="px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  🟢
                </span>
                            ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-xs bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  🔴
                </span>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                    No schedule synced in database for this date yet.
                </div>
            )}
        </div>
    );
}