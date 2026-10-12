"use client";

import Link from "next/link";
import { CalendarDays, Check, ChevronRight, ClipboardList } from "lucide-react";
import { ClientAvatar } from "@/components/ClientAvatar";
import { EmptyState } from "@/components/EmptyState";
import { FlagChips, SessionsLeftChip } from "@/components/FlagChip";
import { RoleNotice } from "@/components/RoleNotice";
import { daysAgoLabel, fmtLongDay, fmtTime, fmtWeight, isSameDay } from "@/lib/format";
import { getExerciseById, getClientById, listBookings, listSessions } from "@/lib/repo";
import { listClientSummaries, type ClientSummary, useCurrentStaff } from "@/lib/select";
import { useDemoStore } from "@/lib/store";

export default function TodayPage() {
  useDemoStore((s) => s.version);
  const staff = useCurrentStaff();

  if (!staff) return null;
  if (staff.role !== "trainer") return <RoleNotice staff={staff} pageFor="trainers" />;

  const now = new Date();
  const summaries = listClientSummaries(staff.id, now);
  const byClientId = new Map(summaries.map((s) => [s.client.id, s]));

  const bookingsToday = listBookings()
    .filter(
      (b) => b.trainerId === staff.id && b.status === "booked" && isSameDay(b.startsAt, now)
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const loggedToday = listSessions().filter(
    (s) => s.trainerId === staff.id && isSameDay(s.date, now)
  );

  const attention = summaries
    .filter((s) => s.flags.some((f) => f.severity !== "positive"))
    .sort((a, b) => (b.daysSinceLastSession ?? 0) - (a.daysSinceLastSession ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Today</h1>
        <p className="text-sm text-zinc-500">{fmtLongDay(now)}</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">
          {bookingsToday.length > 0 ? "Booked today" : "Schedule"}
        </h2>
        {bookingsToday.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No sessions booked today"
            hint="Your day is clear — enjoy the rest. New bookings appear here as the front desk adds them."
          />
        ) : (
          <div className="space-y-3">
            {bookingsToday.map((booking) => {
              const summary = byClientId.get(booking.clientId);
              if (!summary) return null;
              return (
                <TodayCard
                  key={booking.id}
                  bookingId={booking.id}
                  summary={summary}
                  time={fmtTime(booking.startsAt)}
                />
              );
            })}
          </div>
        )}
      </section>

      {attention.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">Needs attention</h2>
          <div className="space-y-2">
            {attention.map(({ client, flags, daysSinceLastSession }) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 active:bg-zinc-50"
              >
                <ClientAvatar name={client.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{client.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {flags.find((f) => f.severity !== "positive")?.explanation}
                  </p>
                </div>
                <p className="shrink-0 text-[11px] text-zinc-400">
                  {daysSinceLastSession === null
                    ? "never"
                    : daysSinceLastSession === 0
                      ? "today"
                      : `${daysSinceLastSession}d ago`}
                </p>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {loggedToday.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">Logged today</h2>
          <div className="space-y-2">
            {loggedToday.map((s) => {
              const client = getClientById(s.clientId);
              return (
                <Link
                  key={s.id}
                  href={`/clients/${s.clientId}`}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 active:bg-zinc-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-4 w-4" />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">
                    {client?.name ?? s.clientId}
                  </p>
                  <p className="shrink-0 text-xs text-zinc-400">{s.exercises.length} exercises</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function TodayCard({
  bookingId,
  summary,
  time,
}: {
  bookingId: string;
  summary: ClientSummary;
  time: string;
}) {
  const { client, flags, lastSession, packageInfo } = summary;
  const summaryLine = lastSession ? lastSessionSummary(lastSession) : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <Link href={`/clients/${client.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <ClientAvatar name={client.name} />
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold text-zinc-900">
              <span className="truncate">{client.name}</span>
              <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                {time}
              </span>
            </p>
            {summaryLine ? (
              <>
                <p className="truncate text-xs text-zinc-500">{summaryLine}</p>
                {lastSession?.notes && (
                  <p className="truncate text-xs italic text-zinc-400">“{lastSession.notes}”</p>
                )}
              </>
            ) : (
              <p className="text-xs text-zinc-400">First session — no history yet</p>
            )}
          </div>
        </Link>
        <Link
          href={`/clients/${client.id}/log-session?booking=${bookingId}`}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-sm font-semibold text-white active:scale-[0.98]"
        >
          <ClipboardList className="h-4 w-4" />
          Log
        </Link>
      </div>
      {(flags.length > 0 || packageInfo) && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-100 px-4 py-2.5">
          <FlagChips flags={flags} />
          {packageInfo && <SessionsLeftChip remaining={packageInfo.remaining} />}
        </div>
      )}
    </div>
  );
}

// "Last: 3 days ago — Squat 3×8 @ 60 kg · Bench Press 3×8 @ 47.5 kg (+1 more)"
function lastSessionSummary(session: NonNullable<ClientSummary["lastSession"]>) {
  const parts = session.exercises.slice(0, 2).map((ex) => {
    const exName = getExerciseById(ex.exerciseId)?.name ?? ex.exerciseId;
    const best = ex.sets.reduce((m, s) => (s.weightKg > m.weightKg ? s : m), ex.sets[0]);
    return `${exName} ${ex.sets.length}×${best.reps} @ ${fmtWeight(best.weightKg)}`;
  });
  if (session.exercises.length > 2) parts.push(`+${session.exercises.length - 2} more`);
  return `Last: ${daysAgoLabel(session.date)} — ${parts.join(" · ")}`;
}
