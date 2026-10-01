import { Gauge, CloudSun, ArrowUpRight, Compass, TriangleAlert, Loader2, CloudRain } from 'lucide-react';
import { EXPOSURE_LABELS } from '../utils/sunCalculations';
import { classifyRain, RAIN_LABELS, RAIN_COLORS } from '../utils/rainModel';
import { formatDistance } from '../utils/routeUtils';
import InfoTooltip from './InfoTooltip';
import SunscreenPanel from './SunscreenPanel';
import RainChart from './RainChart';
import RouteSummary from './RouteSummary';

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

const DEFINITIONS = {
    uv: (
        <>
            Strength of the sun&rsquo;s UV radiation this hour, from Open-Meteo&rsquo;s forecast.
            0&ndash;2 low, 3&ndash;5 moderate, 6&ndash;7 high, 8&ndash;10 very high, 11+ extreme &mdash;
            higher means skin burns faster.
        </>
    ),
    cloud: (
        <>
            Share of the sky covered by cloud. Clouds only partially block UV &mdash; this app
            assumes full overcast still lets through about 35% of it.
        </>
    ),
    altitude: (
        <>
            How high the sun sits above the horizon, in degrees. 0&deg; or below means it
            hasn&rsquo;t risen yet or has already set; 90&deg; would be directly overhead.
        </>
    ),
    bearing: (
        <>
            The compass direction you&rsquo;d face to look straight at the sun. 0&deg; = North,
            90&deg; = East, 180&deg; = South, 270&deg; = West.
        </>
    ),
    rain: (
        <>
            Precipitation forecast across the day, from Open-Meteo &mdash; line height is
            expected rainfall (mm/h), tinted blue where rain is possible or likely. The dot
            marks your simulated run time.
        </>
    ),
};

function StatTile({ icon: Icon, label, value, sub, accentClass, info, infoAlign }) {
    return (
        <div className="rounded-xl bg-surface2 border border-line p-3.5">
            <div className="flex items-center gap-1.5 text-muted text-xs font-mono uppercase tracking-wide mb-2">
                <Icon size={14} className={accentClass ?? ''} />
                <span>{label}</span>
                {info && (
                    <InfoTooltip label={label} align={infoAlign}>
                        {info}
                    </InfoTooltip>
                )}
            </div>
            <p className="font-display text-2xl font-semibold text-paper leading-none">{value}</p>
            {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
        </div>
    );
}

/** Lower-priority, more compact stat row — used for the sun-geometry figures at the bottom. */
function MiniStat({ icon: Icon, label, value, sub, info, infoAlign }) {
    return (
        <div className="flex items-center gap-2.5 rounded-lg bg-surface2/60 border border-line px-3 py-2">
            <Icon size={13} className="text-muted shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-muted font-mono">{label}</span>
                    {info && (
                        <InfoTooltip label={label} align={infoAlign}>
                            {info}
                        </InfoTooltip>
                    )}
                </div>
                <p className="text-sm text-paper font-mono leading-tight">
                    {value} <span className="text-muted font-body">· {sub}</span>
                </p>
            </div>
        </div>
    );
}

export default function StatsPanel({
                                       reading,
                                       originSun,
                                       summary,
                                       totalDistance,
                                       weatherStatus,
                                       weatherError,
                                       hasRoute,
                                       hour,
                                       hourly,
                                       routePoints = [],
                                       isConnectedToGarmin = false,
                                       onConnect,
                                   }) {
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
    const rainProbabilityPct = reading?.rainProbabilityPct ?? 0;
    const precipMm = reading?.precipMm ?? 0;
    const rainLevel = classifyRain({ rainProbabilityPct, precipMm });

    return (
        <div className="space-y-4">
            {/* 1. Current conditions — the two numbers that most directly drive "should I go now" */}
            <div className="grid grid-cols-2 gap-3">
                <StatTile
                    icon={Gauge}
                    label="UV Index"
                    value={uv.toFixed(1)}
                    sub={uvLabel(uv)}
                    accentClass={uvColor(uv)}
                    info={DEFINITIONS.uv}
                />
                <StatTile
                    icon={CloudSun}
                    label="Cloud cover"
                    value={`${Math.round(cloud)}%`}
                    sub="Open-Meteo hourly"
                    info={DEFINITIONS.cloud}
                    infoAlign="right"
                />
            </div>

            {/* 2. Actionable: what to do about the UV you just saw */}
            <SunscreenPanel
                hour={hour}
                currentUV={uv}
                hourly={hourly ?? []}
                totalDistance={totalDistance}
                hasRoute={hasRoute}
            />

            {/* 3. Rain risk, as a time-series so a single mm figure isn't the whole story */}
            <div className="rounded-xl bg-surface2 border border-line p-3.5">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-muted text-xs font-mono uppercase tracking-wide">
                        <CloudRain size={14} style={{ color: RAIN_COLORS[rainLevel] ?? undefined }} />
                        <span>Rain risk</span>
                        <InfoTooltip label="Rain risk">{DEFINITIONS.rain}</InfoTooltip>
                    </div>
                    <span
                        className="text-xs font-semibold"
                        style={{ color: RAIN_COLORS[rainLevel] ?? 'var(--c-paper)' }}
                    >
            {RAIN_LABELS[rainLevel]}
          </span>
                </div>
                <RainChart hourly={hourly ?? []} currentHour={hour} />
            </div>

            {/* 4. The route itself — the payoff of everything above */}
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

                    {/* Garmin Watch Sync Integration */}
                    <div className="mt-4 pt-4 border-t border-line">
                        <RouteSummary
                            totalDistance={totalDistance}
                            isConnectedToGarmin={isConnectedToGarmin}
                            routePoints={routePoints}
                            hour={hour}
                            onConnect={onConnect}
                        />
                    </div>
                </div>
            )}

            {/* 5. Sun geometry — useful context, least decision-relevant on its own, so it sits at the bottom */}
            <div className="grid grid-cols-2 gap-2">
                <MiniStat
                    icon={ArrowUpRight}
                    label="Sun altitude"
                    value={`${originSun ? originSun.altitudeDeg.toFixed(0) : '–'}°`}
                    sub={originSun && originSun.altitudeDeg <= 0 ? 'below horizon' : 'above horizon'}
                    info={DEFINITIONS.altitude}
                />
                <MiniStat
                    icon={Compass}
                    label="Sun bearing"
                    value={`${originSun ? originSun.azimuthDeg.toFixed(0) : '–'}°`}
                    sub="from start"
                    info={DEFINITIONS.bearing}
                    infoAlign="right"
                />
            </div>
        </div>
    );
}