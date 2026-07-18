import { useMemo, useState } from 'react';
import { Droplets, Sun as SunIcon, RefreshCw } from 'lucide-react';
import { formatHour } from './SunArcSlider';
import { pickHourlyReading } from '../utils/weatherApi';
import {
  protectedMinutes,
  buildReapplySchedule,
  estimateDurationMinutes,
} from '../utils/sunscreenModel';
import InfoTooltip from './InfoTooltip';

export default function SunscreenPanel({ hour, currentUV, hourly, totalDistance, hasRoute }) {
  const [spf, setSpf] = useState('');
  const [duration, setDuration] = useState('');

  const spfNum = spf ? parseFloat(spf) : null;
  const durationPlaceholder = useMemo(() => {
    const est = estimateDurationMinutes(totalDistance);
    return est ? String(est) : 'e.g. 45';
  }, [totalDistance]);
  const durationNum = duration
    ? parseFloat(duration)
    : hasRoute
    ? estimateDurationMinutes(totalDistance)
    : null;

  const getUVAtHour = useMemo(() => {
    return (h) => pickHourlyReading(hourly, h)?.uvIndex ?? 0;
  }, [hourly]);

  const currentWindow = spfNum ? protectedMinutes(currentUV ?? 0, spfNum) : null;

  const schedule = useMemo(() => {
    if (!spfNum || !durationNum || hourly.length === 0) return [];
    return buildReapplySchedule({ startHour: hour, durationMinutes: durationNum, spf: spfNum, getUVAtHour });
  }, [spfNum, durationNum, hour, hourly, getUVAtHour]);

  return (
    <div className="rounded-xl border border-line bg-surface2 p-3.5">
      <div className="flex items-center gap-1.5 text-muted text-xs font-mono uppercase tracking-wide mb-3">
        <Droplets size={14} className="text-amber" />
        <span>Sunscreen planner</span>
        <InfoTooltip label="Sunscreen planner">
          <>
            Ballpark estimate only, not medical advice. Assumes medium skin tone and derates
            SPF for sweat while running — actual burn time varies a lot by skin, sunscreen
            type, and how evenly it&rsquo;s applied. When in doubt, reapply every 2 hours or
            after heavy sweating.
          </>
        </InfoTooltip>
        <span className="ml-auto text-[10px] normal-case text-muted/70">optional</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted">SPF</span>
          <input
            type="number"
            min="0"
            max="100"
            inputMode="numeric"
            placeholder="e.g. 30"
            value={spf}
            onChange={(e) => setSpf(e.target.value)}
            className="rounded-lg border border-line bg-ink px-2.5 py-1.5 text-sm text-paper placeholder:text-muted focus:outline-none focus:border-amber"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted">Run duration (min)</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder={durationPlaceholder}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="rounded-lg border border-line bg-ink px-2.5 py-1.5 text-sm text-paper placeholder:text-muted focus:outline-none focus:border-amber"
          />
        </label>
      </div>

      {!spfNum && (
        <p className="text-xs text-muted">
          Add your SPF above to see roughly how long it&rsquo;ll hold up in today&rsquo;s UV, and
          when to reapply.
        </p>
      )}

      {spfNum && currentWindow !== null && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-ink px-3 py-2">
            <SunIcon size={14} className="text-amber shrink-0" />
            <p className="text-xs text-paper">
              SPF {spfNum} lasts about{' '}
              <span className="font-semibold text-amber">{Math.round(currentWindow)} min</span> at the
              current UV ({(currentUV ?? 0).toFixed(1)}), sweat factored in.
            </p>
          </div>

          {schedule.length > 0 ? (
            <div className="space-y-1.5">
              {schedule.map((event, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {event.type === 'apply' ? (
                    <Droplets size={12} className="text-amber shrink-0" />
                  ) : (
                    <RefreshCw size={12} className="text-exposure-moderate shrink-0" />
                  )}
                  <span className="text-paper font-mono">{formatHour(event.hour)}</span>
                  <span className="text-muted">
                    {event.type === 'apply' ? 'Apply sunscreen' : 'Reapply sunscreen'} · UV{' '}
                    {event.uvIndex.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted">
              Add a run duration to see a full reapplication timeline for your route.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
