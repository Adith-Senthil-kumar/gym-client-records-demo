"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft, Ruler } from "lucide-react";
import { RoleNotice } from "@/components/RoleNotice";
import { fmtDay } from "@/lib/format";
import { addMeasurement, getClientById, listMeasurementTypes, listMeasurementsForClient } from "@/lib/repo";
import { useCurrentStaff } from "@/lib/select";
import { showToast } from "@/lib/toast";
import { useDemoStore } from "@/lib/store";

export default function NewMeasurementPage() {
  return (
    <Suspense fallback={null}>
      <NewMeasurementContent />
    </Suspense>
  );
}

function NewMeasurementContent() {
  useDemoStore((s) => s.version);
  const { clientId } = useParams<{ clientId: string }>();
  const staff = useCurrentStaff();
  const router = useRouter();
  const client = getClientById(clientId);
  const [values, setValues] = useState<Record<string, string>>({});

  if (!staff || !client) return null;
  if (staff.role === "frontdesk") return <RoleNotice staff={staff} pageFor="trainers" />;

  const types = listMeasurementTypes();
  const measurements = listMeasurementsForClient(client.id);

  const lastReading = (typeId: string) => {
    const readings = measurements
      .filter((m) => m.typeId === typeId)
      .sort((a, b) => a.date.localeCompare(b.date));
    return readings[readings.length - 1];
  };

  const filledCount = Object.values(values).filter((v) => v.trim() !== "").length;

  const handleSave = () => {
    for (const type of types) {
      const raw = values[type.id]?.trim();
      if (!raw) continue;
      const value = parseFloat(raw);
      if (Number.isNaN(value)) continue;
      addMeasurement({ clientId: client.id, typeId: type.id, value });
    }
    showToast("Measurements saved");
    router.push(`/clients/${client.id}?tab=measurements`);
  };

  return (
    <div className="space-y-5">
      <Link
        href={`/clients/${client.id}?tab=measurements`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500"
      >
        <ArrowLeft className="h-4 w-4" />
        {client.name}
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-900">
          <Ruler className="h-5 w-5 text-indigo-600" />
          Add measurement
        </h1>
        <p className="text-sm text-zinc-500">
          Enter what was measured today — leave the rest blank.
        </p>
      </div>

      <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
        {types.map((type) => {
          const last = lastReading(type.id);
          return (
            <div key={type.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900">
                  {type.name} <span className="text-zinc-400">({type.unit})</span>
                </p>
                <p className="text-xs text-zinc-400">
                  {last ? `Last: ${last.value} ${type.unit} · ${fmtDay(last.date)}` : "No previous reading"}
                </p>
              </div>
              <input
                value={values[type.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [type.id]: e.target.value }))}
                inputMode="decimal"
                type="text"
                placeholder="—"
                aria-label={`${type.name} in ${type.unit}`}
                className="h-11 w-24 rounded-xl border border-zinc-200 px-3 text-center text-sm font-semibold tabular-nums focus:border-indigo-400 focus:outline-none"
              />
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={filledCount === 0}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-40"
      >
        Save {filledCount > 0 ? `${filledCount} measurement${filledCount === 1 ? "" : "s"}` : ""}
      </button>
    </div>
  );
}
