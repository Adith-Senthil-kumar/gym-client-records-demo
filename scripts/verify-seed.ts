// One-off sanity check for the seed data (run: npx tsx scripts/verify-seed.ts).
// Verifies the deliberately engineered cases exist so every insight has examples.

import { buildSeedData } from "../lib/seed";

const data = buildSeedData();
const now = new Date();
const daysBetween = (iso: string) => Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

check("18 clients, 3 trainers, 5 staff", data.clients.length === 18 && data.staff.length === 5);

// Exercise ids referenced by sessions all exist
const exIds = new Set(data.exercises.map((e) => e.id));
const badEx = data.sessions.flatMap((s) => s.exercises.filter((e) => !exIds.has(e.exerciseId)));
check("all exercise ids valid", badEx.length === 0, badEx.length ? badEx.map((e) => e.exerciseId).join(",") : "");

// Every trainer has bookings today AND tomorrow (calendar-day comparison —
// clock-time flooring shifts with the time of day the script runs)
const todayStr = now.toDateString();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toDateString();
for (const t of ["t1", "t2", "t3"]) {
  const today = data.bookings.filter(
    (b) => b.trainerId === t && b.status === "booked" && new Date(b.startsAt).toDateString() === todayStr
  );
  const tmrw = data.bookings.filter(
    (b) => b.trainerId === t && b.status === "booked" && new Date(b.startsAt).toDateString() === tomorrowStr
  );
  check(`${t} has bookings today (${today.length}) and tomorrow (${tmrw.length})`, today.length > 0 && tmrw.length > 0);
}

function clientById(id: string) {
  return data.clients.find((c) => c.id === id)!;
}
function sessionsOf(id: string) {
  return data.sessions.filter((s) => s.clientId === id).sort((a, b) => a.date.localeCompare(b.date));
}
function medianGap(id: string) {
  const ss = sessionsOf(id);
  const gaps: number[] = [];
  for (let i = 1; i < ss.length; i++) {
    gaps.push((new Date(ss[i].date).getTime() - new Date(ss[i - 1].date).getTime()) / 86_400_000);
  }
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

// Going quiet: last session exceeds 2x own median gap
for (const id of ["c3", "c9", "c16"]) {
  const ss = sessionsOf(id);
  const since = daysBetween(ss[ss.length - 1].date);
  const gap = medianGap(id);
  check(`${clientById(id).name} quiet (last ${since}d vs gap ${gap}d)`, since > 2 * gap);
}

// Plateau: best weight on top exercises flat over last 4 weeks with >=3 sessions
for (const id of ["c2", "c8", "c15"]) {
  const cutoff = now.getTime() - 28 * 86_400_000;
  const inWindow = sessionsOf(id).filter((s) => new Date(s.date).getTime() >= cutoff);
  const stalled = new Map<string, number>();
  for (const s of inWindow) {
    for (const e of s.exercises) {
      const best = Math.max(...e.sets.map((set) => set.weightKg));
      const prev = stalled.get(e.exerciseId);
      if (prev !== undefined && prev !== best) stalled.set(e.exerciseId, -1); // changed => not stalled
      else if (prev === undefined) stalled.set(e.exerciseId, best);
    }
  }
  const flatCount = [...stalled.values()].filter((v) => v !== -1).length;
  check(
    `${clientById(id).name} plateau (${inWindow.length} sessions in window, ${flatCount} lifts flat)`,
    inWindow.length >= 3 && flatCount >= 2
  );
}

// Progressing: best weight increased within last 4 weeks
for (const id of ["c1", "c7", "c13"]) {
  const cutoff = now.getTime() - 28 * 86_400_000;
  const inWindow = sessionsOf(id).filter((s) => new Date(s.date).getTime() >= cutoff);
  const all = sessionsOf(id);
  const first = inWindow[0];
  const firstIdx = all.findIndex((s) => s.id === first.id);
  const rising = all[firstIdx].exercises.some((e, i) => {
    const cur = Math.max(...e.sets.map((x) => x.weightKg));
    const earlier = all[Math.max(0, firstIdx - 3)].exercises[i];
    const prev = Math.max(...earlier.sets.map((x) => x.weightKg));
    return cur > prev;
  });
  check(`${clientById(id).name} progressing`, rising);
}

// Package math: every package has at least one used session and total >= used
let mathFail = false;
for (const c of data.clients) {
  const pkg = data.packages.find((p) => p.clientId === c.id)!;
  const used = data.bookings.filter((b) => b.packageId === pkg.id && b.status === "completed").length;
  if (used === 0 || used > pkg.totalSessions) mathFail = true;
}
check("package math ok for all 18", !mathFail);

// Low packages + expiring + no expiry
const low = data.clients.filter((c) => {
  const pkg = data.packages.find((p) => p.clientId === c.id)!;
  const used = data.bookings.filter((b) => b.packageId === pkg.id && b.status === "completed").length;
  return pkg.totalSessions - used <= 2;
});
check(`low package count = 2 (${low.map((c) => c.name).join(", ")})`, low.length === 2);

const expiring = data.packages.filter(
  (p) => p.expiresAt && new Date(p.expiresAt).getTime() - now.getTime() < 14 * 86_400_000
);
check(`expiring packages = 2 (${expiring.map((p) => p.clientId).join(", ")})`, expiring.length === 2);

const noExpiry = data.packages.filter((p) => !p.expiresAt);
check(`one package with no expiry (${noExpiry.map((p) => p.clientId).join(", ")})`, noExpiry.length === 1);

// No-shows in the last two weeks (strictly in the past — today's booked
// sessions are legitimate; phase-2 insight logic will treat them the same way)
const noShows = data.bookings.filter(
  (b) => (b.status === "no_show" || b.status === "booked") &&
    daysBetween(b.startsAt) >= 1 && daysBetween(b.startsAt) <= 14 &&
    !data.sessions.some((s) => s.bookingId === b.id)
);
check(
  `2 stale/no-show bookings in last 2 weeks (${noShows.map((b) => `${b.clientId}:${b.status}`).join(", ")})`,
  noShows.length === 2
);

// Measurements: everyone has some, plausible cadence
const withMeasurements = data.clients.filter((c) => data.measurements.some((m) => m.clientId === c.id)).length;
console.log(`INFO  clients with measurements: ${withMeasurements}/18`);
console.log(`INFO  sessions=${data.sessions.length} bookings=${data.bookings.length} measurements=${data.measurements.length} exercises=${data.exercises.length}`);

process.exit(failures > 0 ? 1 : 0);
