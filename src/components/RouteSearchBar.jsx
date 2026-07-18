import { MapPin, Flag } from 'lucide-react';
import LocationSearch from './LocationSearch';

export default function RouteSearchBar({ onSelectStart, onSelectStop }) {
  return (
    <div className="rounded-xl border border-line bg-surface/90 backdrop-blur px-3 py-2.5">
      <div className="flex flex-col sm:flex-row gap-2">
        <LocationSearch
          icon={MapPin}
          dotColor="#4C9A6A"
          placeholder="Search starting point…"
          onSelect={onSelectStart}
        />
        <LocationSearch
          icon={Flag}
          dotColor="#D64545"
          placeholder="Add a stop…"
          onSelect={onSelectStop}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-muted/70">Search by OpenStreetMap Nominatim</p>
    </div>
  );
}
