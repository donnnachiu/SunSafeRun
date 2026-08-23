import { useState } from 'react';
import { MapPin, Flag, Search, X } from 'lucide-react';
import LocationSearch from './LocationSearch';

function SearchFields({ onSelectStart, onSelectStop }) {
    return (
        <>
            <div className="flex flex-col sm:flex-row gap-2">
                <LocationSearch
                    icon={MapPin}
                    dotColor="#4C9A6A"
                    placeholder="Search starting point…"
                    onSelect={onSelectStart}
                />
                <LocationSearch icon={Flag} dotColor="#D64545" placeholder="Add a stop…" onSelect={onSelectStop} />
            </div>
            <p className="mt-1.5 text-[10px] text-muted/70">Search by OpenStreetMap Nominatim</p>
        </>
    );
}

export default function RouteSearchBar({ onSelectStart, onSelectStop }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Desktop: always expanded */}
            <div className="hidden lg:block rounded-xl border border-line bg-surface/90 backdrop-blur px-3 py-2.5">
                <SearchFields onSelectStart={onSelectStart} onSelectStop={onSelectStop} />
            </div>

            {/* Mobile: collapses to a single pill so it doesn't eat into the map */}
            <div className="lg:hidden">
                {open ? (
                    <div className="rounded-xl border border-line bg-surface/95 backdrop-blur px-3 py-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] uppercase tracking-wide text-muted font-mono">Plan route</span>
                            <button
                                onClick={() => setOpen(false)}
                                aria-label="Close search"
                                className="text-muted hover:text-paper"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <SearchFields
                            onSelectStart={(place) => {
                                onSelectStart(place);
                                setOpen(false);
                            }}
                            onSelectStop={(place) => {
                                onSelectStop(place);
                                setOpen(false);
                            }}
                        />
                    </div>
                ) : (
                    <button
                        onClick={() => setOpen(true)}
                        className="flex items-center gap-2 rounded-full border border-line bg-surface/90 backdrop-blur px-3.5 py-2 text-xs text-muted"
                    >
                        <Search size={13} className="text-amber" />
                        Search a starting point or stop
                    </button>
                )}
            </div>
        </>
    );
}
