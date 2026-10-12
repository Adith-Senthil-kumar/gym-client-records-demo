import { create } from "zustand";
import { config } from "./config";
import { useDemoStore } from "./store";

// The insight thresholds from lib/config.ts, but editable at runtime from the
// owner Settings screen. Every change bumps the global data version so every
// flag on every screen recomputes immediately.

export interface Thresholds {
  plateauWeeks: number;
  plateauMinSessions: number;
  plateauTopExercises: number;
  quietGapMultiplier: number;
  quietMinDays: number;
  packageLowSessions: number;
  packageExpiringDays: number;
  measurementStallByUnit: Record<string, number>;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  plateauWeeks: config.plateauWeeks,
  plateauMinSessions: config.plateauMinSessions,
  plateauTopExercises: config.plateauTopExercises,
  quietGapMultiplier: config.quietGapMultiplier,
  quietMinDays: config.quietMinDays,
  packageLowSessions: config.packageLowSessions,
  packageExpiringDays: config.packageExpiringDays,
  measurementStallByUnit: { ...config.measurementStallByUnit },
};

interface ThresholdsState {
  values: Thresholds;
  setThreshold: <K extends keyof Thresholds>(key: K, value: Thresholds[K]) => void;
  resetThresholds: () => void;
}

export const useThresholdsStore = create<ThresholdsState>((set) => ({
  values: DEFAULT_THRESHOLDS,
  setThreshold: (key, value) => {
    set((s) => ({ values: { ...s.values, [key]: value } }));
    useDemoStore.getState().bump();
  },
  resetThresholds: () => {
    set({
      values: {
        ...DEFAULT_THRESHOLDS,
        measurementStallByUnit: { ...DEFAULT_THRESHOLDS.measurementStallByUnit },
      },
    });
    useDemoStore.getState().bump();
  },
}));

export function currentThresholds(): Thresholds {
  return useThresholdsStore.getState().values;
}
