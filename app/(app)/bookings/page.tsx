"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { RoleNotice } from "@/components/RoleNotice";
import { fmtTime, fmtWeekdayDay, isSameDay, toDateInputValue } from "@/lib/format";
import {
  addBooking,
  getActivePackageForClient,
  getClientById,
  listBookings,
  listClients,
  listTrainers,
  setBookingStatus,
} from "@/lib/repo";
import { useCurrentStaff } from "@/lib/select";
import { showToast } from "@/lib/toast";
import { useDemoStore } from "@/lib/store";
import type { Booking, BookingStatus } from "@/lib/types";

const STATUS_STYLES: Record<BookingStatus, string> = {
  booked: "border-indigo-200 bg-indigo-50 text-indigo-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  no_show: "border-amber-200 bg-amber-50 text-amber-800",
  cancelled: "border-zinc-200 bg-zinc-100 text-zinc-500",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  booked: "Booked",
  completed: "Completed",
  no_show: "No-show",
  cancelled: "Cancelled",
};

export default function BookingsPage() {
  useDemoStore((s) => s.version);
  const staff = useCurrentStaff();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [showCreate, setShowCreate] = useState(false);

  if (!staff) return null;
  if (staff.role === "trainer") return <RoleNotice staff={staff} pageFor="the front desk" />;

  const dayBookings = listBookings()
    .filter((b) => isSameDay(b.startsAt, viewDate))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const trainers = listTrainers().filter((t) =>
    dayBookings.some((b) => b.trainerId === t.id)
  );

  const isToday = isSameDay(viewDate, new Date());

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Bookings</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-sm font-semibold text-white active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          New booking
        </button>
      </div>

      {/* Date switcher */}
      <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-2">
        <button
          onClick={() => shiftDay(-1)}
          aria-label="Previous day"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-600 active:bg-zinc-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-900">{fmtWeekdayDay(viewDate)}</p>
          {!isToday && (
            <button
              onClick={() => setViewDate(new Date())}
              className="text-xs font-medium text-indigo-600"
            >
              Back to today
            </button>
          )}
        </div>
        <button
          onClick={() => shiftDay(1)}
          aria-label="Next day"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-600 active:bg-zinc-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {dayBookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={`No bookings on ${fmtWeekdayDay(viewDate)}`}
          hint="Create one with the New booking button — pick a client, a trainer and a time."
        />
      ) : (
        trainers.map((trainer) => {
          const rows = dayBookings.filter((b) => b.trainerId === trainer.id);
          return (
            <section key={trainer.id}>
              <h2 className="mb-2 text-sm font-semibold text-zinc-500">
                {trainer.name}
                <span className="ml-1.5 font-normal text-zinc-400">({rows.length})</span>
              </h2>
              <div className="space-y-2">
                {rows.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </div>
            </section>
          );
        })
      )}

      {showCreate && (
        <CreateBookingDialog defaultDate={viewDate} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );

  function shiftDay(dir: 1 | -1) {
    setViewDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + dir);
      return next;
    });
  }
}

function BookingRow({ booking }: { booking: Booking }) {
  const client = getClientById(booking.clientId);
  const dimmed = booking.status === "cancelled";

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      <p className="w-16 shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
        {fmtTime(booking.startsAt)}
      </p>
      <Link
        href={`/clients/${booking.clientId}`}
        className={`min-w-0 flex-1 truncate font-medium text-zinc-900 ${dimmed ? "line-through" : ""}`}
      >
        {client?.name ?? booking.clientId}
      </Link>
      <div className="relative shrink-0">
        <select
          value={booking.status}
          onChange={(e) => {
            const status = e.target.value as BookingStatus;
            setBookingStatus(booking.id, status);
            showToast(`${client?.name ?? "Booking"} marked ${STATUS_LABELS[status].toLowerCase()}`);
          }}
          aria-label={`Status for ${client?.name ?? "booking"}`}
          className={`h-9 max-w-32 appearance-none rounded-full border pl-3 pr-7 text-xs font-semibold focus:outline-none ${STATUS_STYLES[booking.status]}`}
        >
          {(Object.keys(STATUS_LABELS) as BookingStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-60" />
      </div>
    </div>
  );
}

function CreateBookingDialog({
  defaultDate,
  onClose,
}: {
  defaultDate: Date;
  onClose: () => void;
}) {
  const clients = listClients();
  const trainers = listTrainers();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [trainerId, setTrainerId] = useState("");
  const [date, setDate] = useState(toDateInputValue(defaultDate));
  const [time, setTime] = useState("07:00");

  const canSave = clientId && trainerId && date && time;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-zinc-900">New booking</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSave) return;
            const startsAt = new Date(`${date}T${time}`).toISOString();
            addBooking({
              clientId,
              trainerId,
              startsAt,
              // Link to the client's active package so completed sessions count.
              packageId: getActivePackageForClient(clientId)?.id,
            });
            showToast("Booking created");
            onClose();
          }}
          className="space-y-3"
        >
          <Field label="Client">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-indigo-400 focus:outline-none"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Trainer">
            <select
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-indigo-400 focus:outline-none"
            >
              <option value="" disabled>
                Choose a trainer…
              </option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex gap-3">
            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </Field>
            <Field label="Time">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={!canSave}
            className="h-12 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white disabled:opacity-40"
          >
            Create booking
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block flex-1">
      <span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
