"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ClipboardList,
  History,
  Package,
  Ruler,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClientAvatar } from "@/components/ClientAvatar";
import { EmptyState } from "@/components/EmptyState";
import { FlagRow, SessionsLeftChip } from "@/components/FlagChip";
import { RoleNotice } from "@/components/RoleNotice";
import { daysAgoLabel, fmtDay, isSameDay } from "@/lib/format";
import {
  getExerciseById,
  getStaffById,
  listBookings,
  listMeasurementTypes,
  listMeasurementsForClient,
  listSessionsForClient,
} from "@/lib/repo";
import { getClientSummary, useCurrentStaff } from "@/lib/select";
import { useDemoStore } from "@/lib/store";

const FEEL_EMOJI = ["", "😞", "😕", "😐", "🙂", "😄"];

type Tab = "overview" | "sessions" | "measurements" | "notes";

export default function ClientProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  useDemoStore((s) => s.version);
  const { clientId } = useParams<{ clientId: string }>();
  const searchParams = useSearchParams();
  const staff = useCurrentStaff();
  const summary = getClientSummary(clientId);
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(() =>
    ["overview", "sessions", "measurements", "notes"].includes(requestedTab ?? "")
      ? (requestedTab as Tab)
      : "overview"
  );

  if (!staff) return null;
  if (!summary) {
    return <EmptyState icon={Sparkles} title="Client not found" hint="Reset demo data to restore the seed clients." />;
  }
  // Trainers can only open their own clients; front desk and owner can view any.
  if (staff.role === "trainer" && summary.client.assignedTrainerId !== staff.id) {
    return (
      <RoleNotice
        staff={staff}
        pageFor={`the trainer of ${summary.client.name}`}
      />
    );
  }

  // Front desk never sees workout or measurement tabs.
  const activeTab: Tab =
    staff.role !== "frontdesk" || tab === "overview" || tab === "notes" ? tab : "overview";

  const canSeeDetails = staff.role !== "frontdesk";
  const { client, packageInfo } = summary;
  const trainer = getStaffById(client.assignedTrainerId);

  const todayBooking = listBookings().find(
    (b) =>
      b.clientId === client.id &&
      b.status === "booked" &&
      isSameDay(b.startsAt, new Date())
  );

  return (
    <div className="space-y-5">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 md:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Clients
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <ClientAvatar name={client.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-zinc-900">{client.name}</h1>
          <p className="text-sm text-zinc-500">{client.goal}</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {client.phone} · with {trainer?.name ?? "unassigned"} · since {fmtDay(client.joinedAt)}
          </p>
        </div>
      </div>

      {/* Package status */}
      {packageInfo ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Package className="h-4 w-4 text-zinc-400" />
              {packageInfo.remaining} of {packageInfo.pkg.totalSessions} sessions left
            </p>
            <div className="flex items-center gap-2">
              {(staff.role === "frontdesk" || staff.role === "owner") && (
                <Link
                  href={`/clients/${client.id}/packages/new`}
                  className="text-xs font-semibold text-indigo-600"
                >
                  Add package
                </Link>
              )}
              <SessionsLeftChip remaining={packageInfo.remaining} />
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{
                width: `${Math.min(100, (packageInfo.used / packageInfo.pkg.totalSessions) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-xs text-zinc-400">
            {packageInfo.pkg.expiresAt
              ? `Expires ${fmtDay(packageInfo.pkg.expiresAt)}`
              : "No expiry date"}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          No active package.
          {(staff.role === "frontdesk" || staff.role === "owner") && (
            <Link
              href={`/clients/${client.id}/packages/new`}
              className="shrink-0 text-xs font-semibold text-indigo-600"
            >
              Add package
            </Link>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1">
        {(
          [
            ["overview", "Overview", Sparkles],
            ...(canSeeDetails ? ([["sessions", "Sessions", History]] as const) : []),
            ...(canSeeDetails ? ([["measurements", "Measurements", Ruler]] as const) : []),
            ["notes", "Notes", StickyNote],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              activeTab === key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab summary={summary} canSeeDetails={canSeeDetails} />}
      {activeTab === "sessions" && <SessionsTab clientId={client.id} todayBookingId={todayBooking?.id} />}
      {activeTab === "measurements" && <MeasurementsTab clientId={client.id} />}
      {activeTab === "notes" && <NotesTab summary={summary} />}
    </div>
  );
}

function OverviewTab({
  summary,
  canSeeDetails,
}: {
  summary: NonNullable<ReturnType<typeof getClientSummary>>;
  canSeeDetails: boolean;
}) {
  const { client, flags, lastSession, packageInfo } = summary;
  const sessionsCount = listSessionsForClient(client.id).length;

  return (
    <div className="space-y-4">
      {canSeeDetails ? (
        flags.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No insights yet"
            hint="Flags build up as sessions and measurements are recorded. Keep logging!"
          />
        ) : (
          <div className="space-y-2">
            {flags.map((f, i) => (
              <FlagRow key={i} flag={f} />
            ))}
          </div>
        )
      ) : (
        <p className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          Workout and measurement insights are visible to trainers and the owner.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Sessions" value={String(sessionsCount)} />
        <Stat
          label="Last session"
          value={lastSession ? daysAgoLabel(lastSession.date) : "—"}
        />
        <Stat label="Sessions left" value={packageInfo ? String(packageInfo.remaining) : "—"} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
      <p className="text-base font-bold text-zinc-900">{value}</p>
      <p className="text-[11px] text-zinc-400">{label}</p>
    </div>
  );
}

function SessionsTab({ clientId, todayBookingId }: { clientId: string; todayBookingId?: string }) {
  const sessions = listSessionsForClient(clientId).sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <div className="space-y-3">
      <Link
        href={`/clients/${clientId}/log-session${todayBookingId ? `?booking=${todayBookingId}` : ""}`}
        className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white active:scale-[0.99]"
      >
        <ClipboardList className="h-4 w-4" />
        Log session
      </Link>

      {sessions.length === 0 ? (
        <EmptyState
          icon={History}
          title="No sessions logged yet"
          hint="Log a session after training to start building history."
        />
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <SessionItem key={s.id} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionItem({ session }: { session: ReturnType<typeof listSessionsForClient>[number] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900">{fmtDay(session.date)}</p>
          <p className="truncate text-xs text-zinc-500">
            {session.exercises.length} exercises
            {session.feelRating ? ` · felt ${FEEL_EMOJI[session.feelRating]}` : ""}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-zinc-100 px-4 py-3">
          <dl className="space-y-2">
            {session.exercises.map((ex) => {
              const name = getExerciseById(ex.exerciseId)?.name ?? ex.exerciseId;
              const first = ex.sets[0];
              const uniform = ex.sets.every((s) => s.reps === first.reps && s.weightKg === first.weightKg);
              return (
                <div key={ex.exerciseId} className="flex justify-between text-sm">
                  <dt className="text-zinc-700">{name}</dt>
                  <dd className="tabular-nums text-zinc-500">
                    {uniform
                      ? `${ex.sets.length}×${first.reps} @ ${first.weightKg} kg`
                      : ex.sets.map((s) => `${s.reps}×${s.weightKg}`).join(", ")}
                  </dd>
                </div>
              );
            })}
          </dl>
          {session.notes && (
            <p className="mt-3 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600">{session.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

function MeasurementsTab({ clientId }: { clientId: string }) {
  const types = listMeasurementTypes();
  const measurements = listMeasurementsForClient(clientId);

  return (
    <div className="space-y-4">
      <Link
        href={`/clients/${clientId}/measurements/new`}
        className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white active:scale-[0.99]"
      >
        <Ruler className="h-4 w-4" />
        Add measurement
      </Link>

      {types.every((t) => !measurements.some((m) => m.typeId === t.id)) ? (
        <EmptyState
          icon={Ruler}
          title="No measurements recorded"
          hint="Record body measurements every few weeks to track progress toward the goal."
        />
      ) : (
        types
          .map((type) => ({
            type,
            readings: measurements
              .filter((m) => m.typeId === type.id)
              .sort((a, b) => a.date.localeCompare(b.date)),
          }))
          .filter(({ readings }) => readings.length > 0)
          .map(({ type, readings }) => (
            <div key={type.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold text-zinc-900">{type.name}</p>
                <p className="text-sm text-zinc-500">
                  {readings[readings.length - 1].value} {type.unit} ·{" "}
                  <span className="text-xs text-zinc-400">{fmtDay(readings[readings.length - 1].date)}</span>
                </p>
              </div>
              {readings.length >= 2 && (
                <div className="mt-3 -mx-2">
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart
                      data={readings.map((r) => ({ date: fmtDay(r.date), value: r.value }))}
                      margin={{ top: 5, right: 10, bottom: 0, left: -20 }}
                    >
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value) => [`${value} ${type.unit}`, type.name] as [string, string]}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 12 }}
                      />
                      <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {[...readings].reverse().slice(0, 5).map((r) => (
                    <tr key={r.id} className="border-t border-zinc-100 first:border-t-0">
                      <td className="py-1.5 text-zinc-500">{fmtDay(r.date)}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums text-zinc-900">
                        {r.value} {type.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
      )}
    </div>
  );
}

function NotesTab({ summary }: { summary: NonNullable<ReturnType<typeof getClientSummary>> }) {
  const { client } = summary;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <p className="text-sm font-semibold text-zinc-900">Health & injury notes</p>
        <p className="mt-1.5 text-sm text-zinc-600">
          {client.notes || "No notes recorded."}
        </p>
      </div>
      <p className="px-1 text-xs text-zinc-400">
        Goal: {client.goal} · Joined {fmtDay(client.joinedAt)} · {client.phone}
      </p>
    </div>
  );
}
