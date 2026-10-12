"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { RoleNotice } from "@/components/RoleNotice";
import { addClient, listTrainers } from "@/lib/repo";
import { useCurrentStaff } from "@/lib/select";
import { showToast } from "@/lib/toast";
import { useDemoStore } from "@/lib/store";

export default function RegisterClientPage() {
  useDemoStore((s) => s.version);
  const staff = useCurrentStaff();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [goal, setGoal] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [notes, setNotes] = useState("");

  if (!staff) return null;
  if (staff.role === "trainer") {
    return <RoleNotice staff={staff} pageFor="the front desk" />;
  }

  const trainers = listTrainers();
  const canSave = name.trim() !== "" && trainerId !== "";

  return (
    <div className="mx-auto max-w-md space-y-5">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-zinc-500">
        <ArrowLeft className="h-4 w-4" />
        Clients
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-900">
          <UserPlus className="h-5 w-5 text-indigo-600" />
          Register client
        </h1>
        <p className="text-sm text-zinc-500">New members get an active package added next.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          const client = addClient({
            name: name.trim(),
            phone: phone.trim(),
            goal: goal.trim(),
            assignedTrainerId: trainerId,
            notes: notes.trim(),
          });
          showToast(`${client.name} registered`);
          router.push(`/clients/${client.id}`);
        }}
        className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
      >
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">Full name *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="e.g. Nisha Agarwal"
            className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            type="tel"
            className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">Goal</span>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Fat loss — target 65 kg"
            className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">Assigned trainer *</span>
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
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">
            Health & injury notes
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the trainers should know…"
            rows={3}
            className="w-full rounded-xl border border-zinc-200 p-3 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={!canSave}
          className="h-12 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white disabled:opacity-40"
        >
          Register client
        </button>
      </form>
    </div>
  );
}
