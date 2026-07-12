import { Sun } from 'lucide-react';

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-amber/15 border border-amber/30 flex items-center justify-center">
          <Sun size={18} className="text-amber" />
        </div>
        <div>
          <h1 className="font-display text-lg font-semibold text-paper leading-none">SunSafeRun</h1>
          <p className="text-[11px] text-muted mt-0.5">Plan your route around the sun, not into it</p>
        </div>
      </div>
    </header>
  );
}
