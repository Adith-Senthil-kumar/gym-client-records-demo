import { create } from "zustand";
import { useSyncExternalStore } from "react";

// Tiny reactivity mechanism: repo functions mutate the in-memory dataset and
// bump this version. Components subscribe to the version and re-read via repo.
// This keeps ALL data access inside lib/repo.ts (easy Supabase swap later).

interface DemoStore {
  version: number;
  bump: () => void;
}

export const useDemoStore = create<DemoStore>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

const alwaysSubscribe = () => () => {};

// True only on the client after hydration (server snapshot is false), so
// components can safely render repo data without hydration mismatches and
// without the setState-in-effect pattern.
export function useHydrated(): boolean {
  return useSyncExternalStore(alwaysSubscribe, () => true, () => false);
}
