"use client";

// Debug page (phase 2): lists every client's computed insight flags so the
// logic can be sanity-checked without the role-based UI. Kept for reviewers.

import { useMemo, useState } from "react";
import { computeAllClientFlags } from "@/lib/insights";
import { getGymData, listTrainers, resetDemoData } from "@/lib/repo";
import { useDemoStore, useHydrated } from "@/lib/store";
import { FlagChip } from "@/components/FlagChip";

const FLAG_ORDER = ["progressing", "plateau", "quiet", "no_show", "package_low", "package_expiring"] as const;

export default function DebugPage() {
  useDemoStore((s) => s.version);
  const hydrated = useHydrated();
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  const insights = useMemo(() => (hydrated ? computeAllClientFlags(getGymData()) : []), [hydrated]);

  if (!hydrated) {
    return (
      <main className="min-h-screen flex items-center justify-center text-zinc-400">
        Loading demo data...
      </main>
    );
  }

  const trainers = listTrainers();
  const counts = Object.fromEntries(
    FLAG_ORDER.map((t) => [t, insights.filter((c) => c.flags.some((f) => f.type === t)).length])
  );
  const visible = insights.filter((c) => !onlyFlagged || c.flags.length > 0);

  return (
    <main className="min-h-screen mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        Debug · insight logic
      </p>
      <h1 className="mt-1 text-2xl font-bold text-zinc-900">Flag debug — all clients</h1>

      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {FLAG_ORDER.map((type) => (
          <div key={type} className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-xl font-bold text-zinc-900">{counts[type]}</p>
            <p className="text-[11px] leading-tight text-zinc-500">{type.replace(/_/g, " ")}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={onlyFlagged}
            onChange={(e) => setOnlyFlagged(e.target.checked)}
            className="h-4 w-4"
          />
          Only flagged clients
        </label>
        <button
          onClick={resetDemoData}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600"
        >
          Reset demo data
        </button>
      </div>

      {trainers.map((trainer) => {
        const rows = visible.filter((c) => c.client.assignedTrainerId === trainer.id);
        if (rows.length === 0) return null;
        return (
          <section key={trainer.id} className="mt-8">
            <h2 className="font-semibold text-zinc-900">
              {trainer.name}{" "}
              <span className="text-sm font-normal text-zinc-400">({rows.length} clients)</span>
            </h2>
            <div className="mt-3 space-y-3">
              {rows.map(({ client, flags }) => {
                const last = getGymData().sessions
                  .filter((s) => s.clientId === client.id)
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .at(-1);
                const daysSinceLast = last
                  ? Math.floor((Date.now() - new Date(last.date).getTime()) / 86_400_000)
                  : null;
                return (
                  <div key={client.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium text-zinc-900">{client.name}</p>
                      <p className="text-xs text-zinc-400">
                        last session{" "}
                        {daysSinceLast === null
                          ? "never"
                          : daysSinceLast === 0
                            ? "today"
                            : `${daysSinceLast} days ago`}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {flags.length === 0 ? (
                        <span className="text-xs text-zinc-400">no flags</span>
                      ) : (
                        flags.map((f, i) => <FlagChip key={i} flag={f} />)
                      )}
                    </div>
                    {flags.length > 0 && (
                      <ul className="mt-2.5 space-y-1">
                        {flags.map((f, i) => (
                          <li key={i} className="text-sm text-zinc-600">
                            <span className="font-mono text-[10px] text-zinc-400">{f.type}</span>{" "}
                            {f.explanation}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
