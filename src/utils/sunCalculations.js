// sunCalculations.js
// Wraps `suncalc` and turns raw sun geometry + weather data into a runner-facing
// "exposure score" and danger tier for a single route segment.

import SunCalc from 'suncalc';
import { angularDifference } from './routeUtils';

/**
 * suncalc.getPosition() returns azimuth in RADIANS measured from *south*,
 * increasing clockwise towards west (astronomical convention). Everywhere
 * else in this app we work in standard compass bearings (0=N, 90=E, 180=S,
 * 270=W, clockwise), so we convert once, here, and never touch raw suncalc
 * azimuth again.
 */
export function toCompassAzimuth(sunAzimuthRadians) {
  const deg = (sunAzimuthRadians * 180) / Math.PI;
  return (deg + 180 + 360) % 360;
}

/**
 * Sun position for a given date/time and location, in app-friendly units.
 * altitude: degrees above horizon (negative = below horizon / not risen)
 * azimuth: compass bearing towards the sun (0-360, 0 = north)
 */
export function getSunPosition(date, lat, lng) {
  const { altitude, azimuth } = SunCalc.getPosition(date, lat, lng);
  return {
    altitudeDeg: (altitude * 180) / Math.PI,
    azimuthDeg: toCompassAzimuth(azimuth),
  };
}

export function getSunTimes(date, lat, lng) {
  return SunCalc.getTimes(date, lat, lng);
}

/**
 * How directly the runner is heading into the sun, as a multiplier.
 * diff ~0   -> running straight at the sun (glare + face/neck exposure) -> 1.3
 * diff ~90  -> sun off to the side -> ~1.0
 * diff ~180 -> sun at the runner's back -> 0.7 (still exposed on shoulders/back,
 *              just less glare-driven risk)
 */
export function facingMultiplier(routeBearing, sunAzimuthDeg) {
  const diff = angularDifference(routeBearing, sunAzimuthDeg); // 0..180
  const t = diff / 180; // 0 = facing sun, 1 = sun behind
  return 1.3 - 0.6 * t;
}

/** Clouds attenuate but never fully block UV — heavy overcast still passes ~30-40%. */
export function cloudAttenuation(cloudCoverPct) {
  const cover = Math.min(Math.max(cloudCoverPct, 0), 100) / 100;
  return 1 - cover * 0.65;
}

/** Higher sun = more overhead, direct UV; low sun near the horizon is weaker but glarier. */
export function altitudeFactor(altitudeDeg) {
  if (altitudeDeg <= 0) return 0;
  return Math.min(altitudeDeg / 60, 1); // saturate once the sun is reasonably high
}

const THRESHOLDS = { moderate: 3.0, high: 6.0 };

/**
 * Combine sun geometry + weather into a single 0-danger score and a tier.
 * This is a deliberately simple, transparent heuristic (not a dosimetry model) —
 * it's meant to help a runner choose a route/time, not to give a medical exposure dose.
 */
export function computeExposure({ uvIndex, cloudCoverPct, sunAltitudeDeg, sunAzimuthDeg, routeBearing }) {
  if (sunAltitudeDeg <= 0 || uvIndex <= 0) {
    return { score: 0, level: 'low', facing: 1, sunBelowHorizon: true };
  }

  const facing = facingMultiplier(routeBearing, sunAzimuthDeg);
  const cloud = cloudAttenuation(cloudCoverPct);
  const alt = altitudeFactor(sunAltitudeDeg);

  const score = uvIndex * cloud * (0.45 + 0.55 * alt) * facing;

  let level = 'low';
  if (score >= THRESHOLDS.high) level = 'high';
  else if (score >= THRESHOLDS.moderate) level = 'moderate';

  return { score, level, facing, sunBelowHorizon: false };
}

export const EXPOSURE_COLORS = {
  low: '#4C9A6A',
  moderate: '#E8B93A',
  high: '#D64545',
};

export const EXPOSURE_LABELS = {
  low: 'Low exposure',
  moderate: 'Moderate exposure',
  high: 'High exposure',
};
