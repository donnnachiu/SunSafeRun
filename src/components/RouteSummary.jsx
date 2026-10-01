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

        // Save current route points and time slider selection before page unload
        if (routePoints && routePoints.length > 0) {
            localStorage.setItem('sunsaferun_route_points', JSON.stringify(routePoints));
        }
        if (hour !== undefined && hour !== null) {
            localStorage.setItem('sunsaferun_hour', JSON.stringify(hour));
        }

        // Redirect to OAuth
        window.location.href = '/api/intervals/auth';
    };

    const handleSyncToGarmin = async () => {
        if (!totalDistance || totalDistance <= 0) return;

        setSyncing(true);
        setSyncStatus(null);

        // Convert km to meters if totalDistance is passed in km
        const distanceMeters = totalDistance < 100 ? totalDistance * 1000 : totalDistance;

        // Extract exposure & UV metrics
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
                    scheduledDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
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
        <div className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Export Route</h3>

            {!isConnectedToGarmin ? (
                /* Disconnected State: Clear onboarding instructions */
                <div className="mt-3 space-y-3">
                    <div className="p-3 bg-amber-50/80 border border-amber-200/60 rounded-lg text-xs text-amber-900 leading-relaxed">
                        <p className="font-semibold text-amber-950 mb-1 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 fill-current text-amber-600 shrink-0" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            Syncing to Garmin Watch
                        </p>
                        <p className="mb-2 text-[11px] text-amber-800">
                            SunSafeRun pushes workouts to Garmin via <strong>Intervals.icu</strong>.
                        </p>
                        <ol className="list-decimal pl-4 space-y-1 text-[11px] text-amber-800">
                            <li>
                                Create or log in to{' '}
                                <a
                                    href="https://intervals.icu/settings"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium underline hover:text-amber-950"
                                >
                                    Intervals.icu Settings
                                </a>{' '}
                                and ensure Garmin Connect is linked with <em>Upload planned workouts</em> turned ON.
                            </li>
                            <li>Sign in below to authorize SunSafeRun.</li>
                        </ol>
                    </div>

                    <button
                        onClick={handleConnect}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-md transition-colors cursor-pointer text-xs"
                    >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                        </svg>
                        Sign In / Register to Sync Garmin
                    </button>
                </div>
            ) : (
                /* Connected State: 1-click sync */
                <button
                    onClick={handleSyncToGarmin}
                    disabled={syncing || !totalDistance || totalDistance <= 0}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-[#007CC3] hover:bg-[#00639C] text-white font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-50 cursor-pointer text-xs"
                >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
                    </svg>
                    {syncing ? 'Sending to Garmin...' : 'Sync to Garmin Watch'}
                </button>
            )}

            {/* Sync Notifications */}
            {syncStatus === 'success' && (
                <div className="mt-3 p-2.5 bg-green-50 border border-green-200 rounded-md text-xs text-green-800 text-center">
                    ✓ Scheduled on Garmin! Select "Run" on watch to start.
                </div>
            )}
            {syncStatus === 'error' && (
                <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 space-y-1">
                    <p className="font-semibold text-red-900 text-center">Failed to sync to Garmin.</p>
                    <p className="text-[11px] text-red-700 text-center">
                        Make sure Garmin Connect is linked in your Intervals.icu settings.
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

            {/* 5-Star Feedback Component */}
            <ExposureFeedback
                routeId={routeId}
                routeName={routeName}
            />
        </div>
    );
}