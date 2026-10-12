import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-medium text-zinc-900">{title}</p>
      {hint && <p className="max-w-sm text-sm text-zinc-500">{hint}</p>}
      {children}
    </div>
  );
}
