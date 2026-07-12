// routeUtils.js
// Pure geometry helpers for working with a route drawn as an array of
// { lat, lng } points. No React, no map library — easy to unit test.

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Initial compass bearing (forward azimuth) from point A to point B.
 * Returns degrees in [0, 360), where 0 = north, 90 = east, 180 = south, 270 = west.
 * Standard great-circle bearing formula.
 */
export function calculateBearing(a, b) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Great-circle distance between two points in meters (haversine formula).
 */
export function calculateDistance(a, b) {
  const R = 6371000; // Earth radius, meters
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Total length of a route (array of points) in meters. */
export function calculateRouteDistance(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistance(points[i], points[i + 1]);
  }
  return total;
}

/** Midpoint (simple linear average — fine at running-route scale) of a segment. */
export function segmentMidpoint(a, b) {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

/**
 * Smallest angular difference between two compass bearings, in [0, 180].
 * Used to compare "which way the runner is facing" against "which way the sun is".
 */
export function angularDifference(bearingA, bearingB) {
  const diff = Math.abs(bearingA - bearingB) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** Build { a, b, bearing, midpoint, distance } for every consecutive pair of route points. */
export function buildSegments(points) {
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    segments.push({
      id: `${i}`,
      a,
      b,
      bearing: calculateBearing(a, b),
      midpoint: segmentMidpoint(a, b),
      distance: calculateDistance(a, b),
    });
  }
  return segments;
}

/**
 * Destination point given an origin, a compass bearing (degrees) and a
 * distance (meters). Used to place the decorative "sun direction" marker
 * on the map relative to the route's start point.
 */
export function destinationPoint(origin, bearingDeg, distanceMeters) {
  const R = 6371000;
  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);
  const brng = toRad(bearingDeg);
  const dOverR = distanceMeters / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dOverR) + Math.cos(lat1) * Math.sin(dOverR) * Math.cos(brng)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(dOverR) * Math.cos(lat1),
      Math.cos(dOverR) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { lat: toDeg(lat2), lng: ((toDeg(lng2) + 540) % 360) - 180 };
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}
