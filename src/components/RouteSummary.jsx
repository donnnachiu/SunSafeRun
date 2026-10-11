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
        <div className="mt-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
            {/* Simple Header with Status Badge */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-lg">Export</h3>

                <div className="relative group flex items-center">
                    {isConnectedToGarmin ? (
                        <span className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-200/60 cursor-help">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Connected
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-200/60 cursor-help">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Not Connected
                        </span>
                    )}

                    {/* Simple Tooltip */}
                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg shadow-lg z-20 pointer-events-none">
                        {isConnectedToGarmin
                            ? 'Intervals.icu account linked to SunSafeRun.'
                            : 'Connect Intervals.icu to sync routes to watch & Strava.'}
                    </div>
                </div>
            </div>

            {!isConnectedToGarmin ? (
                /* Disconnected State: Clean setup button and onboarding link */
                <div className="space-y-3">
                    <p className="text-xs text-gray-600 leading-relaxed">
                        Connect Intervals.icu to automatically sync workouts to your Garmin watch and post UV stats to Strava.
                    </p>

                    <button
                        onClick={handleConnect}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-xl transition-all cursor-pointer text-xs shadow-sm"
                    >
                        Connect Intervals.icu
                    </button>

                    <p className="text-[11px] text-gray-500 text-center">
                        First time? Check that Garmin & Strava are linked in{' '}
                        <a
                            href="https://intervals.icu/settings"
                            target="_blank"
                            rel="noreferrer"
                            className="text-orange-600 underline font-medium hover:text-orange-700"
                        >
                            Intervals Settings
                        </a>.
                    </p>
                </div>
            ) : (
                /* Connected State: Clean Export Action */
                <div className="space-y-3">
                    <button
                        onClick={handleSyncToGarmin}
                        disabled={syncing || !totalDistance || totalDistance <= 0}
                        className="w-full flex items-center justify-center gap-2 bg-[#007CC3] hover:bg-[#00639C] text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 cursor-pointer text-xs shadow-md shadow-blue-500/20"
                    >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
                        </svg>
                        {syncing ? 'Sending to Watch...' : 'Sync to Garmin Watch'}
                    </button>
                </div>
            )}

            {/* Sync Success / Error Notification */}
            {syncStatus === 'success' && (
                <div className="mt-3 p-3.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-900 space-y-2 shadow-sm">
                    <p className="font-bold text-center flex items-center justify-center gap-1.5 text-green-950">
                        <span>✓</span> Sent to Calendar!
                    </p>
                    <p className="text-[11px] text-green-800 leading-relaxed text-center">
                        Open <strong>Garmin Connect</strong> on your phone to send to watch. Your post-run stats will automatically update on Strava.
                    </p>
                    <div className="pt-2 border-t border-green-200/70 text-[10px] text-green-800 text-center">
                        Not seeing it? Make sure <em>Upload planned workouts</em> and <em>Strava</em> are active in{' '}
                        <a
                            href="https://intervals.icu/settings"
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold underline text-green-950"
                        >
                            Intervals Connections
                        </a>.
                    </div>
                </div>
            )}

            {syncStatus === 'error' && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1 shadow-sm">
                    <p className="font-semibold text-red-900 text-center">Failed to sync workout.</p>
                    <p className="text-[11px] text-red-700 text-center">
                        Please check your account setup in{' '}
                        <a
                            href="https://intervals.icu/settings"
                            target="_blank"
                            rel="noreferrer"
                            className="underline font-semibold"
                        >
                            Intervals Settings
                        </a>.
                    </p>
                </div>
            )}

            {/* Exposure Feedback */}
            <ExposureFeedback
                routeId={routeId}
                routeName={routeName}
            />
        </div>
    );
}