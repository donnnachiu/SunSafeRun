// rainModel.js
// Turns Open-Meteo's precipitation_probability (%) and precipitation (mm)
// into a simple 3-tier "should I worry about rain" signal, kept separate
// from the sun-exposure scoring since it's a different kind of risk.

export function classifyRain({ rainProbabilityPct = 0, precipMm = 0 }) {
  if (rainProbabilityPct >= 60 || precipMm >= 1) return 'likely';
  if (rainProbabilityPct >= 30 || precipMm >= 0.2) return 'possible';
  return 'clear';
}

export const RAIN_LABELS = {
  clear: 'Clear',
  possible: 'Possible rain',
  likely: 'Rain likely',
};

// A single, distinct blue family so rain risk never gets confused with the
// green/yellow/red sun-exposure scale used elsewhere in the app.
export const RAIN_COLORS = {
  clear: null,
  possible: '#5FA8D3',
  likely: '#2E7FD4',
};
