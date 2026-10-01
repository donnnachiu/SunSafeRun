// src/utils/shadowEngine.js

/**
 * Computes 2D ground shadow polygon projected from building footprint relative to sun angle.
 * Accepts either a Date object OR a fractional hour (e.g., 14.75).
 */
export function calculateBuildingShadow(
    building,
    centerLat = 22.3027,
    centerLng = 114.1609,
    timeOrDate = new Date()
) {
    // 1. Fallback guard if null/NaN/undefined is passed in
    const lat = (typeof centerLat === 'number' && !isNaN(centerLat)) ? centerLat : 22.3027;
    const lng = (typeof centerLng === 'number' && !isNaN(centerLng)) ? centerLng : 114.1609;

    // 2. Convert fractional hour to JS Date if needed
    const targetDate = typeof timeOrDate === 'number'
        ? getSimulatedDate(timeOrDate)
        : (timeOrDate || new Date());

    const sunPos = SunCalc.getPosition(targetDate, lat, lng);
    const altitude = sunPos.altitude; // in radians
    const azimuth = sunPos.azimuth;   // in radians (0 = South)

    // No shadow at night or when sun is below horizon
    if (altitude <= 0) return null;

    const shadowLengthRatio = 1 / Math.tan(altitude);

    // Correct offset conversions (1 deg lat ~= 111,000m, 1 deg lng ~= 111,000m * cos(lat))
    const latMetersRatio = 111000;
    const lngMetersRatio = 111000 * Math.cos((lat * Math.PI) / 180);

    const shadowLengthMeters = building.height * shadowLengthRatio;

    // Azimuth in SunCalc: 0 is South, positive is West, negative is East
    const shadowDy = (shadowLengthMeters * Math.cos(azimuth)) / latMetersRatio;
    const shadowDx = (shadowLengthMeters * Math.sin(azimuth)) / lngMetersRatio;

    const shadowPolygon = [];

    // Building footprint base
    building.coords.forEach(([bLat, bLng]) => {
        shadowPolygon.push([bLat, bLng]);
    });

    // Projected roof points (offset relative to sun)
    building.coords.slice().reverse().forEach(([bLat, bLng]) => {
        shadowPolygon.push([bLat + shadowDy, bLng + shadowDx]);
    });

    return shadowPolygon;
}