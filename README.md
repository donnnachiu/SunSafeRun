# SunSafeRun
SunSafeRun app is an interactive React dashboard that helps long-distance runners map out outdoor routes based on solar geometry, live weather, and route bearings. It helps you survive intense summer training blocks without needing half a bottle of sunscreen

# 🚀 Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the local server: `npm run dev`

Open the printed local URL to drop points on the map, draw your route, and slide the time controller to see the exposure shift!

# 🧠 How the Code Works

- Sun Geometry (`sunMath.js`):** Wraps `suncalc` to calculate the sun's altitude and azimuth at the starting point based on the simulated time.
- Route Bearing (`routeMath.js`):** Computes the great-circle initial bearing per running segment to check your angular difference against the sun (0° = running straight into glare).
- Live Weather Engine (`weatherApi.js`):** Pulls hourly UV index and cloud cover metrics from the Open-Meteo API.
- Exposure Model (`exposureModel.js`):** Dynamically color-codes segments (Green/Yellow/Red) by calculating UV × altitude × facing factors.

Built entirely using React, Vite, React-Leaflet, and with the love of Claude AI
