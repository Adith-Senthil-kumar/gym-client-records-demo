// Single place to tune every insight threshold. The owner Settings screen
// (phase 5) will edit these values at runtime; keep everything plain data.

export const config = {
  // Plateau: best weight on a top exercise has not increased for N weeks...
  plateauWeeks: 4,
  // ...and the client has at least this many logged sessions inside that window.
  plateauMinSessions: 3,
  // A tracked measurement counts as stalled when it changed less than this,
  // per unit, over plateauWeeks.
  measurementStallByUnit: { kg: 0.5, "%": 0.5, cm: 1 } as Record<string, number>,
  // Going quiet: days since last session exceed the client's OWN median gap
  // between sessions by this multiplier (and they still have sessions left).
  quietGapMultiplier: 2,
  // Never flag "quiet" before this many days have passed since the last session
  // (keeps brand-new or very-frequent clients out of trouble).
  quietMinDays: 7,
  // Package low: this many sessions (or fewer) remaining.
  packageLowSessions: 2,
  // Package expiring: expires within this many days.
  packageExpiringDays: 14,
  // How many of the client's most frequently logged exercises to check for plateaus.
  plateauTopExercises: 3,
  // Direction that counts as "moving toward the goal" for a measurement,
  // inferred from the measurement type NAME (works for custom types too).
  // Anything not matching either list counts in both directions.
  progressDirections: {
    downKeywords: ["fat", "waist", "hips"],
    upKeywords: ["chest", "arm", "thigh", "shoulder"],
  },
} as const;

export const GYM_ID = "gym-1";

export const STORAGE_KEY = "gym-demo-data";
export const STORAGE_VERSION = 1;
