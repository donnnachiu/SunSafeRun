import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';

/**
 * A small "i" glyph that reveals a plain-language definition on hover
 * (desktop) or tap (mobile). Closes on outside click and Escape.
 */
export default function InfoTooltip({ label, children, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <span className="relative inline-flex" ref={ref}>
      <button
        type="button"
        aria-label={`What is ${label}?`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full text-muted/80 hover:text-amber transition-colors"
      >
        <Info size={13} />
      </button>

      {open && (
        <div
          role="tooltip"
          className={`absolute bottom-full z-50 mb-2 w-56 max-w-[80vw] rounded-lg border border-line bg-surface2 p-3 text-[11px] leading-relaxed text-paper shadow-panel ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <p className="mb-1 font-display text-xs font-semibold">{label}</p>
          {children}
        </div>
      )}
    </span>
  );
}
