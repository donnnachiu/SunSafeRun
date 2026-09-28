import { Undo2, Trash2, MapPin } from 'lucide-react';

export default function RouteControls({ pointCount, onUndo, onClear }) {
  return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface/90 backdrop-blur px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted min-w-0">
            <MapPin size={14} className="text-amber shrink-0" />
            <span className="truncate">
                <span className="sm:hidden">
                   {pointCount === 0 ? 'Tap the map to start' : `${pointCount} point${pointCount === 1 ? '' : 's'}`}
                </span>
            <span className="hidden sm:inline">
                   {pointCount === 0
                       ? 'Search above or click the map to drop your first point'
                       : `${pointCount} point${pointCount === 1 ? '' : 's'} placed — search, or keep clicking, to extend the route`}
            </span>
            </span>
      </div>
          <div className="flex items-center gap-2 shrink-0">
              <button
                  onClick={onUndo}
                  disabled={pointCount === 0}
                  aria-label="Undo last point"
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-paper bg-surface2 border border-line hover:bg-line disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                  <Undo2 size={13}/>
                  <span>Undo</span>
              </button>

              <button
                  onClick={onClear}
                  disabled={pointCount === 0}
                  aria-label="Clear route"
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-paper bg-surface2 border border-line hover:bg-exposure-high/20 hover:border-exposure-high/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                  <Trash2 size={13}/>
                  <span>Clear</span>
              </button>
          </div>
      </div>
  );
}
