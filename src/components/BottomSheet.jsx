// src/components/BottomSheet.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';

// Snap heights in px for 'collapsed', or as vh for the rest.
const HIDDEN_PX = 0;
const COLLAPSED_PX = 80;
const HALF_VH = 38;
const FULL_VH = 70; // was 78 — leaves more map visible
const FULL_MAX_PX = 620; // cap for very tall phones

const SNAPS = ['hidden', 'collapsed', 'half', 'full'];

function pxForSnap(snap) {
    if (snap === 'hidden') return HIDDEN_PX;
    if (snap === 'collapsed') return COLLAPSED_PX;
    if (snap === 'half') return (HALF_VH / 100) * window.innerHeight;
    return Math.min((FULL_VH / 100) * window.innerHeight, FULL_MAX_PX);
}

function heightStyleForSnap(snap) {
    if (snap === 'hidden') return '0px';
    if (snap === 'collapsed') return `${COLLAPSED_PX}px`;
    if (snap === 'half') return `${HALF_VH}vh`;
    return `min(${FULL_VH}vh, ${FULL_MAX_PX}px)`;
}

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function BottomSheet({ peek, children, snap, onSnapChange }) {
    const [dragHeightPx, setDragHeightPx] = useState(null);
    const dragHeightRef = useRef(null);
    const startYRef = useRef(0);
    const startHeightRef = useRef(0);
    const wasDragRef = useRef(false);
    const handleRef = useRef(null);

    // ── Restore last snap for this session ────────────────────────────────────
    useEffect(() => {
        const saved = sessionStorage.getItem('sunsaferun_bottom_sheet_snap');
        if (saved && SNAPS.includes(saved) && saved !== snap) {
            onSnapChange(saved);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Persist snap on change ────────────────────────────────────────────────
    useEffect(() => {
        if (snap) sessionStorage.setItem('sunsaferun_bottom_sheet_snap', snap);
    }, [snap]);

    // ── Cleanup any stray listeners if we unmount mid-drag ────────────────────
    useEffect(() => {
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const beginDrag = useCallback((e) => {
        // Only drag with primary button / touch / pen
        if (e.button !== undefined && e.button !== 0) return;
        startYRef.current = e.clientY;
        startHeightRef.current = pxForSnap(snap);
        wasDragRef.current = false;

        // Capture pointer so we don't rely on window listeners surviving
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            /* no-op: some browsers throw if pointer already released */
        }

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    }, [snap]);

    const handlePointerMove = (e) => {
        const delta = startYRef.current - e.clientY; // up = taller
        if (Math.abs(delta) > 6) wasDragRef.current = true;
        const next = Math.min(
            pxForSnap('full'),
            Math.max(HIDDEN_PX, startHeightRef.current + delta)
        );
        dragHeightRef.current = next;
        setDragHeightPx(next);
    };

    const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);

        const released = dragHeightRef.current;
        dragHeightRef.current = null;

        if (released !== null) {
            const candidates = SNAPS.map((key) => ({ key, px: pxForSnap(key) }));
            const nearest = candidates.reduce((a, b) =>
                Math.abs(b.px - released) < Math.abs(a.px - released) ? b : a
            );
            // If user barely moved, treat as a tap and cycle snap instead.
            if (!wasDragRef.current) {
                cycleSnap(snap, onSnapChange);
            } else if (nearest.key !== snap) {
                onSnapChange(nearest.key);
            }
        }
        setDragHeightPx(null);
    };

    const handleClick = () => {
        // If the pointer sequence already handled this as a drag, ignore the click.
        if (wasDragRef.current) {
            wasDragRef.current = false;
            return;
        }
        cycleSnap(snap, onSnapChange);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const i = SNAPS.indexOf(snap);
            onSnapChange(SNAPS[Math.min(SNAPS.length - 1, i + 1)]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const i = SNAPS.indexOf(snap);
            onSnapChange(SNAPS[Math.max(0, i - 1)]);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            cycleSnap(snap, onSnapChange);
        }
    };

    const expanded = snap === 'half' || snap === 'full';
    const isHidden = snap === 'hidden';
    const reduceMotion = prefersReducedMotion();

    // ── When hidden, render a small floating pill to bring it back ────────────
    if (isHidden) {
        return (
            <button
                type="button"
                onClick={() => onSnapChange('collapsed')}
                aria-label="Show run details"
                className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-[1100]
                           flex items-center gap-2 rounded-full border border-line
                           bg-ink/95 px-4 py-2 text-xs font-semibold text-paper
                           shadow-panel backdrop-blur-sm hover:bg-ink"
            >
                <ChevronUp size={14} />
                Run details
            </button>
        );
    }

    return (
        <div
            role="region"
            aria-label="Run details"
            className="lg:hidden absolute inset-x-0 bottom-0 z-[1100] flex flex-col
                       rounded-t-2xl border-t border-line bg-ink shadow-panel"
            style={{
                height:
                    dragHeightPx !== null
                        ? `${dragHeightPx}px`
                        : heightStyleForSnap(snap),
                transition:
                    dragHeightPx !== null || reduceMotion
                        ? 'none'
                        : 'height 260ms cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: dragHeightPx !== null ? 'height' : undefined,
            }}
        >
            {/* ── Drag handle (thin, dedicated row) ─────────────────────────── */}
            <div
                ref={handleRef}
                onPointerDown={beginDrag}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                aria-label={
                    snap === 'collapsed'
                        ? 'Show more run details'
                        : snap === 'half'
                            ? 'Expand run details'
                            : 'Collapse run details'
                }
                className="flex shrink-0 touch-none select-none flex-col items-center
                           justify-center gap-1 pt-2 pb-1 w-full cursor-grab
                           active:cursor-grabbing focus:outline-none
                           focus-visible:ring-2 focus-visible:ring-sky-500/60"
            >
                <GripHorizontal size={16} className="text-line/80" />
            </div>

            {/* ── Peek summary (tappable, but not draggable) ────────────────── */}
            {snap === 'collapsed' && (
                <button
                    type="button"
                    onClick={() => onSnapChange('half')}
                    aria-label="Expand run details"
                    className="shrink-0 w-full px-4 pb-2 flex items-center justify-center
                   gap-2 text-xs text-muted hover:text-paper
                   whitespace-normal leading-tight"
                >
                    <span>{peek}</span>
                    <ChevronUp size={14} className="shrink-0 text-muted" />
                </button>
            )}

            {/* ── Half/full indicator chevrons ──────────────────────────────── */}
            {snap === 'half' && (
                <div className="flex justify-center pb-1">
                    <ChevronUp size={14} className="text-muted" />
                </div>
            )}
            {snap === 'full' && (
                <div className="flex justify-center pb-1">
                    <ChevronDown size={14} className="text-muted" />
                </div>
            )}

            {/* ── Scrollable content ────────────────────────────────────────── */}
            <div
                className={`min-h-0 flex-1 overflow-y-auto thin-scroll px-4 pb-6 ${
                    expanded ? 'block' : 'hidden'
                }`}
            >
                {children}
            </div>
        </div>
    );
}

// ── Helper: cycle snaps when the user taps rather than drags ─────────────────
function cycleSnap(snap, onSnapChange) {
    const i = SNAPS.indexOf(snap);
    if (i === -1) return onSnapChange('collapsed');
    // cycle: collapsed → half → full → collapsed (hidden reached via drag only)
    if (snap === 'collapsed') return onSnapChange('half');
    if (snap === 'half') return onSnapChange('full');
    if (snap === 'full') return onSnapChange('collapsed');
}