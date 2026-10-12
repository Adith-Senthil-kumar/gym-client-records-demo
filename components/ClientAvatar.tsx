import { initials } from "@/lib/format";

const PALETTE = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

function colorFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h + ch.charCodeAt(0)) % 997;
  return PALETTE[h % PALETTE.length];
}

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-base",
} as const;

export function ClientAvatar({ name, size = "md" }: { name: string; size?: keyof typeof SIZES }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZES[size]} ${colorFor(name)}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
