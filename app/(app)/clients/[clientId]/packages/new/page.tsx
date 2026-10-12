"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { RoleNotice } from "@/components/RoleNotice";
import { toDateInputValue } from "@/lib/format";
import { addPackage, getClientById } from "@/lib/repo";
import { useCurrentStaff } from "@/lib/select";
import { showToast } from "@/lib/toast";
import { useDemoStore } from "@/lib/store";

export default function NewPackagePage() {
  return (
    <Suspense fallback={null}>
      <NewPackageContent />
    </Suspense>
  );
}

function NewPackageContent() {
  useDemoStore((s) => s.version);
  const { clientId } = useParams<{ clientId: string }>();
  const staff = useCurrentStaff();
  const router = useRouter();
  const client = getClientById(clientId);
  const [totalSessions, setTotalSessions] = useState("20");
  const [purchasedAt, setPurchasedAt] = useState(toDateInputValue(new Date()));
  const [expiresAt, setExpiresAt] = useState("");

  if (!staff) return null;
  if (staff.role === "trainer") {
    return <RoleNotice staff={staff} pageFor="the front desk" />;
  }
  if (!client) {
    return <p className="text-sm text-zinc-500">Client not found.</p>;
  }

  const total = parseInt(totalSessions, 10);
  const canSave = !Number.isNaN(total) && total > 0 && purchasedAt !== "";

  return (
    <div className="mx-auto max-w-md space-y-5">
      <Link
        href={`/clients/${client.id}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500"
      >
        <ArrowLeft className="h-4 w-4" />
        {client.name}
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-900">
          <Package className="h-5 w-5 text-indigo-600" />
          Add package
        </h1>
        <p className="text-sm text-zinc-500">
          Sessions are counted down automatically as bookings are completed.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          addPackage({
            clientId: client.id,
            totalSessions: total,
            purchasedAt: new Date(`${purchasedAt}T12:00`).toISOString(),
            expiresAt: expiresAt ? new Date(`${expiresAt}T20:00`).toISOString() : undefined,
          });
          showToast("Package added");
          router.push(`/clients/${client.id}`);
        }}
        className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
      >
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">Total sessions *</span>
          <input
            value={totalSessions}
            onChange={(e) => setTotalSessions(e.target.value)}
            inputMode="numeric"
            type="text"
            className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-center text-lg font-semibold tabular-nums focus:border-indigo-400 focus:outline-none"
          />
          <span className="mt-1 block text-[11px] text-zinc-400">e.g. 10, 20 or 30 sessions</span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">Purchase date</span>
          <input
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
            className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">
            Expires on (optional)
          </span>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <span className="mt-1 block text-[11px] text-zinc-400">
            Leave empty for a package that never expires.
          </span>
        </label>

        <button
          type="submit"
          disabled={!canSave}
          className="h-12 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white disabled:opacity-40"
        >
          Add package
        </button>
      </form>
    </div>
  );
}
