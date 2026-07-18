import { useMemo } from 'react';
import { classifyRain, RAIN_COLORS } from '../utils/rainModel';
import { formatHour } from './SunArcSlider';

// Matches SunArcSlider's time range so the two stay visually consistent.
const MIN_HOUR = 5;
const MAX_HOUR = 20;

const VIEW_W = 400;
const VIEW_H = 108;
const PAD_L = 4;
const PAD_R = 4;
const PAD_T = 10;
const PAD_B = 20;

function hourToX(hour) {
  const t = (hour - MIN_HOUR) / (MAX_HOUR - MIN_HOUR);
  return PAD_L + t * (VIEW_W - PAD_L - PAD_R);
}

const HOUR_TICKS = [5, 8, 11, 14, 17, 20];

export default function RainChart({ hourly, currentHour }) {
  const points = useMemo(() => {
    return hourly
      .filter((h) => h.hour >= MIN_HOUR && h.hour <= MAX_HOUR)
      .sort((a, b) => a.hour - b.hour)
      .map((h) => ({
        hour: h.hour,
        precipMm: h.precipMm ?? 0,
        rainProbabilityPct: h.rainProbabilityPct ?? 0,
        level: classifyRain({ rainProbabilityPct: h.rainProbabilityPct, precipMm: h.precipMm }),
      }));
  }, [hourly]);

  if (points.length === 0) {
    return <p className="text-xs text-muted">No precipitation forecast available yet.</p>;
  }

  // A 1mm floor keeps a mostly-dry day from looking like a dramatic
  // mountain range — the scale only zooms in once rain is actually
  // forecast in meaningful amounts.
  const maxPrecip = Math.max(1, ...points.map((p) => p.precipMm));
  const chartTop = PAD_T;
  const chartBottom = VIEW_H - PAD_B;
  const chartH = chartBottom - chartTop;
  const valueToY = (v) => chartBottom - (Math.min(v, maxPrecip) / maxPrecip) * chartH;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${hourToX(p.hour).toFixed(1)} ${valueToY(p.precipMm).toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${hourToX(points[points.length - 1].hour).toFixed(1)} ${chartBottom} L ${hourToX(
    points[0].hour
  ).toFixed(1)} ${chartBottom} Z`;

  const clampedHour = Math.min(Math.max(currentHour, MIN_HOUR), MAX_HOUR);
  const nowX = hourToX(clampedHour);
  const nowPoint = points.reduce(
    (closest, p) => (Math.abs(p.hour - currentHour) < Math.abs(closest.hour - currentHour) ? p : closest),
    points[0]
  );

  return (
    <div>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-28" preserveAspectRatio="none">
        {/* Rain-risk background tint per hour, same blue family as the rest of the app */}
        {points.map((p) => {
          if (p.level === 'clear') return null;
          const xStart = Math.max(PAD_L, hourToX(p.hour - 0.5));
          const xEnd = Math.min(VIEW_W - PAD_R, hourToX(p.hour + 0.5));
          return (
            <rect
              key={p.hour}
              x={xStart}
              y={chartTop}
              width={Math.max(0, xEnd - xStart)}
              height={chartH}
              fill={RAIN_COLORS[p.level]}
              opacity={p.level === 'likely' ? 0.14 : 0.07}
            />
          );
        })}

        <defs>
          <linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E7FD4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2E7FD4" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#rainFill)" stroke="none" />
        <path d={linePath} fill="none" stroke="#2E7FD4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* "Now" marker, matching the simulated run time */}
        <line
          x1={nowX}
          y1={chartTop}
          x2={nowX}
          y2={chartBottom}
          stroke="#2E7FD4"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.6"
        />
        <circle
          cx={nowX}
          cy={valueToY(nowPoint.precipMm)}
          r="3.5"
          fill="#2E7FD4"
          stroke="var(--c-surface2)"
          strokeWidth="1.5"
        />

        {HOUR_TICKS.map((h) => (
          <text
            key={h}
            x={hourToX(h)}
            y={VIEW_H - 5}
            fontSize="8"
            fill="var(--c-muted)"
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
          >
            {formatHour(h).replace(':00', '')}
          </text>
        ))}
      </svg>

      <div className="flex items-center justify-between text-[10px] text-muted mt-0.5">
        <span>Peak today: {maxPrecip >= 1 ? `${maxPrecip.toFixed(1)}mm/h` : '< 1mm/h'}</span>
        <span>
          Now: {nowPoint.precipMm.toFixed(1)}mm/h · {Math.round(nowPoint.rainProbabilityPct)}%
        </span>
      </div>
    </div>
  );
}
