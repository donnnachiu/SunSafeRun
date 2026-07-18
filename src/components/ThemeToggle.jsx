import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ isDaytime, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={`Switch to ${isDaytime ? 'dark' : 'light'} theme`}
      title={`Switch to ${isDaytime ? 'dark' : 'light'} theme`}
      className="relative flex items-center w-14 h-8 shrink-0 rounded-full border border-line bg-surface2 transition-colors"
    >
      <Moon size={12} className="absolute left-2 text-muted" />
      <Sun size={12} className="absolute right-2 text-muted" />
      <span
        className={`absolute top-0.5 left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber shadow-sm transition-transform duration-300 ease-out ${
          isDaytime ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        {isDaytime ? <Sun size={13} className="text-ink" /> : <Moon size={13} className="text-ink" />}
      </span>
    </button>
  );
}
