import { useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const COLLAPSED_PX = 52; // Reduced from 84px to maximize map area for mobile route planning
const HALF_VH = 38;      // Balanced view showing map and stats side-by-side
const FULL_VH = 78;

function pxForSnap(snap) {
    if (snap === 'collapsed') return COLLAPSED_PX;
    if (snap === 'half') return (HALF_VH / 100) * window.innerHeight;
    return (FULL_VH / 100) * window.innerHeight;
}

function heightStyleForSnap(snap) {
    if (snap === 'collapsed') return `${COLLAPSED_PX}px`;
    if (snap === 'half') return `${HALF_VH}vh`;
    return `${FULL_VH}vh`;
}

/**
 * A Google-Maps-style bottom sheet with three snap points: collapsed (compact handle),
 * half (map and stats both visible), and full (stats take priority).
 */
export default function BottomSheet({ peek, children, snap, onSnapChange }) {
    const [dragHeightPx, setDragHeightPx] = useState(null);
    const draggingRef = useRef(false);
    const startYRef = useRef(0);
    const startHeightRef = useRef(0);
    const wasDragRef = useRef(false);

    const handlePointerDown = (e) => {
        draggingRef.current = true;
        wasDragRef.current = false;
        startYRef.current = e.clientY;
        startHeightRef.current = pxForSnap(snap);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    const handlePointerMove = (e) => {
        if (!draggingRef.current) return;
        const delta = startYRef.current - e.clientY; // dragging up = taller
        if (Math.abs(delta) > 6) wasDragRef.current = true;
        const next = Math.min(pxForSnap('full'), Math.max(COLLAPSED_PX, startHeightRef.current + delta));
        setDragHeightPx(next);
    };

    const handlePointerUp = () => {
        draggingRef.current = false;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);

        if (dragHeightPx !== null) {
            const candidates = [
                { key: 'collapsed', px: COLLAPSED_PX },
                { key: 'half', px: pxForSnap('half') },
                { key: 'full', px: pxForSnap('full') },
            ];
            const nearest = candidates.reduce((a, b) =>
                Math.abs(b.px - dragHeightPx) < Math.abs(a.px - dragHeightPx) ? b : a
            );
            onSnapChange(nearest.key);
        }
        setDragHeightPx(null);
    };

    const handleClick = () => {
        if (wasDragRef.current) {
            wasDragRef.current = false;
            return;
        }
        if (snap === 'collapsed') onSnapChange('half');
        else if (snap === 'half') onSnapChange('full');
        else onSnapChange('collapsed');
    };

    const expanded = snap !== 'collapsed';

    return (
        <div
            className="lg:hidden absolute inset-x-0 bottom-0 z-[1100] flex flex-col rounded-t-2xl border-t border-line bg-ink shadow-panel transition-all duration-200 ease-out"
            style={{
                height: dragHeightPx !== null ? `${dragHeightPx}px` : heightStyleForSnap(snap),
                transition: dragHeightPx !== null ? 'none' : 'height 280ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
        >
            <button
                onPointerDown={handlePointerDown}
                onClick={handleClick}
                aria-expanded={expanded}
                aria-label={
                    snap === 'collapsed' ? 'Show more run details' : snap === 'half' ? 'Expand run details' : 'Collapse run details'
                }
                className="flex shrink-0 touch-none flex-col items-center justify-center gap-1 py-2 w-full cursor-grab active:cursor-grabbing"
            >
                <span className="h-1 w-10 rounded-full bg-line/80" />
                {snap === 'collapsed' && (
                    <div className="w-full px-4 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted">
                        {peek}
                    </div>
                )}
                {snap === 'half' && <ChevronUp size={16} className="text-muted" />}
                {snap === 'full' && <ChevronDown size={16} className="text-muted" />}
            </button>

            <div className={`min-h-0 flex-1 overflow-y-auto thin-scroll px-4 pb-6 ${expanded ? 'block' : 'hidden'}`}>
                {children}
            </div>
        </div>
    );
}