"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import { ClientAvatar } from "@/components/ClientAvatar";
import { EmptyState } from "@/components/EmptyState";
import { FlagChips, SessionsLeftChip } from "@/components/FlagChip";
import { daysAgoLabel } from "@/lib/format";
import { getStaffById, listTrainers } from "@/lib/repo";
import { listClientSummaries, useCurrentStaff } from "@/lib/select";
import { useDemoStore } from "@/lib/store";
import type { FlagType } from "@/lib/types";

const FLAG_FILTERS: { type: FlagType; label: string }[] = [
  { type: "quiet", label: "Going quiet" },
  { type: "plateau", label: "Plateau" },
  { type: "no_show", label: "No-show" },
  { type: "package_low", label: "Package low" },
  { type: "package_expiring", label: "Expiring" },
  { type: "progressing", label: "Progressing" },
];

export default function ClientsPage() {
  useDemoStore((s) => s.version);
  const [query, setQuery] = useState("");
  const [trainerFilter, setTrainerFilter] = useState<string | null>(null);
  const [flagFilter, setFlagFilter] = useState<FlagType | null>(null);
  const staff = useCurrentStaff();

  if (!staff) return null;

  // Trainers see only their own clients; front desk and owner see everyone.
  const summaries = listClientSummaries(staff.role === "trainer" ? staff.id : undefined);
  const isOwner = staff.role === "owner";

  let filtered = summaries;
  if (isOwner && trainerFilter) {
    filtered = filtered.filter((s) => s.client.assignedTrainerId === trainerFilter);
  }
  if (flagFilter) {
    filtered = filtered.filter((s) => s.flags.some((f) => f.type === flagFilter));
  }
  const q = query.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter((s) => s.client.name.toLowerCase().includes(q));
  }

  // Front desk does not see workout/measurement-derived flags.
  const showFlags = staff.role !== "frontdesk";
  const showTrainer = staff.role === "owner";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">
          {staff.role === "trainer" ? "My clients" : "Clients"}
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients"
              className="h-10 w-36 rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none sm:w-56"
            />
          </div>
          {(staff.role === "frontdesk" || staff.role === "owner") && (
            <Link
              href="/clients/new"
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Register
            </Link>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="space-y-2">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <FilterChip active={!trainerFilter} onClick={() => setTrainerFilter(null)}>
              All trainers
            </FilterChip>
            {listTrainers().map((t) => (
              <FilterChip
                key={t.id}
                active={trainerFilter === t.id}
                onClick={() => setTrainerFilter(trainerFilter === t.id ? null : t.id)}
              >
                {t.name.split(" ")[0]}
              </FilterChip>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <FilterChip active={!flagFilter} onClick={() => setFlagFilter(null)}>
              All flags
            </FilterChip>
            {FLAG_FILTERS.map(({ type, label }) => (
              <FilterChip
                key={type}
                active={flagFilter === type}
                onClick={() => setFlagFilter(flagFilter === type ? null : type)}
              >
                {label}
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? `No clients matching “${query}”` : "No clients yet"}
          hint={q ? "Try a different search." : "Clients appear here once registered."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(({ client, flags, lastSession, packageInfo }) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 active:bg-zinc-50"
            >
              <ClientAvatar name={client.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-900">
                  {client.name}
                  {showTrainer && (
                    <span className="ml-1.5 text-xs font-normal text-zinc-400">
                      · {getStaffById(client.assignedTrainerId)?.name ?? "unassigned"}
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-zinc-500">{client.goal}</p>
                {showFlags && (
                  <div className="mt-1">
                    <FlagChips flags={flags} max={2} />
                  </div>
                )}
              </div>
              <div className="shrink-0 space-y-1 text-right">
                <p className="text-[11px] text-zinc-400">
                  {staff.role === "frontdesk"
                    ? client.phone
                    : lastSession
                      ? `Seen ${daysAgoLabel(lastSession.date)}`
                      : "No sessions yet"}
                </p>
                {packageInfo && <SessionsLeftChip remaining={packageInfo.remaining} />}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
        active
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-zinc-200 bg-white text-zinc-600"
      }`}
    >
      {children}
    </button>
  );
}
