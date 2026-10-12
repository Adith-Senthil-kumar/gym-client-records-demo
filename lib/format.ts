// Small display-formatting helpers shared across screens.

const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const longDayFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function fmtDay(date: Date | string): string {
  return dayFmt.format(new Date(date));
}

export function fmtLongDay(date: Date): string {
  return longDayFmt.format(date);
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function fmtWeight(kg: number): string {
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg`;
}

// "today" / "yesterday" / "3 days ago" / falls back to a date after 30 days.
export function daysAgoLabel(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  if (d < 30) return `${Math.floor(d)} days ago`;
  return fmtDay(iso);
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// "2026-10-12" — for native date inputs (local time, not UTC).
export function toDateInputValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// "Mon 12 Oct"
export function fmtWeekdayDay(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
