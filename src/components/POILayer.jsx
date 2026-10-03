// src/components/POILayer.jsx
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Toggle debug logging. Automatically true in dev (Vite), false in production builds.
// You can also force it on by setting the env var VITE_POI_DEBUG=true in your .env file.
const DEBUG =
    import.meta.env.DEV || import.meta.env.VITE_POI_DEBUG === 'true';

function createCustomIcon(iconGlyph, color = '#0284C7') {
    const html = `
    <div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      border: 2px solid white;
      font-size: 14px;
    ">
      ${iconGlyph}
    </div>`;

    return L.divIcon({
        html,
        className: 'custom-poi-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15],
    });
}

export default function POILayer({ poiList = [], activeCategories = [] }) {
    // -------------------------------------------------------------------------
    // Debug diagnostics (only run when DEBUG is enabled)
    // -------------------------------------------------------------------------
    if (DEBUG) {
        console.groupCollapsed(
            `[POILayer] render — poiList=${poiList.length}, activeCategories=[${activeCategories.join(', ')}]`
        );

        // Count how many POIs fall into each category (including null/undefined).
        const categoryCounts = poiList.reduce((acc, p) => {
            const k = p.category ?? 'NULL/UNDEFINED';
            acc[k] = (acc[k] || 0) + 1;
            return acc;
        }, {});
        console.log('Category counts in poiList:', categoryCounts);

        // Peek at the first few survivors of the filter.
        const preview = poiList
            .filter((poi) => activeCategories.includes(poi.category))
            .slice(0, 3)
            .map((p) => ({
                id: p.id,
                category: p.category,
                name: p.nameEN || p.nameTC,
            }));
        const visibleCount = poiList.filter((poi) =>
            activeCategories.includes(poi.category)
        ).length;
        console.log(
            `Filter: ${poiList.length} → ${visibleCount} visible`,
            visibleCount > 0 ? preview : '(nothing visible)'
        );

        // Warn about any POIs with a missing category — they will never render.
        const broken = poiList.filter((p) => p.category == null || !p.category);
        if (broken.length > 0) {
            console.warn(
                `${broken.length} POIs have null/undefined category:`,
                broken.slice(0, 5).map((p) => ({
                    id: p.id,
                    name: p.nameEN || p.nameTC,
                    category: p.category,
                }))
            );
        }

        // Detect duplicate React keys — the classic cause of markers that
        // refuse to unmount when the filter changes.
        const seen = new Map();
        const duplicates = [];
        for (const p of poiList) {
            if (seen.has(p.id)) {
                duplicates.push(p.id);
            } else {
                seen.set(p.id, true);
            }
        }
        if (duplicates.length > 0) {
            console.error(
                `Duplicate React keys detected (${duplicates.length}):`,
                duplicates.slice(0, 10)
            );
        }

        console.groupEnd();
    }

    // -------------------------------------------------------------------------
    // Filter POIs by active categories
    // -------------------------------------------------------------------------
    const visiblePois = poiList.filter((poi) =>
        activeCategories.includes(poi.category)
    );

    return (
        <>
            {visiblePois.map((poi) => {
                const {
                    id,
                    lat,
                    lng,
                    icon = '📍',
                    color = '#10B981',
                    name,
                    nameTC,
                    nameEN,
                    address,
                    addressTC,
                    addressEN,
                } = poi;

                const primaryName = nameTC || nameEN || name || 'Facility';
                const secondaryName =
                    nameTC && nameEN && nameTC !== nameEN ? nameEN : null;

                const primaryAddress = addressTC || addressEN || address || '';
                const secondaryAddress =
                    addressTC && addressEN && addressTC !== addressEN
                        ? addressEN
                        : null;

                return (
                    <Marker
                        key={id}
                        position={[lat, lng]}
                        icon={createCustomIcon(icon, color)}
                    >
                        <Popup className="rounded-lg shadow-md">
                            <div className="p-1 max-w-[240px] text-gray-800">
                                {/* Name Header */}
                                <div className="flex items-start gap-2 border-b border-gray-100 pb-2 mb-2">
                                    <span className="text-xl leading-none">{icon}</span>
                                    <div>
                                        <h4 className="font-bold text-sm leading-tight text-gray-900">
                                            {primaryName}
                                        </h4>
                                        {secondaryName && (
                                            <p className="text-xs text-gray-500 font-normal leading-tight mt-0.5">
                                                {secondaryName}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Address Details */}
                                {(primaryAddress || secondaryAddress) && (
                                    <div className="text-xs text-gray-600 space-y-1">
                                        {primaryAddress && (
                                            <p className="flex items-start gap-1 font-medium">
                                                <span className="shrink-0">📍</span>
                                                <span>{primaryAddress}</span>
                                            </p>
                                        )}
                                        {secondaryAddress && (
                                            <p className="text-gray-500 text-[11px] pl-4">
                                                {secondaryAddress}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </>
    );
}