import { useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const COLLAPSED_PX = 84; // just the handle + peek summary
const HALF_VH = 42; // leaves most of the map visible while browsing stats
const FULL_VH = 80;

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
 * A Google-Maps-style bottom sheet with three snap points: collapsed (just
 * a peek summary), half (map and stats both visible), and full (stats take
 * priority). Tap the handle to cycle through them, or drag freely and it
 * snaps to whichever is closest on release.
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
            className="lg:hidden absolute inset-x-0 bottom-0 z-[1100] flex flex-col rounded-t-2xl border-t border-line bg-ink shadow-panel"
            style={{
                height: dragHeightPx !== null ? `${dragHeightPx}px` : heightStyleForSnap(snap),
                transition: dragHeightPx !== null ? 'none' : 'height 280ms ease',
            }}
        >
            <button
                onPointerDown={handlePointerDown}
                onClick={handleClick}
                aria-expanded={expanded}
                aria-label={
                    snap === 'collapsed' ? 'Show more run details' : snap === 'half' ? 'Expand run details' : 'Collapse run details'
                }
                className="flex shrink-0 touch-none flex-col items-center gap-1.5 pt-2.5 pb-2"
            >
                <span className="h-1 w-9 rounded-full bg-line" />
                {snap === 'collapsed' && <div className="px-4">{peek}</div>}
                {snap === 'half' && <ChevronUp size={14} className="text-muted" />}
                {snap === 'full' && <ChevronDown size={14} className="text-muted" />}
            </button>

            <div className={`min-h-0 flex-1 overflow-y-auto thin-scroll px-4 pb-6 ${expanded ? '' : 'invisible'}`}>
                {children}
            </div>
        </div>
    );
}