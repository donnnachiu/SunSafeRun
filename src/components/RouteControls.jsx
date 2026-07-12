import { Undo2, Trash2, MapPin } from 'lucide-react';

export default function RouteControls({ pointCount, onUndo, onClear }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-surface/90 backdrop-blur px-4 py-2.5">
      <div className="flex items-center gap-2 text-xs text-muted">
        <MapPin size={14} className="text-amber" />
        {pointCount === 0
          ? 'Click the map to drop your first point'
          : `${pointCount} point${pointCount === 1 ? '' : 's'} placed — keep clicking to extend the route`}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={pointCount === 0}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-paper bg-surface2 border border-line hover:bg-line disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Undo2 size={13} />
          Undo
        </button>
        <button
          onClick={onClear}
          disabled={pointCount === 0}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-paper bg-surface2 border border-line hover:bg-exposure-high/20 hover:border-exposure-high/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 size={13} />
          Clear
        </button>
      </div>
    </div>
  );
}
