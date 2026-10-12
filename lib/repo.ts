// Repository layer: the ONLY module that touches localStorage. Screens and
// components must import from here, never from storage directly. Swapping in
// Supabase later means reimplementing these functions, nothing else.

import { GYM_ID, STORAGE_KEY, STORAGE_VERSION } from "./config";
import { buildSeedData } from "./seed";
import { useDemoStore } from "./store";
import type {
  Booking,
  BookingStatus,
  Client,
  Exercise,
  Gym,
  GymData,
  Measurement,
  MeasurementType,
  Package,
  Session,
  Staff,
} from "./types";

let cache: GymData | null = null;

function load(): GymData {
  if (cache) return cache;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { version: number; data: GymData };
        if (parsed.version === STORAGE_VERSION) {
          cache = parsed.data;
          return cache;
        }
      }
    } catch {
      // Corrupted demo data falls back to a fresh seed.
    }
  }
  cache = buildSeedData();
  persistQuietly();
  return cache;
}

function persistQuietly() {
  if (typeof window !== "undefined" && cache) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, data: cache }));
  }
}

function persist() {
  persistQuietly();
  useDemoStore.getState().bump();
}

function newId(prefix: string): string {
  return `${prefix}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

// Full read-only snapshot — used by debug/owner views that need everything.
export function getGymData(): GymData {
  return load();
}

export function getGym(): Gym {
  return load().gym;
}

export function listStaff(): Staff[] {
  return load().staff;
}

export function listTrainers(): Staff[] {
  return load().staff.filter((s) => s.role === "trainer");
}

export function getStaffById(id: string): Staff | undefined {
  return load().staff.find((s) => s.id === id);
}

export function listClients(): Client[] {
  return load().clients;
}

export function getClientById(id: string): Client | undefined {
  return load().clients.find((c) => c.id === id);
}

export function listBookings(): Booking[] {
  return load().bookings;
}

export function listBookingsForClient(clientId: string): Booking[] {
  return load().bookings.filter((b) => b.clientId === clientId);
}

export function listSessions(): Session[] {
  return load().sessions;
}

export function listSessionsForClient(clientId: string): Session[] {
  return load().sessions.filter((s) => s.clientId === clientId);
}

export function getLatestSessionForClient(clientId: string): Session | undefined {
  return listSessionsForClient(clientId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
}

export function listPackages(): Package[] {
  return load().packages;
}

export function listPackagesForClient(clientId: string): Package[] {
  return load().packages.filter((p) => p.clientId === clientId);
}

// The active package is the most recently purchased one.
export function getActivePackageForClient(clientId: string): Package | undefined {
  return listPackagesForClient(clientId)
    .sort((a, b) => a.purchasedAt.localeCompare(b.purchasedAt))
    .at(-1);
}

// sessionsUsed is derived: completed bookings linked to the package.
export function sessionsUsedForPackage(packageId: string): number {
  return load().bookings.filter((b) => b.packageId === packageId && b.status === "completed").length;
}

export function sessionsRemainingForPackage(pkg: Package): number {
  return Math.max(0, pkg.totalSessions - sessionsUsedForPackage(pkg.id));
}

export interface PackageSummary {
  pkg: Package;
  used: number;
  remaining: number;
}

export function getActivePackageSummaryForClient(clientId: string): PackageSummary | undefined {
  const pkg = getActivePackageForClient(clientId);
  if (!pkg) return undefined;
  const used = sessionsUsedForPackage(pkg.id);
  return { pkg, used, remaining: Math.max(0, pkg.totalSessions - used) };
}

export function listExercises(): Exercise[] {
  return load().exercises;
}

export function getExerciseById(id: string): Exercise | undefined {
  return load().exercises.find((e) => e.id === id);
}

export function listMeasurementTypes(): MeasurementType[] {
  return load().measurementTypes;
}

export function listMeasurements(): Measurement[] {
  return load().measurements;
}

export function listMeasurementsForClient(clientId: string): Measurement[] {
  return load().measurements.filter((m) => m.clientId === clientId);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export function addClient(input: {
  name: string;
  phone: string;
  goal: string;
  assignedTrainerId: string;
  notes: string;
}): Client {
  const data = load();
  const client: Client = {
    id: newId("client"),
    gymId: GYM_ID,
    joinedAt: new Date().toISOString(),
    ...input,
  };
  data.clients.push(client);
  persist();
  return client;
}

export function addPackage(input: {
  clientId: string;
  totalSessions: number;
  purchasedAt: string;
  expiresAt?: string;
}): Package {
  const data = load();
  const pkg: Package = { id: newId("pkg"), gymId: GYM_ID, ...input };
  data.packages.push(pkg);
  persist();
  return pkg;
}

export function addBooking(input: {
  clientId: string;
  trainerId: string;
  startsAt: string;
  packageId?: string;
}): Booking {
  const data = load();
  const booking: Booking = { id: newId("booking"), gymId: GYM_ID, status: "booked", ...input };
  data.bookings.push(booking);
  persist();
  return booking;
}

export function setBookingStatus(bookingId: string, status: BookingStatus): void {
  const booking = load().bookings.find((b) => b.id === bookingId);
  if (!booking) return;
  booking.status = status;
  persist();
}

export function addSession(input: {
  bookingId?: string;
  clientId: string;
  trainerId: string;
  date: string;
  notes: string;
  feelRating?: number;
  exercises: { exerciseId: string; sets: { reps: number; weightKg: number }[] }[];
}): Session {
  const data = load();
  const session: Session = { id: newId("session"), gymId: GYM_ID, ...input };
  data.sessions.push(session);
  // Saving a session marks the linked booking completed (which also
  // "decrements" the package, since sessionsUsed is derived).
  if (input.bookingId) {
    const booking = data.bookings.find((b) => b.id === input.bookingId);
    if (booking) booking.status = "completed";
  }
  persist();
  return session;
}

export function addMeasurement(input: {
  clientId: string;
  typeId: string;
  value: number;
  date?: string;
}): Measurement {
  const data = load();
  const measurement: Measurement = {
    id: newId("measurement"),
    gymId: GYM_ID,
    date: input.date ?? new Date().toISOString(),
    clientId: input.clientId,
    typeId: input.typeId,
    value: input.value,
  };
  data.measurements.push(measurement);
  persist();
  return measurement;
}

export function addMeasurementType(input: { name: string; unit: string }): MeasurementType {
  const data = load();
  const type: MeasurementType = { id: newId("mt"), gymId: GYM_ID, ...input };
  data.measurementTypes.push(type);
  persist();
  return type;
}

export function removeMeasurementType(typeId: string): void {
  const data = load();
  data.measurementTypes = data.measurementTypes.filter((t) => t.id !== typeId);
  // Also drop the measurements of that type so charts don't break.
  data.measurements = data.measurements.filter((m) => m.typeId !== typeId);
  persist();
}

export function addExercise(input: { name: string; muscleGroup: string }): Exercise {
  const data = load();
  const exercise: Exercise = { id: newId("ex"), gymId: GYM_ID, ...input };
  data.exercises.push(exercise);
  persist();
  return exercise;
}

export function resetDemoData(): void {
  cache = buildSeedData();
  persist();
}
