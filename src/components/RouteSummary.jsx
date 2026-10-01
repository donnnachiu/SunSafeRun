import { useState } from 'react';
import { createSimpleGarminWorkout } from '../utils/garminWorkout';
import { ExposureFeedback } from './ExposureFeedback';

export default function RouteSummary({
                                         totalDistance,
                                         isConnectedToGarmin = true,
                                         routeId = 'route-1',
                                         routeName = 'SunSafeRun Route'
                                     }) {
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null); // 'success' | 'error' | null

    const handleSyncToGarmin = async () => {
        if (!totalDistance || totalDistance <= 0) return;

        setSyncing(true);
        setSyncStatus(null);

        // Convert km to meters if totalDistance is passed in km
        const distanceMeters = totalDistance < 100 ? totalDistance * 1000 : totalDistance;
        const workoutData = createSimpleGarminWorkout(distanceMeters, 'Dodge the Sun ☀️');

        try {
            const response = await fetch('/api/garmin/push-workout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workout: workoutData,
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

            <button
                onClick={handleSyncToGarmin}
                disabled={syncing || !totalDistance || !isConnectedToGarmin}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-[#007CC3] hover:bg-[#00639C] text-white font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-50 cursor-pointer text-xs"
            >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
                {syncing ? 'Sending to Garmin...' : 'Sync to Garmin Watch'}
            </button>

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