import { useState } from 'react';
import { ExposureFeedback } from './ExposureFeedback';

export default function RouteSummary({
                                         totalDistance,
                                         reading,
                                         summary,
                                         isConnectedToGarmin = false,
                                         routeId = 'route-1',
                                         routeName = 'SunSafeRun Route',
                                         routePoints = [],
                                         hour,
                                         onConnect
                                     }) {
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null); // 'success' | 'error' | null

    const handleConnect = () => {
        if (onConnect) {
            onConnect();
            return;
        }

        // Save current route state before OAuth redirect
        if (routePoints && routePoints.length > 0) {
            localStorage.setItem('sunsaferun_route_points', JSON.stringify(routePoints));
        }
        if (hour !== undefined && hour !== null) {
            localStorage.setItem('sunsaferun_hour', JSON.stringify(hour));
        }

        window.location.href = '/api/intervals/auth';
    };

    const handleSyncToGarmin = async () => {
        if (!totalDistance || totalDistance <= 0) return;

        setSyncing(true);
        setSyncStatus(null);

        const distanceMeters = totalDistance < 100 ? totalDistance * 1000 : totalDistance;

        const lowMeters = summary?.low ?? 0;
        const totalMeters = summary?.totalMeters || distanceMeters;
        const shadePct = totalMeters > 0 ? (lowMeters / totalMeters) * 100 : 0;
        const uvIndex = reading?.uvIndex ?? 0;

        try {
            const response = await fetch('/api/garmin/push-workout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workoutName: routeName,
                    distanceMeters,
                    shadePct,
                    lowExposureMeters: lowMeters,
                    uvIndex,
                    scheduledDate: new Date().toISOString().split('T')[0],
                }),
            });

            if (!response.ok) throw new Error('Sync failed');

            setSyncStatus('success');
        } catch (err) {
            console.error('Garmin Sync Error:', err);
            setSyncStatus('error');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="mt-4 p-5 bg-white rounded-2xl shadow-sm border border-orange-100">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-base">Export to Watch & Strava</h3>
                <span className="text-[11px] font-medium bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                    Automatic Sync Loop
                </span>
            </div>

            {!isConnectedToGarmin ? (
                /* Disconnected State: Clear Multi-App Setup Guide */
                <div className="space-y-3.5">
                    <div className="p-3.5 bg-orange-50/70 border border-orange-200/60 rounded-xl text-xs text-orange-950 leading-relaxed">
                        <p className="font-bold text-orange-900 mb-1.5 flex items-center gap-1.5">
                            <span className="text-sm">🛡️</span> One-Time Account Setup
                        </p>
                        <p className="text-[11px] text-orange-900/90 mb-2.5">
                            SunSafeRun automatically pushes workouts to your watch and syncs your UV savings stats directly to Strava via <strong>Intervals.icu</strong>.
                        </p>

                        <div className="p-2.5 bg-white/80 rounded-lg border border-orange-200/50 text-[11px] space-y-2">
                            <p className="font-semibold text-gray-900">📋 Follow these quick steps:</p>
                            <ol className="list-decimal pl-4 text-gray-700 space-y-1.5">
                                <li>
                                    Log in or register at{' '}
                                    <a
                                        href="https://intervals.icu/settings"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-semibold underline text-orange-600 hover:text-orange-700"
                                    >
                                        Intervals.icu Settings
                                    </a>.
                                </li>
                                <li>
                                    Go to the <strong className="text-gray-900">CONNECTIONS</strong> tab to connect your <strong>Garmin</strong> (enable <em className="text-gray-900">"Upload planned workouts"</em>) and your <strong>Strava</strong> account (standard free connect).
                                </li>
                                <li>Return here and authorize SunSafeRun below.</li>
                            </ol>
                        </div>
                    </div>

                    <button
                        onClick={handleConnect}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md shadow-orange-600/20 text-xs cursor-pointer"
                    >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
                        </svg>
                        Connect Intervals.icu to Get Started
                    </button>
                </div>
            ) : (
                /* Connected State: Sync Action & Health Check */
                <div className="space-y-3">
                    <div className="p-3 bg-blue-50/80 border border-blue-200/70 rounded-xl text-[11px] text-blue-900 flex items-start gap-2.5">
                        <span className="text-blue-600 text-base shrink-0 pt-0.5">💡</span>
                        <div className="space-y-1">
                            <p className="font-semibold text-blue-950">Seamless Post-Run Sync Active</p>
                            <p className="text-blue-800 leading-relaxed">
                                Once finished, your run stats and UV protection breakdown will automatically update on Intervals.icu and mirror over to <strong>Strava</strong>. Ensure{' '}
                                <a
                                    href="https://intervals.icu/settings"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold underline text-blue-950 hover:text-blue-700"
                                >
                                    Intervals CONNECTIONS
                                </a>{' '}
                                has planned workouts and Strava linked.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleSyncToGarmin}
                        disabled={syncing || !totalDistance || totalDistance <= 0}
                        className="w-full flex items-center justify-center gap-2 bg-[#007CC3] hover:bg-[#00639C] text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 cursor-pointer text-xs shadow-md shadow-blue-500/20"
                    >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
                        </svg>
                        {syncing ? 'Sending to Garmin...' : 'Sync to Garmin Watch'}
                    </button>
                </div>
            )}

            {/* Sync Status Notifications */}
            {syncStatus === 'success' && (
                <div className="mt-3 p-3.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 space-y-1.5 shadow-sm">
                    <p className="font-bold text-green-900 text-center flex items-center justify-center gap-1.5">
                        <span>✓</span> Route Sent to Intervals.icu Calendar!
                    </p>
                    <p className="text-[11px] text-green-800 leading-relaxed text-center">
                        Open your phone's <strong>Garmin Connect app</strong> to sync to your watch. After your run, your UV savings stats will automatically appear on Strava!
                    </p>
                </div>
            )}

            {syncStatus === 'error' && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1 shadow-sm">
                    <p className="font-semibold text-red-900 text-center">Failed to sync workout.</p>
                    <p className="text-[11px] text-red-700 text-center">
                        Please check your account connection in Intervals.icu settings.
                    </p>
                    <div className="text-center pt-1">
                        <a
                            href="https://intervals.icu/settings"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block text-xs text-[#007CC3] underline font-medium hover:text-[#00639C]"
                        >
                            Open Intervals.icu Settings →
                        </a>
                    </div>
                </div>
            )}

            {/* Feedback Component */}
            <ExposureFeedback
                routeId={routeId}
                routeName={routeName}
            />
        </div>
    );
}