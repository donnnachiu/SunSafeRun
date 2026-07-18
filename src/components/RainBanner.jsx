import { CloudRain } from 'lucide-react';
import { RAIN_LABELS } from '../utils/rainModel';

export default function RainBanner({ level, probabilityPct, precipMm }) {
  if (level === 'clear') return null;

  const isLikely = level === 'likely';

  return (
    <div
      className={`pointer-events-none flex items-center gap-2 rounded-full border px-3.5 py-1.5 backdrop-blur ${
        isLikely ? 'border-[#2E7FD4]/50 bg-[#2E7FD4]/20' : 'border-[#5FA8D3]/40 bg-[#5FA8D3]/10'
      }`}
    >
      <CloudRain size={14} className={isLikely ? 'text-[#2E7FD4] animate-pulse' : 'text-[#5FA8D3]'} />
      <span className="text-xs font-medium text-paper">
        {RAIN_LABELS[level]} at this time — {Math.round(probabilityPct)}% chance
        {precipMm >= 0.1 ? `, ~${precipMm.toFixed(1)}mm` : ''}
      </span>
    </div>
  );
}
