"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, ClipboardCheck, Copy, TrendingUp, UserRound, Users } from "lucide-react";
import { ClientAvatar } from "@/components/ClientAvatar";
import { EmptyState } from "@/components/EmptyState";
import { FlagChip, SessionsLeftChip } from "@/components/FlagChip";
import { RoleNotice } from "@/components/RoleNotice";
import { fmtDay } from "@/lib/format";
import { followUpMessage } from "@/lib/insights";
import { getGymData, getGym, getStaffById, listStaff } from "@/lib/repo";
import { listClientSummaries, useCurrentStaff, type ClientSummary } from "@/lib/select";
import { showToast } from "@/lib/toast";
import { currentThresholds } from "@/lib/thresholds";
import { useDemoStore } from "@/lib/store";
import type { InsightFlag } from "@/lib/types";

const DAY = 86_400_000;

export default function OverviewPage() {
  useDemoStore((s) => s.version);
  const staff = useCurrentStaff();

  if (!staff) return null;
  if (staff.role !== "owner") return <RoleNotice staff={staff} pageFor="the owner" />;

  const now = new Date();
  const th = currentThresholds();
  const gymName = getGym().name;
  const data = getGymData();
  const summaries = listClientSummaries();
  const trainers = listStaff().filter((s) => s.role === "trainer");

  // --- KPIs ---------------------------------------------------------------
  const activeClients = summaries.filter(
    (s) => s.daysSinceLastSession !== null && s.daysSinceLastSession <= 30
  ).length;
  const sessionsThisWeek = data.sessions.filter(
    (s) => new Date(s.date).getTime() >= now.getTime() - 7 * DAY
  ).length;
  const atRisk = summaries.filter((s) => s.flags.some((f) => f.severity !== "positive"));
  const endingSoon = summaries.filter((s) => {
    const pi = s.packageInfo;
    if (!pi) return false;
    const low = pi.remaining <= th.packageLowSessions;
    const expiring =
      pi.pkg.expiresAt !== undefined &&
      new Date(pi.pkg.expiresAt).getTime() - now.getTime() <= th.packageExpiringDays * DAY;
    return low || expiring;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Overview</h1>
        <p className="text-sm text-zinc-500">
          Everything across {trainers.length} trainers · {gymName}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={Users} label="Active clients" value={activeClients} hint="trained in last 30 days" />
        <Kpi icon={CalendarDays} label="Sessions this week" value={sessionsThisWeek} hint="last 7 days" />
        <Kpi icon={UserRound} label="Clients at risk" value={atRisk.length} hint="warnings & no-shows" />
        <Kpi icon={ClipboardCheck} label="Packages ending" value={endingSoon.length} hint="low or expiring soon" />
      </div>

      <AtRiskTable atRisk={atRisk} gymName={gymName} />

      <SessionVolume sessions={data.sessions} trainers={trainers.map((t) => ({ id: t.id, name: t.name }))} now={now} />

      <RenewalList endingSoon={endingSoon} now={now} />

      <LoggingConsistency
        bookings={data.bookings}
        sessions={data.sessions}
        trainers={trainers.map((t) => ({ id: t.id, name: t.name }))}
        now={now}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <Icon className="h-5 w-5 text-indigo-500" />
      <p className="mt-2 text-2xl font-bold text-zinc-900 tabular-nums">{value}</p>
      <p className="text-xs font-medium text-zinc-600">{label}</p>
      <p className="text-[11px] text-zinc-400">{hint}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// At-risk clients
// ---------------------------------------------------------------------------

const TYPE_RANK: Record<string, number> = {
  quiet: 0,
  no_show: 1,
  package_low: 2,
  package_expiring: 3,
  plateau: 4,
};

function primaryRiskFlag(flags: InsightFlag[]): InsightFlag | undefined {
  return flags
    .filter((f) => f.severity !== "positive")
    .sort(
      (a, b) =>
        (b.severity === "critical" ? 1 : 0) - (a.severity === "critical" ? 1 : 0) ||
        TYPE_RANK[a.type] - TYPE_RANK[b.type]
    )[0];
}

function AtRiskTable({
  atRisk,
  gymName,
}: {
  atRisk: ClientSummary[];
  gymName: string;
}) {
  const rows = [...atRisk].sort((a, b) => {
    const pa = primaryRiskFlag(a.flags);
    const pb = primaryRiskFlag(b.flags);
    return (
      (pb!.severity === "critical" ? 1 : 0) - (pa!.severity === "critical" ? 1 : 0) ||
      (b.daysSinceLastSession ?? 0) - (a.daysSinceLastSession ?? 0)
    );
  });

  const copyMessage = (summary: ClientSummary, flag: InsightFlag) => {
    const trainer = getStaffById(summary.client.assignedTrainerId);
    const message = followUpMessage(summary.client, flag, {
      trainerName: trainer?.name ?? "Your trainer",
      gymName,
      daysSinceLast: summary.daysSinceLastSession,
      sessionsLeft: summary.packageInfo?.remaining,
    });
    navigator.clipboard
      .writeText(message)
      .then(() => showToast("Follow-up message copied"))
      .catch(() => showToast("Couldn't copy on this device"));
  };

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-zinc-500">At-risk clients</h2>
      {rows.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No clients at risk" hint="Everyone is on track — nice week." />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {rows.map((s) => {
              const flag = primaryRiskFlag(s.flags)!;
              return (
                <div key={s.client.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <ClientAvatar name={s.client.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/clients/${s.client.id}`} className="font-medium text-zinc-900">
                        {s.client.name}
                      </Link>
                      <p className="text-xs text-zinc-400">
                        {getStaffById(s.client.assignedTrainerId)?.name}
                      </p>
                    </div>
                    <button
                      onClick={() => copyMessage(s, flag)}
                      className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 text-xs font-medium text-zinc-600 active:bg-zinc-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600">{flag.explanation}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <FlagChip flag={flag} />
                    {s.packageInfo && <SessionsLeftChip remaining={s.packageInfo.remaining} />}
                    <span className="text-[11px] text-zinc-400">
                      last session{" "}
                      {s.daysSinceLastSession === null ? "never" : `${s.daysSinceLastSession}d ago`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                  <th className="px-4 py-2.5 font-medium">Client</th>
                  <th className="px-4 py-2.5 font-medium">Reason</th>
                  <th className="px-4 py-2.5 font-medium">Last session</th>
                  <th className="px-4 py-2.5 font-medium">Sessions left</th>
                  <th className="px-4 py-2.5 font-medium">Trainer</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const flag = primaryRiskFlag(s.flags)!;
                  return (
                    <tr key={s.client.id} className="border-b border-zinc-50 last:border-t-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/clients/${s.client.id}`}
                          className="flex items-center gap-2 font-medium text-zinc-900"
                        >
                          <ClientAvatar name={s.client.name} size="sm" />
                          {s.client.name}
                        </Link>
                      </td>
                      <td className="max-w-72 px-4 py-3 text-zinc-600">{flag.explanation}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {s.daysSinceLastSession === null ? "never" : `${s.daysSinceLastSession}d ago`}
                      </td>
                      <td className="px-4 py-3">
                        {s.packageInfo ? (
                          <SessionsLeftChip remaining={s.packageInfo.remaining} />
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {getStaffById(s.client.assignedTrainerId)?.name}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => copyMessage(s, flag)}
                          className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy follow-up
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Session volume (last 6 weeks, per trainer)
// ---------------------------------------------------------------------------

const TRAINER_COLORS = ["#4f46e5", "#38bdf8", "#8b5cf6", "#34d399"];

function SessionVolume({
  sessions,
  trainers,
  now,
}: {
  sessions: ReturnType<typeof getGymData>["sessions"];
  trainers: { id: string; name: string }[];
  now: Date;
}) {
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(now.getTime() - (6 - i) * 7 * DAY);
    const end = new Date(now.getTime() - (5 - i) * 7 * DAY);
    return { start, end, label: fmtDay(start) };
  });

  const volume = weeks.map((w) => {
    const row: Record<string, string | number> = { week: w.label };
    for (const t of trainers) {
      row[t.name] = sessions.filter(
        (s) =>
          s.trainerId === t.id &&
          new Date(s.date) >= w.start &&
          new Date(s.date) < w.end
      ).length;
    }
    return row;
  });

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-zinc-500">Session volume — last 6 weeks</h2>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={volume} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="#f4f4f5" />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {trainers.map((t, i) => (
              <Bar key={t.id} dataKey={t.name} fill={TRAINER_COLORS[i % TRAINER_COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Renewal opportunities
// ---------------------------------------------------------------------------

function RenewalList({
  endingSoon,
  now,
}: {
  endingSoon: ClientSummary[];
  now: Date;
}) {
  const rows = [...endingSoon].sort((a, b) => a.client.name.localeCompare(b.client.name));

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-zinc-500">Packages — renewal opportunities</h2>
      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No packages need attention"
          hint="Nothing running low or expiring right now."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((s) => {
            const pi = s.packageInfo!;
            const low = pi.remaining <= currentThresholds().packageLowSessions;
            const daysLeft = pi.pkg.expiresAt
              ? Math.ceil((new Date(pi.pkg.expiresAt).getTime() - now.getTime()) / DAY)
              : null;
            const expiring = daysLeft !== null && daysLeft <= currentThresholds().packageExpiringDays;
            return (
              <div
                key={s.client.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <ClientAvatar name={s.client.name} size="sm" />
                <Link href={`/clients/${s.client.id}`} className="font-medium text-zinc-900">
                  {s.client.name}
                </Link>
                <span className="text-xs text-zinc-400">
                  {getStaffById(s.client.assignedTrainerId)?.name}
                </span>
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  {low && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                      {pi.remaining === 0 ? "Package used up" : `Only ${pi.remaining} left`}
                    </span>
                  )}
                  {expiring && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                      {daysLeft! <= 0 ? "Expired" : `Expires in ${daysLeft}d`}
                    </span>
                  )}
                  <SessionsLeftChip remaining={pi.remaining} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Logging consistency (operational metric — deliberately NOT a ranking)
// ---------------------------------------------------------------------------

function LoggingConsistency({
  bookings,
  sessions,
  trainers,
  now,
}: {
  bookings: ReturnType<typeof getGymData>["bookings"];
  sessions: ReturnType<typeof getGymData>["sessions"];
  trainers: { id: string; name: string }[];
  now: Date;
}) {
  const since = new Date(now.getTime() - 56 * DAY);

  const stats = trainers.map((t) => {
    const completed = bookings.filter(
      (b) => b.trainerId === t.id && b.status === "completed" && new Date(b.startsAt) >= since
    );
    const logged = completed.filter((b) => sessions.some((s) => s.bookingId === b.id));
    const pct = completed.length === 0 ? null : Math.round((logged.length / completed.length) * 100);
    return { t, completed: completed.length, logged: logged.length, pct };
  });

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-zinc-500">Logging consistency</h2>
      <p className="mb-3 text-xs text-zinc-400">
        Share of completed bookings that also have a logged session (last 8 weeks). Helps spot where
        follow-ups rely on memory instead of records.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(({ t, completed, logged, pct }) => (
          <div key={t.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-sm font-medium text-zinc-900">{t.name}</p>
            {pct === null ? (
              <p className="mt-2 text-sm text-zinc-400">No completed bookings yet</p>
            ) : (
              <>
                <p className="mt-1 text-2xl font-bold text-zinc-900 tabular-nums">{pct}%</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={`h-full rounded-full ${pct >= 90 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-400">
                  {logged} of {completed} completed bookings logged
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
