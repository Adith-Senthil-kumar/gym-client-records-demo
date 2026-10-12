// Read-side selectors that combine the repository with insight logic.
// Screens use these instead of assembling raw data themselves.

import { computeClientFlags } from "./insights";
import {
  getActivePackageSummaryForClient,
  getStaffById,
  listBookings,
  listClients,
  listExercises,
  listMeasurements,
  listMeasurementTypes,
  listPackages,
  listSessions,
  type PackageSummary,
} from "./repo";
import { useRoleStore } from "./role";
import { useDemoStore } from "./store";
import type { Client, InsightFlag, Session, Staff } from "./types";

export interface ClientSummary {
  client: Client;
  flags: InsightFlag[];
  lastSession?: Session;
  daysSinceLastSession: number | null;
  packageInfo: PackageSummary | undefined;
}

export function getClientSummary(clientId: string, now = new Date()): ClientSummary | undefined {
  const client = listClients().find((c) => c.id === clientId);
  if (!client) return undefined;

  const sessions = listSessions()
    .filter((s) => s.clientId === clientId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const bookings = listBookings().filter((b) => b.clientId === clientId);
  const packages = listPackages().filter((p) => p.clientId === clientId);
  const measurements = listMeasurements().filter((m) => m.clientId === clientId);

  const flags = computeClientFlags({
    client,
    sessions,
    bookings,
    packages,
    measurements,
    measurementTypes: listMeasurementTypes(),
    exercises: listExercises(),
    now,
  });

  const lastSession = sessions.at(-1);
  return {
    client,
    flags,
    lastSession,
    daysSinceLastSession: lastSession
      ? Math.floor((now.getTime() - new Date(lastSession.date).getTime()) / 86_400_000)
      : null,
    packageInfo: getActivePackageSummaryForClient(clientId),
  };
}

// All clients, or a trainer's own clients only.
export function listClientSummaries(trainerId?: string, now = new Date()): ClientSummary[] {
  return listClients()
    .filter((c) => !trainerId || c.assignedTrainerId === trainerId)
    .map((c) => getClientSummary(c.id, now))
    .filter((s): s is ClientSummary => s !== undefined);
}

export function useCurrentStaff(): Staff | undefined {
  useDemoStore((s) => s.version);
  const staffId = useRoleStore((s) => s.staffId);
  return getStaffById(staffId);
}

export function roleHome(staff: Staff): string {
  if (staff.role === "owner") return "/overview";
  if (staff.role === "frontdesk") return "/bookings";
  return "/today";
}
