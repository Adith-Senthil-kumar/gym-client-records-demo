"use client";

import { useState } from "react";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { RoleNotice } from "@/components/RoleNotice";
import { Stepper } from "@/components/Stepper";
import { addMeasurementType, listMeasurementTypes, listStaff, removeMeasurementType, resetDemoData } from "@/lib/repo";
import { useCurrentStaff } from "@/lib/select";
import { showToast } from "@/lib/toast";
import { useThresholdsStore } from "@/lib/thresholds";
import { useDemoStore } from "@/lib/store";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  frontdesk: "Front desk",
  trainer: "Trainer",
};

export default function SettingsPage() {
  useDemoStore((s) => s.version);
  const staff = useCurrentStaff();

  if (!staff) return null;
  if (staff.role !== "owner") return <RoleNotice staff={staff} pageFor="the owner" />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-xl font-bold text-zinc-900">Settings</h1>

      <DemoDataSection />
      <ThresholdsSection />
      <MeasurementTypesSection />
      <StaffSection />

      <p className="px-1 text-xs text-zinc-400">
        Coming later: payments & billing, client-facing app, reminders & notifications.
      </p>
    </div>
  );
}

function DemoDataSection() {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-semibold text-zinc-900">Demo data</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Restore the original seeded clients, sessions and measurements.
      </p>
      <button
        onClick={() => {
          resetDemoData();
          showToast("Demo data reset");
        }}
        className="mt-3 flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 active:bg-zinc-50"
      >
        <RotateCcw className="h-4 w-4 text-zinc-400" />
        Reset demo data
      </button>
    </section>
  );
}

function ThresholdsSection() {
  const values = useThresholdsStore((s) => s.values);
  const setThreshold = useThresholdsStore((s) => s.setThreshold);
  const resetThresholds = useThresholdsStore((s) => s.resetThresholds);

  const rows: { key: keyof typeof values; label: string; hint: string; step: number }[] = [
    { key: "plateauWeeks", label: "Plateau window", hint: "weeks without an increase before flagging a lift", step: 1 },
    { key: "plateauMinSessions", label: "Min sessions in window", hint: "logged sessions required to judge a plateau", step: 1 },
    { key: "quietGapMultiplier", label: "Going-quiet multiplier", hint: "× the client's own usual gap between sessions", step: 0.5 },
    { key: "packageLowSessions", label: "Package low", hint: "flag when sessions left are at or below this", step: 1 },
    { key: "packageExpiringDays", label: "Expiry warning", hint: "flag packages expiring within this many days", step: 1 },
  ];

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Insight thresholds</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Flags update live everywhere — try raising the quiet multiplier and watch clients leave
            the at-risk list.
          </p>
        </div>
        <button
          onClick={() => {
            resetThresholds();
            showToast("Thresholds restored to defaults");
          }}
          className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-500 active:bg-zinc-50"
        >
          Defaults
        </button>
      </div>
      <div className="mt-3 divide-y divide-zinc-100">
        {rows.map(({ key, label, hint, step }) => (
          <div key={key} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900">{label}</p>
              <p className="text-[11px] text-zinc-400">{hint}</p>
            </div>
            <Stepper
              value={values[key] as number}
              onChange={(next) => setThreshold(key, next)}
              step={step}
              ariaLabel={label}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function MeasurementTypesSection() {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("cm");
  const types = listMeasurementTypes();

  const add = () => {
    if (!name.trim()) return;
    addMeasurementType({ name: name.trim(), unit: unit.trim() || "—" });
    setName("");
    showToast("Measurement type added");
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-semibold text-zinc-900">Measurement types</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        What trainers record in the Add measurement form. Removing a type also removes its recorded
        values.
      </p>
      <div className="mt-3 divide-y divide-zinc-100">
        {types.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-2.5">
            <p className="text-sm text-zinc-800">
              {t.name} <span className="text-zinc-400">({t.unit})</span>
            </p>
            <button
              onClick={() => {
                removeMeasurementType(t.id);
                showToast("Measurement type removed");
              }}
              aria-label={`Remove ${t.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Neck"
          className="h-11 flex-1 rounded-xl border border-zinc-200 px-3 text-sm focus:border-indigo-400 focus:outline-none"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="cm"
          className="h-11 w-20 rounded-xl border border-zinc-200 px-3 text-center text-sm focus:border-indigo-400 focus:outline-none"
        />
        <button
          onClick={add}
          disabled={!name.trim()}
          className="flex h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </section>
  );
}

function StaffSection() {
  const staff = listStaff();
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-semibold text-zinc-900">Staff</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Everyone with access to this gym in the demo — switch between them from the top bar.
      </p>
      <div className="mt-3 divide-y divide-zinc-100">
        {staff.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2.5">
            <p className="text-sm text-zinc-800">{s.name}</p>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-500">
              {ROLE_LABEL[s.role]}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-400">
        <Minus className="h-3 w-3" />
        Adding and editing staff is not part of this demo.
      </p>
    </section>
  );
}
