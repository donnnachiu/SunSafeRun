// src/components/FilterChips.jsx
import React from 'react';
import { POI_CATEGORIES } from '../constants/poiCategories';

export default function FilterChips({ activeCategories, onToggleCategory, isCollapsed = false }) {
    return (
        <div
            className={`absolute left-4 top-40 z-[1000] bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 transition-all duration-300 ${
                isCollapsed ? 'p-1.5 w-auto' : 'p-3 w-44'
            }`}
        >
            {!isCollapsed && (
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-1 mb-1 block select-none">
          Map Overlays
        </span>
            )}

            <div className={`flex ${isCollapsed ? 'flex-col gap-1.5' : 'flex-col gap-1'}`}>
                {Object.values(POI_CATEGORIES).map((cat) => {
                    const isChecked = activeCategories.includes(cat.id);
                    return (
                        <label
                            key={cat.id}
                            onClick={() => onToggleCategory(cat.id)}
                            className={`flex items-center rounded-xl cursor-pointer transition-colors select-none ${
                                isCollapsed
                                    ? `p-2 ${isChecked ? 'bg-slate-100' : 'opacity-40 hover:opacity-80'}`
                                    : 'justify-between px-2 py-1.5 hover:bg-slate-50'
                            }`}
                            title={cat.label}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-base">{cat.icon}</span>
                                {!isCollapsed && (
                                    <span className="text-xs font-medium text-slate-700">{cat.label}</span>
                                )}
                            </div>

                            {!isCollapsed && (
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}} // Handled by outer label onClick
                                    className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-0 accent-slate-800 cursor-pointer"
                                />
                            )}
                        </label>
                    );
                })}
            </div>
        </div>
    );
}