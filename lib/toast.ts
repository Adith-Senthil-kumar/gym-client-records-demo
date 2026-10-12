import { create } from "zustand";

// Friendly confirmation toasts. showToast() can be called from anywhere
// (event handlers, repo-backed actions) without prop drilling.

export interface Toast {
  id: number;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    setTimeout(() => get().dismiss(id), 2800);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function showToast(message: string): void {
  useToastStore.getState().push(message);
}
