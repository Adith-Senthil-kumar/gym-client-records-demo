"use client";

import { Check } from "lucide-react";
import { useToastStore } from "@/lib/toast";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-8"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full bg-zinc-900 py-2 pl-3 pr-4 text-sm text-white shadow-lg"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/25">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          </span>
          <span className="truncate">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
