import {
  CalendarClock,
  Minus,
  Moon,
  Package,
  TrendingUp,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { config } from "@/lib/config";
import type { FlagSeverity, FlagType, InsightFlag } from "@/lib/types";

// Flags always use icon + label + colour together, never colour alone.

const FLAG_ICONS: Record<FlagType, LucideIcon> = {
  progressing: TrendingUp,
  plateau: Minus,
  quiet: Moon,
  no_show: UserX,
  package_low: Package,
  package_expiring: CalendarClock,
};

const SEVERITY_STYLES: Record<FlagSeverity, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-red-200 bg-red-50 text-red-700",
};

const SEVERITY_ICON_STYLES: Record<FlagSeverity, string> = {
  positive: "bg-emerald-100 text-emerald-600",
  warning: "bg-amber-100 text-amber-600",
  critical: "bg-red-100 text-red-600",
};

export function FlagChip({ flag }: { flag: InsightFlag }) {
  const Icon = FLAG_ICONS[flag.type];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${SEVERITY_STYLES[flag.severity]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {flag.label}
    </span>
  );
}

export function FlagChips({ flags, max = 3 }: { flags: InsightFlag[]; max?: number }) {
  const shown = flags.slice(0, max);
  const rest = flags.length - shown.length;
  if (flags.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {shown.map((f, i) => (
        <FlagChip key={i} flag={f} />
      ))}
      {rest > 0 && (
        <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-500">
          +{rest}
        </span>
      )}
    </span>
  );
}

// Full flag with plain-language explanation — used on the profile overview.
export function FlagRow({ flag }: { flag: InsightFlag }) {
  const Icon = FLAG_ICONS[flag.type];
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${SEVERITY_ICON_STYLES[flag.severity]}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-zinc-900">{flag.label}</p>
        <p className="text-sm text-zinc-600">{flag.explanation}</p>
      </div>
    </div>
  );
}

// Package sessions-remaining chip, shared by Today cards / client lists.
export function SessionsLeftChip({ remaining }: { remaining: number }) {
  const low = remaining <= config.packageLowSessions;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
        low
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-zinc-200 bg-zinc-50 text-zinc-600"
      }`}
    >
      <Package className="h-3.5 w-3.5" />
      {remaining} left
    </span>
  );
}
