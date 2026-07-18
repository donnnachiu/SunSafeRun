// sunscreenModel.js
// A deliberately simple, transparent heuristic for roughly how long a
// given SPF holds up before reapplication is worth considering, given the
// forecast UV index over the course of a run. This is NOT medical or
// dermatological advice — individual skin tone/sensitivity varies a lot,
// and this is meant purely as a planning nudge.

// Rule-of-thumb baseline: unprotected medium skin (Fitzpatrick III) starts
// to burn in roughly 200 "UV-index-minutes" — i.e. ~200 min at UV index 1,
// ~20 min at UV index 10. This ballpark figure is widely used by consumer
// UV calculators as a starting point.
const BASELINE_MINUTES_AT_UV1 = 200;

// Running means sweating, which degrades sunscreen film faster than the
// SPF number alone implies.
const SWEAT_DERATING = 0.7;

// The naive "SPF x burn time" formula produces huge numbers (SPF30 implies
// ~30x longer, i.e. many hours) that don't match real-world advice, because
// sweat, under-application, and friction erode a sunscreen's film well
// before the theoretical number. Rather than one flat cap (which swallowed
// almost every realistic SPF/UV combination and made the estimate look
// frozen), the ceiling here scales down as UV climbs — reflecting that
// higher UV both burns faster *and* means more sweat, more wiped-off
// product, and less margin for error — and scales up modestly with SPF
// tier, so a genuinely stronger sunscreen still reads as lasting longer.
const ABSOLUTE_MAX_MINUTES = 150; // ~2.5h hard sanity ceiling, rarely hit
const MIN_CEILING_MINUTES = 45;
const MAX_CEILING_MINUTES = 150;

/** Practical ceiling before sweat/reapplication risk dominates, before SPF tier is applied. */
function uvCeilingMinutes(uvIndex) {
  const uv = Math.max(uvIndex, 0);
  const raw = 155 - uv * 9; // UV 0 -> ~155, UV 5 -> 110, UV 8 -> ~83, UV 11 -> ~56
  return Math.min(MAX_CEILING_MINUTES, Math.max(MIN_CEILING_MINUTES, raw));
}

/** Modest SPF-tier bump — a stronger sunscreen still reads as lasting a bit longer. */
function spfCeilingMultiplier(spf) {
  if (spf < 15) return 0.85;
  if (spf < 30) return 1.0;
  if (spf < 50) return 1.1;
  return 1.2;
}

/** Minutes until unprotected medium skin would start to burn at this UV index. */
export function minutesToBurnUnprotected(uvIndex) {
  const uv = Math.max(uvIndex, 0.3); // guard against dividing by ~0 near dawn/dusk
  return BASELINE_MINUTES_AT_UV1 / uv;
}

/** The naive, uncapped "SPF x unprotected burn time" figure — informational only, not what's shown as the headline. */
export function theoreticalMinutes(uvIndex, spf) {
  if (!spf || spf <= 0) return null;
  return minutesToBurnUnprotected(uvIndex) * spf * SWEAT_DERATING;
}

/** Estimated minutes an SPF holds up while running at a given UV index, or null if no SPF given. */
export function protectedMinutes(uvIndex, spf) {
  const theoretical = theoreticalMinutes(uvIndex, spf);
  if (theoretical === null) return null;
  const ceiling = uvCeilingMinutes(uvIndex) * spfCeilingMultiplier(spf);
  return Math.min(theoretical, ceiling, ABSOLUTE_MAX_MINUTES);
}

/**
 * Walks a run from startHour for durationMinutes, re-checking the forecast
 * UV index every `stepMinutes`, and returns a list of clock times when
 * reapplication is worth doing (the first entry is always the initial
 * application at the start of the run).
 *
 * getUVAtHour: (fractionalHour) => uvIndex
 */
export function buildReapplySchedule({ startHour, durationMinutes, spf, getUVAtHour, stepMinutes = 5 }) {
  if (!spf || spf <= 0 || !durationMinutes || durationMinutes <= 0) return [];

  const events = [{ type: 'apply', hour: startHour, uvIndex: getUVAtHour(startHour) }];
  const endHour = startHour + durationMinutes / 60;

  let sinceApply = 0;
  let clock = startHour;

  // Cap iterations defensively so a bad input can't spin forever.
  for (let i = 0; i < 400 && clock < endHour; i++) {
    const uv = getUVAtHour(clock);
    const limit = protectedMinutes(uv, spf) ?? ABSOLUTE_MAX_MINUTES;
    sinceApply += stepMinutes;
    clock += stepMinutes / 60;

    if (sinceApply >= limit && clock < endHour) {
      events.push({ type: 'reapply', hour: clock, uvIndex: getUVAtHour(clock) });
      sinceApply = 0;
    }
  }

  return events;
}

/** Rough default run duration from route distance, assuming an easy ~6 min/km pace. */
export function estimateDurationMinutes(totalDistanceMeters) {
  if (!totalDistanceMeters || totalDistanceMeters <= 0) return null;
  return Math.round((totalDistanceMeters / 1000) * 6);
}
