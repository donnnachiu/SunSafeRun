import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { searchPlaces } from '../utils/geocodeApi';

const DEBOUNCE_MS = 450;

export default function LocationSearch({ icon: Icon = Search, placeholder, onSelect, dotColor }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [error, setError] = useState(null);

  const rootRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 3) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const thisRequestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const places = await searchPlaces(query);
        if (requestIdRef.current === thisRequestId) {
          setResults(places);
          setError(null);
          setHighlighted(-1);
        }
      } catch (err) {
        if (requestIdRef.current === thisRequestId) setError(err.message);
      } finally {
        if (requestIdRef.current === thisRequestId) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    function handlePointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  function pick(place) {
    onSelect(place);
    setQuery('');
    setResults([]);
    setOpen(false);
    setHighlighted(-1);
  }

  function handleKeyDown(e) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      pick(results[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface2 px-2.5 py-1.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        <Icon size={13} className="text-muted shrink-0" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query.trim().length >= 3 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-xs text-paper placeholder:text-muted focus:outline-none"
        />
        {loading && <Loader2 size={13} className="animate-spin text-muted shrink-0" />}
        {!loading && query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setOpen(false);
            }}
            aria-label="Clear search"
            className="text-muted hover:text-paper shrink-0"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && (results.length > 0 || error) && (
        <ul className="absolute left-0 right-0 top-full z-[600] mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface shadow-panel thin-scroll">
          {error && <li className="px-3 py-2 text-xs text-exposure-high">{error}</li>}
          {results.map((place, i) => (
            <li key={place.id}>
              <button
                onClick={() => pick(place)}
                onMouseEnter={() => setHighlighted(i)}
                className={`w-full truncate px-3 py-2 text-left text-xs transition-colors ${
                  i === highlighted ? 'bg-surface2 text-paper' : 'text-muted hover:bg-surface2 hover:text-paper'
                }`}
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
