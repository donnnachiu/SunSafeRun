import { useState } from 'react';
import { ExposureFeedback } from './ExposureFeedback';

export default function RouteSummary({
                                         totalDistance,
                                         isConnectedToGarmin = false,
                                         routeId = 'route-1',
                                         routeName = 'SunSafeRun Route'
                                     }) {
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null); // 'success' | 'error' | null

    const handleConnect = () => {
        window.location.href = '/api/intervals/auth';
    };

    const handleSyncToGarmin = async () => {
        if (!totalDistance || totalDistance <= 0) return;

        setSyncing(true);
        setSyncStatus(null);

        // Convert km to meters if totalDistance is passed in km
        const distanceMeters = totalDistance < 100 ? totalDistance * 1000 : totalDistance;

        try {
            const response = await fetch('/api/intervals/push-workout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workoutName: routeName,
                    distanceMeters,
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
                /* State 1: Disconnected -> Direct user to OAuth authorization */
                <button
                    onClick={handleConnect}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-md transition-colors cursor-pointer text-xs"
                >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                    </svg>
                    Connect Garmin Account
                </button>
            ) : (
                /* State 2: Connected -> Direct sync to watch */
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

            {syncStatus === 'success' && (
                <p className="mt-2 text-xs text-green-600 font-medium text-center">
                    ✓ Scheduled on Garmin! Select "Run" on watch to start.
                </p>
            )}
            {syncStatus === 'error' && (
                <p className="mt-2 text-xs text-red-500 font-medium text-center">
                    Failed to sync. Make sure Garmin Connect is linked.
                </p>
            )}

            {/* 5-Star Feedback Component */}
            <ExposureFeedback
                routeId={routeId}
                routeName={routeName}
            />
        </div>
    );
}