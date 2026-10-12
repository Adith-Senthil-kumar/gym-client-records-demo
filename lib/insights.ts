// Pure insight functions. No storage, no React: everything is computed from
// the data passed in, so these are unit-testable and will port unchanged to
// a real backend. All thresholds come from lib/config.ts.

import { config } from "./config";
import { currentThresholds, type Thresholds } from "./thresholds";
import type {
  Booking,
  Client,
  Exercise,
  GymData,
  InsightFlag,
  Measurement,
  MeasurementType,
  Package,
  Session,
} from "./types";

const DAY_MS = 86_400_000;
const fmtDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export interface ClientFlagInput {
  client: Client;
  sessions: Session[];
  bookings: Booking[];
  packages: Package[];
  measurements: Measurement[];
  measurementTypes: MeasurementType[];
  exercises: Exercise[];
  now: Date;
}

function daysBetween(a: Date | string, b: Date | string): number {
  return (new Date(a).getTime() - new Date(b).getTime()) / DAY_MS;
}

function fmtKg(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1)} kg`;
}

// ---------------------------------------------------------------------------
// Lift trend helpers
// ---------------------------------------------------------------------------

// A lift "score" compares weight first, then total reps at the best weight —
// so adding reps at the same weight counts as progress.
interface LiftScore {
  weightKg: number;
  repsAtBest: number;
}

function liftScore(session: Session, exerciseId: string): LiftScore | undefined {
  const entry = session.exercises.find((e) => e.exerciseId === exerciseId);
  if (!entry || entry.sets.length === 0) return undefined;
  const weightKg = Math.max(...entry.sets.map((s) => s.weightKg));
  const repsAtBest = entry.sets
    .filter((s) => s.weightKg === weightKg)
    .reduce((sum, s) => sum + s.reps, 0);
  return { weightKg, repsAtBest };
}

function bestLift(sessions: Session[], exerciseId: string): LiftScore | undefined {
  return sessions.reduce<LiftScore | undefined>((best, s) => {
    const score = liftScore(s, exerciseId);
    if (!score) return best;
    if (
      !best ||
      score.weightKg > best.weightKg ||
      (score.weightKg === best.weightKg && score.repsAtBest > best.repsAtBest)
    ) {
      return score;
    }
    return best;
  }, undefined);
}

function improved(a: LiftScore, b: LiftScore): boolean {
  return a.weightKg > b.weightKg || (a.weightKg === b.weightKg && a.repsAtBest > b.repsAtBest);
}

function topExerciseIds(sessions: Session[], count: number): string[] {
  const freq = new Map<string, number>();
  for (const s of sessions) {
    for (const e of s.exercises) freq.set(e.exerciseId, (freq.get(e.exerciseId) ?? 0) + 1);
  }
  return [...freq.entries()]
    .filter(([, n]) => n >= 2) // a lift logged once proves nothing
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, count)
    .map(([id]) => id);
}

// ---------------------------------------------------------------------------
// Measurement helpers
// ---------------------------------------------------------------------------

interface Reading {
  date: Date;
  value: number;
}

function readingsOfType(measurements: Measurement[], typeId: string): Reading[] {
  return measurements
    .filter((m) => m.typeId === typeId)
    .map((m) => ({ date: new Date(m.date), value: m.value }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// The reading closest in time to `target`, excluding the latest one.
function readingNear(readings: Reading[], target: Date): Reading | undefined {
  const candidates = readings.slice(0, -1);
  if (candidates.length === 0) return undefined;
  return candidates.reduce((best, r) =>
    Math.abs(r.date.getTime() - target.getTime()) <
    Math.abs(best.date.getTime() - target.getTime())
      ? r
      : best
  );
}

function stallThreshold(unit: string, cfg: Thresholds): number {
  return cfg.measurementStallByUnit[unit] ?? 1;
}

function isGoodDirection(name: string, delta: number): boolean {
  const n = name.toLowerCase();
  const { downKeywords, upKeywords } = config.progressDirections;
  if (downKeywords.some((k) => n.includes(k))) return delta < 0;
  if (upKeywords.some((k) => n.includes(k))) return delta > 0;
  return true; // not in either list: meaningful change in any direction counts
}

// ---------------------------------------------------------------------------
// Package helpers
// ---------------------------------------------------------------------------

function latestPackage(packages: Package[]): Package | undefined {
  return [...packages].sort((a, b) => a.purchasedAt.localeCompare(b.purchasedAt)).at(-1);
}

function sessionsRemaining(bookings: Booking[], pkg: Package): number {
  const used = bookings.filter((b) => b.packageId === pkg.id && b.status === "completed").length;
  return Math.max(0, pkg.totalSessions - used);
}

// ---------------------------------------------------------------------------
// Main entry point for one client
// ---------------------------------------------------------------------------

export function computeClientFlags(
  input: ClientFlagInput,
  cfg: Thresholds = currentThresholds()
): InsightFlag[] {
  const sessions = [...input.sessions].sort((a, b) => a.date.localeCompare(b.date));
  const cutoff = new Date(input.now.getTime() - cfg.plateauWeeks * 7 * DAY_MS);
  const recent = sessions.filter((s) => new Date(s.date) >= cutoff);
  const earlier = sessions.filter((s) => new Date(s.date) < cutoff);

  const flags: InsightFlag[] = [];
  const liftProgress: string[] = [];
  const measurementProgress: string[] = [];

  // --- Plateau / progress on lifts (top N most frequently logged) ---------
  if (recent.length >= cfg.plateauMinSessions) {
    for (const exId of topExerciseIds(sessions, cfg.plateauTopExercises)) {
      const name = input.exercises.find((e) => e.id === exId)?.name ?? exId;
      const before = bestLift(earlier, exId);
      const inWindow = bestLift(recent, exId);
      if (!before || !inWindow) continue;
      if (improved(inWindow, before)) {
        liftProgress.push(`${name} up ${fmtKg(inWindow.weightKg - before.weightKg)}`);
      } else {
        flags.push({
          type: "plateau",
          severity: "warning",
          label: "Plateau",
          explanation: `${name} has not increased in ${cfg.plateauWeeks} weeks (best: ${fmtKg(inWindow.weightKg)}).`,
        });
      }
    }
  }

  // --- Plateau / progress on measurements ---------------------------------
  for (const type of input.measurementTypes) {
    const readings = readingsOfType(input.measurements, type.id);
    if (readings.length < 2) continue;
    const latest = readings[readings.length - 1];
    if (latest.date < cutoff) continue; // not measured recently enough to judge
    const before = readingNear(readings, cutoff);
    if (!before) continue;
    if (daysBetween(latest.date, before.date) < 10) continue; // readings too close to compare
    const delta = latest.value - before.value;
    const threshold = stallThreshold(type.unit, cfg);

    if (Math.abs(delta) < threshold) {
      flags.push({
        type: "plateau",
        severity: "warning",
        label: "Plateau",
        explanation: `${type.name} has stayed around ${latest.value}${type.unit === "%" ? "%" : ` ${type.unit}`} for the last ${cfg.plateauWeeks} weeks.`,
      });
    } else if (isGoodDirection(type.name, delta)) {
      measurementProgress.push(
        `${type.name} ${delta < 0 ? "down" : "up"} ${Math.abs(delta)} ${type.unit} since ${fmtDate.format(before.date)}`
      );
    }
  }

  // --- Going quiet: compare to the client's OWN usual gap ------------------
  if (sessions.length >= 3) {
    const last = sessions[sessions.length - 1];
    const daysSince = daysBetween(input.now, last.date);
    if (daysSince >= cfg.quietMinDays) {
      const gaps: number[] = [];
      for (let i = 1; i < sessions.length; i++) {
        gaps.push(daysBetween(sessions[i].date, sessions[i - 1].date));
      }
      gaps.sort((a, b) => a - b);
      const medianGap = gaps[Math.floor(gaps.length / 2)];
      const pkg = latestPackage(input.packages);
      const stillHasValue =
        !!pkg &&
        (sessionsRemaining(input.bookings, pkg) > 0 ||
          !pkg.expiresAt ||
          new Date(pkg.expiresAt) >= input.now);
      if (daysSince > cfg.quietGapMultiplier * medianGap && stillHasValue) {
        flags.push({
          type: "quiet",
          severity: "warning",
          label: "Going quiet",
          explanation: `No session for ${Math.floor(daysSince)} days — usually trains every ${Math.round(medianGap)} days.`,
        });
      }
    }
  }

  // --- No-shows: past bookings never logged (today's bookings get the
  // benefit of the doubt until the day is over) -----------------------------
  const startOfToday = new Date(input.now);
  startOfToday.setHours(0, 0, 0, 0);
  const stale = input.bookings
    .filter(
      (b) =>
        new Date(b.startsAt) < startOfToday &&
        (b.status === "booked" || b.status === "no_show") &&
        !sessions.some((s) => s.bookingId === b.id)
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  if (stale.length > 0) {
    const latest = stale[stale.length - 1];
    const dateStr = fmtDate.format(new Date(latest.startsAt));
    const explanation =
      stale.length > 1
        ? `${stale.length} bookings with no logged session; latest on ${dateStr} was ${latest.status === "no_show" ? "a no-show" : "left as booked"}.`
        : latest.status === "no_show"
          ? `Missed the session on ${dateStr} (marked no-show).`
          : `Booked on ${dateStr} but never showed — no session was logged.`;
    flags.push({ type: "no_show", severity: "warning", label: "No-show", explanation });
  }

  // --- Package low / expiring ----------------------------------------------
  const pkg = latestPackage(input.packages);
  if (pkg) {
    const left = sessionsRemaining(input.bookings, pkg);
    if (left <= cfg.packageLowSessions) {
      flags.push({
        type: "package_low",
        severity: "warning",
        label: "Package low",
        explanation:
          left === 0
            ? "No sessions left on the package."
            : `Only ${left} session${left === 1 ? "" : "s"} left on the package.`,
      });
    }
    if (pkg.expiresAt) {
      const daysLeft = daysBetween(pkg.expiresAt, input.now);
      if (daysLeft < 0) {
        flags.push({
          type: "package_expiring",
          severity: "critical",
          label: "Package expired",
          explanation: `Package expired on ${fmtDate.format(new Date(pkg.expiresAt))}.`,
        });
      } else if (daysLeft <= cfg.packageExpiringDays) {
        flags.push({
          type: "package_expiring",
          severity: "warning",
          label: "Expiring soon",
          explanation: `Package expires on ${fmtDate.format(new Date(pkg.expiresAt))} (${Math.ceil(daysLeft)} days).`,
        });
      }
    }
  }

  // --- Progressing: one positive chip per client, with the best evidence ----
  const evidence = [...measurementProgress.slice(0, 1), ...liftProgress.slice(0, 1)];
  if (evidence.length > 0) {
    flags.unshift({
      type: "progressing",
      severity: "positive",
      label: "Progressing",
      explanation: `${evidence.join("; ")}.`,
    });
  }

  return flags;
}

// One-line change summary since the previous session, e.g.
// "Squat +5 kg, Bench Press +2 reps" — used in the save confirmation.
export function describeSessionChanges(
  prev: Session | undefined,
  next: Session,
  exercises: Exercise[]
): string {
  if (!prev) return "First logged session for this client.";
  const name = (id: string) => exercises.find((e) => e.id === id)?.name ?? id;
  const ups: string[] = [];
  for (const ex of next.exercises) {
    const before = liftScore(prev, ex.exerciseId);
    const after = liftScore(next, ex.exerciseId);
    if (!before || !after) continue;
    if (after.weightKg > before.weightKg) {
      ups.push(`${name(ex.exerciseId)} +${fmtKg(after.weightKg - before.weightKg)}`);
    } else if (after.weightKg === before.weightKg && after.repsAtBest > before.repsAtBest) {
      ups.push(`${name(ex.exerciseId)} +${after.repsAtBest - before.repsAtBest} reps`);
    }
  }
  return ups.length > 0 ? ups.join(", ") : "Same weights as last time.";
}

// ---------------------------------------------------------------------------
// Whole-dataset convenience (debug page, owner dashboard)
// ---------------------------------------------------------------------------

export interface ClientInsights {
  client: Client;
  flags: InsightFlag[];
}

export function computeAllClientFlags(
  data: GymData,
  now = new Date(),
  cfg?: Thresholds
): ClientInsights[] {
  return data.clients.map((client) => ({
    client,
    flags: computeClientFlags(
      {
        client,
        sessions: data.sessions.filter((s) => s.clientId === client.id),
        bookings: data.bookings.filter((b) => b.clientId === client.id),
        packages: data.packages.filter((p) => p.clientId === client.id),
        measurements: data.measurements.filter((m) => m.clientId === client.id),
        measurementTypes: data.measurementTypes,
        exercises: data.exercises,
        now,
      },
      cfg
    ),
  }));
}

// ---------------------------------------------------------------------------
// Follow-up message (owner dashboard "copy message" button)
// ---------------------------------------------------------------------------

// A ready-to-send WhatsApp-style follow-up based on the client's most urgent
// flag. Pure so it stays easy to tweak and test.
export function followUpMessage(
  client: Client,
  flag: InsightFlag,
  ctx: {
    trainerName: string;
    gymName: string;
    daysSinceLast: number | null;
    sessionsLeft?: number;
  }
): string {
  const first = client.name.split(" ")[0];
  const left = ctx.sessionsLeft;
  const leftText =
    left !== undefined ? ` You still have ${left} session${left === 1 ? "" : "s"} left on your package.` : "";

  switch (flag.type) {
    case "quiet":
      return `Hi ${first}! ${ctx.trainerName} here from ${ctx.gymName}. It's been ${
        ctx.daysSinceLast ?? "a while"
      } days since your last session.${leftText} Shall we get your next one booked?`;
    case "no_show":
      return `Hi ${first}! We missed you at your last booked session — hope everything's OK.${leftText} Reply here and ${ctx.trainerName} will get you rescheduled.`;
    case "package_low":
      return `Hi ${first}! ${
        left !== undefined
          ? `You're down to ${left} session${left === 1 ? "" : "s"}`
          : "Your package is nearly used up"
      } on your package at ${ctx.gymName}. Want to renew and keep the momentum going?`;
    case "package_expiring":
      return `Hi ${first}! A quick heads-up: your package at ${ctx.gymName} is expiring soon. Renew before it lapses so we can keep your progress going?`;
    case "plateau":
      return `Hi ${first}! ${ctx.trainerName} here — you've been showing up consistently, but the numbers have flatlined lately. Want to book a session to shake up your program?`;
    default:
      return `Hi ${first}! ${ctx.trainerName} from ${ctx.gymName} here. Want to book your next session?`;
  }
}
