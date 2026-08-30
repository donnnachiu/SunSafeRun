import { useEffect, useMemo, useState } from 'react';
import { Sunrise, Sunset, Clock } from 'lucide-react';
import { classifyRain, RAIN_COLORS } from '../utils/rainModel';

const MIN_HOUR = 5;
const MAX_HOUR = 20;
const STEP = 0.25;

// Sky color stops across the day, used to paint the slider track's gradient //
const SKY_STOPS = [
  { h: 5, c: [19, 27, 46] }, // pre-dawn indigo
  { h: 6.5, c: [233, 121, 59] }, // sunrise orange
  { h: 9, c: [95, 168, 211] }, // morning blue
  { h: 13, c: [126, 200, 227] }, // midday bright blue
  { h: 17, c: [95, 168, 211] }, // afternoon blue
  { h: 18.75, c: [228, 87, 46] }, // sunset red-orange
  { h: 20, c: [22, 24, 46] }, // dusk indigo
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function skyColorAt(hour) {
  const h = Math.min(Math.max(hour, MIN_HOUR), MAX_HOUR);
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    const a = SKY_STOPS[i];
    const b = SKY_STOPS[i + 1];
    if (h >= a.h && h <= b.h) {
      const t = (h - a.h) / (b.h - a.h);
      const c = a.c.map((v, idx) => Math.round(lerp(v, b.c[idx], t)));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return `rgb(${SKY_STOPS[0].c.join(', ')})`;
}

function trackGradient() {
  const stops = [];
  for (let h = MIN_HOUR; h <= MAX_HOUR; h += 1) {
    const pct = ((h - MIN_HOUR) / (MAX_HOUR - MIN_HOUR)) * 100;
    stops.push(`${skyColorAt(h)} ${pct}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

export function formatHour(hour) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

function hourToPercent(hour) {
  return ((hour - MIN_HOUR) / (MAX_HOUR - MIN_HOUR)) * 100;
}

function dateToFractionalHour(date) {
  return date.getHours() + date.getMinutes() / 60;
}

export default function SunArcSlider({ hour, onChange, sunTimes, hourly = [] }) {
  const sky = useMemo(() => trackGradient(), []);
  const thumbPct = hourToPercent(hour);

  const [nowHour, setNowHour] = useState(() => dateToFractionalHour(new Date()));
  useEffect(() => {
    const id = setInterval(() => setNowHour(dateToFractionalHour(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);
  const nowInRange = nowHour >= MIN_HOUR && nowHour <= MAX_HOUR;
  const nowPct = nowInRange ? hourToPercent(nowHour) : null;
  const isAtNow = Math.abs(hour - nowHour) < STEP / 2;


  const sunrisePct = sunTimes?.sunrise ? hourToPercent(dateToFractionalHour(sunTimes.sunrise)) : null;
  const sunsetPct = sunTimes?.sunset ? hourToPercent(dateToFractionalHour(sunTimes.sunset)) : null;

  const rainTicks = useMemo(() => {
    return hourly
      .filter((h) => h.hour >= MIN_HOUR && h.hour <= MAX_HOUR)
      .map((h) => ({
        hour: h.hour,
        level: classifyRain({ rainProbabilityPct: h.rainProbabilityPct, precipMm: h.precipMm }),
      }))
      .filter((t) => t.level !== 'clear');
  }, [hourly]);

  return (
    <div
      className="rounded-2xl border border-line p-5 shadow-panel transition-colors duration-500"
      style={{ background: `linear-gradient(160deg, ${skyColorAt(hour)}22, #171F26)` }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted font-mono mb-1">Simulated run time</p>
          <p className="font-display text-3xl font-semibold text-paper tabular-nums">{formatHour(hour)}</p>
        </div>
        {sunTimes?.sunrise && sunTimes?.sunset && (
          <div className="text-right font-mono text-xs text-muted space-y-1">
            <div className="flex items-center justify-end gap-1.5">
              <Sunrise size={13} className="text-amber" />
              {formatHour(dateToFractionalHour(sunTimes.sunrise))}
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <Sunset size={13} className="text-amber-deep" />
              {formatHour(dateToFractionalHour(sunTimes.sunset))}
            </div>
          </div>
        )}
      </div>
      {!isAtNow && nowInRange && (
          <button
              onClick={() => onChange(nowHour)}
              className="mb-3 flex w-full items-center justify-between rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-paper transition-colors hover:bg-amber/20"
          >
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-amber" />
            Showing a simulated time, not right now ({formatHour(nowHour)})
          </span>
            <span className="font-semibold text-amber whitespace-nowrap">Jump to now →</span>
          </button>
      )}

      <div className="relative pt-1">
        {/* Sky-gradient track */}
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full overflow-hidden"
          style={{ background: sky }}
        >
          {/* darken the portion before "now" slightly less than after, purely decorative divider */}
        </div>

        {/* Rain-risk ticks, just below the track/thumb */}
        {rainTicks.map((t) => (
          <div
            key={t.hour}
            className="pointer-events-none absolute top-[calc(50%+16px)] w-1 h-1 rounded-full"
            style={{
              left: `${hourToPercent(t.hour)}%`,
              backgroundColor: RAIN_COLORS[t.level],
              opacity: t.level === 'likely' ? 1 : 0.6,
            }}
            title={`${t.level === 'likely' ? 'Rain likely' : 'Possible rain'} around ${formatHour(t.hour)}`}
          />
        ))}

        {/* Sunrise / sunset markers */}
        {sunrisePct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-px h-4 bg-paper/40"
            style={{ left: `${sunrisePct}%` }}
            title={`Sunrise ${formatHour(dateToFractionalHour(sunTimes.sunrise))}`}
          />
        )}
        {sunsetPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-px h-4 bg-paper/40"
            style={{ left: `${sunsetPct}%` }}
            title={`Sunset ${formatHour(dateToFractionalHour(sunTimes.sunset))}`}
          />
        )}
        {/* Live "right now" marker — always visible so it's obvious when the
            thumb (simulated time) has drifted away from the actual time */}
        {nowPct !== null && (
            <div
                className="pointer-events-none absolute top-[calc(50%-13px)] flex flex-col items-center"
                style={{ left: `${nowPct}%`, transform: 'translateX(-50%)' }}
                title={`Right now: ${formatHour(nowHour)}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-paper" />
              <span className="mt-0.5 h-2.5 w-px bg-paper/60" />
            </div>
        )}

        <input
          type="range"
          min={MIN_HOUR}
          max={MAX_HOUR}
          step={STEP}
          value={hour}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="sun-arc-slider relative"
          aria-label="Simulated run time"
          style={{ '--thumb-pct': `${thumbPct}%` }}
        />
      </div>

      <div className="flex justify-between mt-1 font-mono text-[10px] text-muted">
        <span>5 AM</span>
        <span>8 AM</span>
        <span>11 AM</span>
        <span>2 PM</span>
        <span>5 PM</span>
        <span>8 PM</span>
      </div>
    </div>
  );
}
