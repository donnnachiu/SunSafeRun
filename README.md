# SunSafeRun
SunSafeRun app is an interactive React dashboard that helps long-distance runners map out outdoor routes based on solar geometry, live weather, and route bearings. It helps you survive intense summer training blocks without needing half a bottle of sunscreen

# 🚀 Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the local server: `npm run dev`

Open the printed local URL to drop points on the map, draw your route, and slide the time controller to see the exposure shift!

# 🧠 How the Code Works

- Sun Geometry (`sunMath.js`): Wraps `suncalc` to calculate the sun's altitude and azimuth at the starting point based on the simulated time.
- Route Bearing (`routeMath.js`): Computes the great-circle initial bearing per running segment to check your angular difference against the sun (0° = running straight into glare).
- Live Weather Engine (`weatherApi.js`): Pulls hourly UV index and cloud cover metrics from the Open-Meteo API.
- Exposure Model (`exposureModel.js`): Dynamically color-codes segments (Green/Yellow/Red) by calculating UV × altitude × facing factors.
- Metric tooltips (`components/InfoTooltip.jsx`): every stat tile (UV Index, Cloud
  cover, Sun altitude, Sun bearing, Rain risk) has an "i" button that explains the metric
  in plain language on hover or tap.
- Theme toggle (`hooks/useTheme.js`, `components/ThemeToggle.jsx`): a switch in the
  header flips the whole app — panels, text, and the map's own tile layer — between a dark
  and a light palette. The choice is saved to `localStorage` and defaults to your OS-level
  light/dark preference on first visit. Every component reads semantic classes like
  `bg-surface` / `text-paper`; only the CSS variables behind them change
  (`src/index.css`, `.theme-day` vs `.theme-night`), so no component needed per-theme
  forks.
- Sunscreen planner (`utils/sunscreenModel.js`, `components/SunscreenPanel.jsx`):
  optional SPF + run duration fields in the sidebar. Given the forecast UV index at your
  simulated run time, it estimates how many minutes that SPF holds up (derated for sweat,
  capped at 2 hours — see the model file for the exact assumptions) and, if you give it a
  duration, walks the forecast hour-by-hour to produce a timeline of "apply" / "reapply"
  clock times. Duration defaults to a placeholder estimated from your route's distance at
  an easy ~6 min/km pace, fully editable. This is a rough planning heuristic, not medical
  advice — the panel says so, with the assumptions spelled out behind its "i" tooltip.
- Rain risk (`utils/rainModel.js`, `components/RainBanner.jsx`): Open-Meteo's hourly
  `precipitation_probability` and `precipitation` are now fetched alongside UV/cloud data.
  A "Rain risk" stat tile always shows the current forecast; small blue dots under the
  time slider mark which hours of the day carry rain risk so you can see it before you
  commit to a start time; and a pulsing blue banner appears over the map itself whenever
  the *currently selected* simulated time crosses the "rain likely" threshold (60%+
  probability, or meaningful expected rainfall) — a clear, distinct blue signal that never
  gets confused with the green/yellow/red sun-exposure scale.

Built entirely using React, Vite, React-Leaflet, and with the love of Claude AI
