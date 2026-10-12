// Shared data model for the demo. All entities carry a gymId even though the
// demo has a single gym, so swapping in a real backend later is trivial.

export type Role = "frontdesk" | "trainer" | "owner";

export type BookingStatus = "booked" | "completed" | "no_show" | "cancelled";

export interface Gym {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  gymId: string;
  name: string;
  role: Role;
}

export interface Client {
  id: string;
  gymId: string;
  name: string;
  phone: string;
  joinedAt: string; // ISO datetime
  goal: string; // short free text
  assignedTrainerId: string;
  notes: string; // health / injury notes
}

// sessionsUsed is NOT stored: it is derived from completed bookings linked
// to the package (see repo.sessionsUsedForPackage).
export interface Package {
  id: string;
  gymId: string;
  clientId: string;
  totalSessions: number;
  purchasedAt: string; // ISO datetime
  expiresAt?: string; // ISO datetime, optional on purpose
}

export interface Booking {
  id: string;
  gymId: string;
  clientId: string;
  trainerId: string;
  packageId?: string;
  startsAt: string; // ISO datetime
  status: BookingStatus;
}

export interface SetEntry {
  reps: number;
  weightKg: number;
}

export interface SessionExercise {
  exerciseId: string;
  sets: SetEntry[];
}

export interface Session {
  id: string;
  gymId: string;
  bookingId?: string; // linked booking; absent for sessions logged without one
  clientId: string;
  trainerId: string; // trainer on the session, so history survives trainer changes
  date: string; // ISO datetime
  notes: string;
  feelRating?: number; // 1-5, optional
  exercises: SessionExercise[];
}

export interface Exercise {
  id: string;
  gymId: string;
  name: string;
  muscleGroup: string;
}

export interface MeasurementType {
  id: string;
  gymId: string;
  name: string;
  unit: string;
}

export interface Measurement {
  id: string;
  gymId: string;
  clientId: string;
  typeId: string;
  value: number;
  date: string; // ISO datetime
}

export interface GymData {
  gym: Gym;
  staff: Staff[];
  clients: Client[];
  packages: Package[];
  bookings: Booking[];
  sessions: Session[];
  exercises: Exercise[];
  measurementTypes: MeasurementType[];
  measurements: Measurement[];
}

export type FlagType =
  | "progressing"
  | "plateau"
  | "quiet"
  | "no_show"
  | "package_low"
  | "package_expiring";

export type FlagSeverity = "positive" | "warning" | "critical";

export interface InsightFlag {
  type: FlagType;
  severity: FlagSeverity;
  label: string; // short chip label, e.g. "Plateau"
  explanation: string; // full sentence, e.g. "Bench Press has not increased in 5 weeks."
}
