const CATCHY_TITLES = [
    'Dodge the Sun ☀️',
    'Shade Chaser ☂️',
    'Burn-Free Run 🏃💨',
    'Outrun the Sun ☀️',
    'Shadow Runner 🥷',
];

/**
 * Generates a 1-step Garmin Workout payload
 * @param {number} distanceMeters - Total route distance in meters
 * @param {string} customTagline - Optional catchy title suffix
 */
export function createSimpleGarminWorkout(distanceMeters, customTagline = null) {
    const roundedKm = (distanceMeters / 1000).toFixed(1);
    const tagline = customTagline || CATCHY_TITLES[0];

    return {
        workoutName: `SunSafe ${roundedKm}K: ${tagline}`,
        sport: 'RUNNING',
        steps: [
            {
                type: 'ExecutableStep',
                stepOrder: 1,
                intensity: 'ACTIVE',
                durationType: 'DISTANCE',
                durationValue: Math.round(distanceMeters),
                targetType: 'NONE',
            },
        ],
    };
}