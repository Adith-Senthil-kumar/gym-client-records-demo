import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { roleHome } from "@/lib/select";
import type { Staff } from "@/lib/types";

// Shown when a page is opened by a role it doesn't belong to (demo keeps all
// URLs reachable, so this stays friendly).
export function RoleNotice({
  staff,
  pageFor,
}: {
  staff: Staff;
  pageFor: string;
}) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center">
      <p className="font-medium text-zinc-900">This screen is for {pageFor}</p>
      <p className="mt-1 text-sm text-zinc-500">
        You are currently in the demo as{" "}
        <span className="font-medium text-zinc-700">{staff.name}</span>. Switch roles from the
        menu at the top, or head back to your own screens.
      </p>
      <Link
        href={roleHome(staff)}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
      >
        Go to my home screen
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
