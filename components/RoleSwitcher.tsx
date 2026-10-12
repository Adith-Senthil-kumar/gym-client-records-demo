"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, RotateCcw, UserRound } from "lucide-react";
import { resetDemoData, listStaff } from "@/lib/repo";
import { roleHome, useCurrentStaff } from "@/lib/select";
import { useRoleStore } from "@/lib/role";
import { showToast } from "@/lib/toast";
import { useDemoStore } from "@/lib/store";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  frontdesk: "Front desk",
  trainer: "Trainer",
};

// Stands in for login: pick any staff member. Also hosts the demo controls
// (reset demo data).
export function RoleSwitcher() {
  useDemoStore((s) => s.version);
  const current = useCurrentStaff();
  const setStaffId = useRoleStore((s) => s.setStaffId);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!current) return null;

  const pick = (staffId: string) => {
    setStaffId(staffId);
    setOpen(false);
    const staff = listStaff().find((s) => s.id === staffId);
    if (staff) router.push(roleHome(staff));
  };

  const reset = () => {
    resetDemoData();
    setOpen(false);
    showToast("Demo data reset");
    router.push(roleHome(current));
  };

  const trainers = listStaff().filter((s) => s.role === "trainer");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 shadow-sm"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
          <UserRound className="h-3.5 w-3.5" />
        </span>
        <span className="max-w-32 truncate font-medium sm:max-w-none">{current.name}</span>
        <span className="hidden text-xs text-zinc-400 sm:inline">· {ROLE_LABEL[current.role]}</span>
        <ChevronDown className="h-4 w-4 text-zinc-400" />
      </button>

      {open && (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Sign in as
            </p>
            {[
              { id: "owner-1", label: "Owner" },
              { id: "desk-1", label: "Front desk" },
            ].map((item) => (
              <MenuRow
                key={item.id}
                id={item.id}
                label={item.label}
                active={current.id === item.id}
                onPick={pick}
              />
            ))}
            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Trainers
            </p>
            {trainers.map((t) => (
              <MenuRow
                key={t.id}
                id={t.id}
                label={t.name}
                active={current.id === t.id}
                onPick={pick}
              />
            ))}
            <div className="border-t border-zinc-100">
              <button
                onClick={reset}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-zinc-600 hover:bg-zinc-50"
              >
                <RotateCcw className="h-4 w-4 text-zinc-400" />
                Reset demo data
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuRow({
  id,
  label,
  active,
  onPick,
}: {
  id: string;
  label: string;
  active: boolean;
  onPick: (id: string) => void;
}) {
  const staff = listStaff().find((s) => s.id === id)!;
  return (
    <button
      onClick={() => onPick(id)}
      className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
    >
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-zinc-400">{staff.name}</span>
      </span>
      {active && <Check className="h-4 w-4 text-indigo-600" />}
    </button>
  );
}
