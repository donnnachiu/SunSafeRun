import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const COLLAPSED_HEIGHT = 84; // px — just the handle + peek summary
const EXPANDED_HEIGHT = '72vh';
const DRAG_TOGGLE_THRESHOLD = 50; // px of vertical drag before it counts as a snap gesture
const DRAG_MOVE_THRESHOLD = 8; // px before a tap is reclassified as a drag

/**
 * A Google-Maps-style bottom sheet. Collapsed, it's just a handle plus a
 * one-line summary so the map stays almost fully visible. Tap the handle,
 * or drag it, to expand into the full scrollable panel.
 */
export default function BottomSheet({ peek, children, expanded, onExpandedChange }) {
    const [dragY, setDragY] = useState(0);
    const draggingRef = useRef(false);
    const startYRef = useRef(0);
    const wasDragRef = useRef(false);

    const handlePointerDown = (e) => {
        draggingRef.current = true;
        wasDragRef.current = false;
        startYRef.current = e.clientY;
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    const handlePointerMove = (e) => {
        if (!draggingRef.current) return;
        const delta = e.clientY - startYRef.current;
        if (Math.abs(delta) > DRAG_MOVE_THRESHOLD) wasDragRef.current = true;
        // Only resist in the direction that makes sense from the current state
        setDragY(expanded ? Math.max(0, delta) : Math.min(0, delta));
    };

    const handlePointerUp = (e) => {
        draggingRef.current = false;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);

        const delta = e.clientY - startYRef.current;
        if (Math.abs(delta) > DRAG_TOGGLE_THRESHOLD) {
            if (expanded && delta > 0) onExpandedChange(false);
            else if (!expanded && delta < 0) onExpandedChange(true);
        }
        setDragY(0);
    };

    const handleClick = () => {
        if (wasDragRef.current) {
            wasDragRef.current = false;
            return;
        }
        onExpandedChange(!expanded);
    };

    return (
        <div
            className="lg:hidden absolute inset-x-0 bottom-0 z-[1100] flex flex-col rounded-t-2xl border-t border-line bg-ink shadow-panel"
            style={{
                height: expanded ? EXPANDED_HEIGHT : `${COLLAPSED_HEIGHT}px`,
                transform: dragY ? `translateY(${dragY}px)` : undefined,
                transition: dragY ? 'none' : 'height 280ms ease, transform 280ms ease',
            }}
        >
            <button
                onPointerDown={handlePointerDown}
                onClick={handleClick}
                aria-expanded={expanded}
                aria-label={expanded ? 'Collapse run details' : 'Expand run details'}
                className="flex shrink-0 touch-none flex-col items-center gap-1.5 pt-2.5 pb-2"
            >
                <span className="h-1 w-9 rounded-full bg-line" />
                {expanded ? (
                    <ChevronDown size={14} className="text-muted" />
                ) : (
                    <div className="px-4">{peek}</div>
                )}
            </button>

            <div
                className={`min-h-0 flex-1 overflow-y-auto thin-scroll px-4 pb-6 ${expanded ? '' : 'invisible'}`}
            >
                {children}
            </div>
        </div>
    );
}