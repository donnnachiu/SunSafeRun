import { Gauge, CloudSun, Compass, ArrowUpRight, TriangleAlert, Loader2 } from 'lucide-react';
import { EXPOSURE_LABELS } from '../utils/sunCalculations';
import { formatDistance } from '../utils/routeUtils';

function uvLabel(uv) {
  if (uv >= 11) return 'Extreme';
  if (uv >= 8) return 'Very High';
  if (uv >= 6) return 'High';
  if (uv >= 3) return 'Moderate';
  return 'Low';
}

function uvColor(uv) {
  if (uv >= 8) return 'text-exposure-high';
  if (uv >= 3) return 'text-exposure-moderate';
  return 'text-exposure-low';
}

function StatTile({ icon: Icon, label, value, sub, accentClass }) {
  return (
    <div className="rounded-xl bg-surface2 border border-line p-3.5">
      <div className="flex items-center gap-2 text-muted text-xs font-mono uppercase tracking-wide mb-2">
        <Icon size={14} className={accentClass ?? ''} />
        {label}
      </div>
      <p className="font-display text-2xl font-semibold text-paper leading-none">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

export default function StatsPanel({ reading, originSun, summary, totalDistance, weatherStatus, weatherError, hasRoute }) {
  if (!hasRoute) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-panel text-sm text-muted leading-relaxed">
        <p className="font-display text-paper text-base font-semibold mb-2">Draw a route to begin</p>
        Click points on the map to lay down a running route. Once you've placed at least two points,
        SunSafeRun will pull live UV and cloud data for your start location and color each leg of the
        route by how exposed you'd be at the selected time.
      </div>
    );
  }

  if (weatherStatus === 'loading') {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-panel flex items-center gap-3 text-sm text-muted">
        <Loader2 size={16} className="animate-spin text-amber" />
        Fetching UV and cloud forecast for your route&rsquo;s start point&hellip;
      </div>
    );
  }

  if (weatherStatus === 'error') {
    return (
      <div className="rounded-2xl border border-exposure-high/40 bg-exposure-high/10 p-5 shadow-panel flex items-start gap-3 text-sm text-paper">
        <TriangleAlert size={18} className="text-exposure-high shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Couldn&rsquo;t load weather data</p>
          <p className="text-muted">{weatherError ?? 'Open-Meteo request failed. Try redrawing the route.'}</p>
        </div>
      </div>
    );
  }

  const uv = reading?.uvIndex ?? 0;
  const cloud = reading?.cloudCoverPct ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          icon={Gauge}
          label="UV Index"
          value={uv.toFixed(1)}
          sub={uvLabel(uv)}
          accentClass={uvColor(uv)}
        />
        <StatTile icon={CloudSun} label="Cloud cover" value={`${Math.round(cloud)}%`} sub="Open-Meteo hourly" />
        <StatTile
          icon={ArrowUpRight}
          label="Sun altitude"
          value={`${originSun ? originSun.altitudeDeg.toFixed(0) : '–'}°`}
          sub={originSun && originSun.altitudeDeg <= 0 ? 'Below horizon' : 'Above horizon'}
        />
        <StatTile
          icon={Compass}
          label="Sun bearing"
          value={`${originSun ? originSun.azimuthDeg.toFixed(0) : '–'}°`}
          sub="From start point"
        />
      </div>

      {summary && (
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-panel">
          <p className="font-display text-sm font-semibold text-paper mb-3">Route exposure breakdown</p>
          <div className="space-y-2.5">
            {['low', 'moderate', 'high'].map((level) => {
              const dist = summary.counts[level] ?? 0;
              const pct = totalDistance > 0 ? (dist / totalDistance) * 100 : 0;
              return (
                <div key={level}>
                  <div className="flex justify-between text-xs font-mono text-muted mb-1">
                    <span>{EXPOSURE_LABELS[level]}</span>
                    <span>{formatDistance(dist)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: { low: '#4C9A6A', moderate: '#E8B93A', high: '#D64545' }[level],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {summary.worst === 'high' && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-exposure-high/10 border border-exposure-high/30 p-3 text-xs text-paper">
              <TriangleAlert size={15} className="text-exposure-high shrink-0 mt-0.5" />
              <span>
                Part of this route runs straight into strong, unobstructed sun. Consider sunscreen, a hat, or
                shifting your run earlier or later.
              </span>
            </div>
          )}

          <p className="mt-4 text-[11px] text-muted leading-relaxed">
            Total distance: <span className="font-mono text-paper">{formatDistance(totalDistance)}</span>. Exposure is
            an estimate combining UV index, cloud cover, sun altitude, and whether you're heading toward or away
            from the sun — not a medical dosage.
          </p>
        </div>
      )}
    </div>
  );
}
