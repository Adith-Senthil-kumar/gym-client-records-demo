import { describe, expect, it } from "vitest";
import { computeClientFlags, computeAllClientFlags, describeSessionChanges } from "./insights";
import { buildSeedData } from "./seed";
import { config } from "./config";
import type {
  Booking,
  Client,
  Exercise,
  InsightFlag,
  Measurement,
  MeasurementType,
  Package,
  Session,
} from "./types";

// Fixed "now" keeps every test deterministic.
const NOW = new Date("2026-10-11T12:00:00");
const DAY = 86_400_000;
const isoDaysAgo = (n: number, hour = 9) =>
  new Date(NOW.getTime() - n * DAY + (hour - 9) * 3_600_000).toISOString();

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const client: Client = {
  id: "c",
  gymId: "gym-1",
  name: "Test Client",
  phone: "+91 90000 00000",
  joinedAt: isoDaysAgo(90),
  goal: "Test goal",
  assignedTrainerId: "t1",
  notes: "",
};

const exercises: Exercise[] = [
  { id: "ex-bench", gymId: "gym-1", name: "Bench Press", muscleGroup: "Chest" },
  { id: "ex-squat", gymId: "gym-1", name: "Squat", muscleGroup: "Legs" },
];

const measurementTypes: MeasurementType[] = [
  { id: "mt-weight", gymId: "gym-1", name: "Body weight", unit: "kg" },
  { id: "mt-waist", gymId: "gym-1", name: "Waist", unit: "cm" },
  { id: "mt-arms", gymId: "gym-1", name: "Arms", unit: "cm" },
];

function makeSession(date: string, benchKg: number, squatKg = 0): Session {
  return {
    id: `s-${date}`,
    gymId: "gym-1",
    bookingId: `b-${date}`,
    clientId: "c",
    trainerId: "t1",
    date,
    notes: "",
    exercises: [
      { exerciseId: "ex-bench", sets: [{ reps: 8, weightKg: benchKg }] },
      ...(squatKg ? [{ exerciseId: "ex-squat", sets: [{ reps: 8, weightKg: squatKg }] }] : []),
    ],
  };
}

function baseInput(over: Partial<Parameters<typeof computeClientFlags>[0]> = {}) {
  return {
    client,
    sessions: [],
    bookings: [],
    packages: [],
    measurements: [],
    measurementTypes,
    exercises,
    now: NOW,
    ...over,
  };
}

function flagsOf(input: ReturnType<typeof baseInput>) {
  return computeClientFlags(input);
}

// ---------------------------------------------------------------------------
// Plateau (lifts)
// ---------------------------------------------------------------------------

describe("plateau (lifts)", () => {
  const flatSessions = [
    makeSession(isoDaysAgo(70), 45),
    makeSession(isoDaysAgo(63), 45),
    makeSession(isoDaysAgo(56), 47.5),
    makeSession(isoDaysAgo(49), 50),
    makeSession(isoDaysAgo(42), 50),
    makeSession(isoDaysAgo(35), 50),
    makeSession(isoDaysAgo(28), 50),
    makeSession(isoDaysAgo(21), 50),
    makeSession(isoDaysAgo(14), 50),
    makeSession(isoDaysAgo(7), 50),
  ];

  it("flags a lift that has not increased in the plateau window", () => {
    const flags = flagsOf(baseInput({ sessions: flatSessions }));
    const plateau = flags.find((f) => f.type === "plateau");
    expect(plateau).toBeDefined();
    expect(plateau!.explanation).toContain("Bench Press");
    expect(plateau!.explanation).toContain(`${config.plateauWeeks} weeks`);
    expect(plateau!.severity).toBe("warning");
  });

  it("does not flag when the lift is still increasing", () => {
    const rising = flatSessions.map((s, i) => makeSession(isoDaysAgo(70 - i * 7), 45 + i * 2.5));
    const flags = flagsOf(baseInput({ sessions: rising }));
    expect(flags.some((f) => f.type === "plateau")).toBe(false);
    expect(flags.some((f) => f.type === "progressing")).toBe(true);
  });

  it("counts more reps at the same weight as progress", () => {
    const moreReps: Session[] = [
      ...flatSessions.slice(0, 6),
      { ...makeSession(isoDaysAgo(28), 50), exercises: [{ exerciseId: "ex-bench", sets: [{ reps: 10, weightKg: 50 }] }] },
      makeSession(isoDaysAgo(21), 50),
      makeSession(isoDaysAgo(14), 50),
      makeSession(isoDaysAgo(7), 50),
    ];
    const flags = flagsOf(baseInput({ sessions: moreReps }));
    expect(flags.some((f) => f.type === "plateau")).toBe(false);
  });

  it("needs at least plateauMinSessions sessions inside the window", () => {
    const sparse = flatSessions.filter((_, i) => i < 7 || i > 8); // only 2 in window
    const flags = flagsOf(baseInput({ sessions: sparse }));
    expect(flags.some((f) => f.type === "plateau")).toBe(false);
  });

  it("needs history before the window to call something a plateau", () => {
    const newish = flatSessions.slice(-3); // all sessions inside the window
    const flags = flagsOf(baseInput({ sessions: newish }));
    expect(flags.some((f) => f.type === "plateau")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Measurements (plateau + progress direction)
// ---------------------------------------------------------------------------

describe("measurements", () => {
  const readings = (vals: [number, number][]): Measurement[] =>
    vals.map(([days, value], i) => ({
      id: `m${i}`,
      gymId: "gym-1",
      clientId: "c",
      typeId: "mt-weight",
      value,
      date: isoDaysAgo(days),
    }));

  it("flags a measurement that has not changed meaningfully", () => {
    const flags = flagsOf(
      baseInput({ measurements: readings([[35, 80], [5, 80.2]]) })
    );
    const plateau = flags.find((f) => f.type === "plateau");
    expect(plateau).toBeDefined();
    expect(plateau!.explanation).toContain("Body weight");
  });

  it("flags progress when the measurement moves toward the goal", () => {
    const flags = flagsOf(baseInput({ measurements: readings([[35, 80], [5, 77.5]]) }));
    const progressing = flags.find((f) => f.type === "progressing");
    expect(progressing).toBeDefined();
    expect(progressing!.severity).toBe("positive");
    expect(progressing!.explanation).toContain("down 2.5 kg");
  });

  it("respects direction keywords (arms up is good, waist up is not)", () => {
    const armUp: Measurement[] = [
      { id: "a1", gymId: "gym-1", clientId: "c", typeId: "mt-arms", value: 32, date: isoDaysAgo(35) },
      { id: "a2", gymId: "gym-1", clientId: "c", typeId: "mt-arms", value: 34, date: isoDaysAgo(5) },
    ];
    const armDown = armUp.map((m) => ({ ...m, value: m.value === 32 ? 34 : 32 }));
    expect(flagsOf(baseInput({ measurements: armUp })).some((f) => f.type === "progressing")).toBe(true);
    expect(flagsOf(baseInput({ measurements: armDown })).some((f) => f.type === "progressing")).toBe(false);

    const waistUp: Measurement[] = [
      { id: "w1", gymId: "gym-1", clientId: "c", typeId: "mt-waist", value: 80, date: isoDaysAgo(35) },
      { id: "w2", gymId: "gym-1", clientId: "c", typeId: "mt-waist", value: 82, date: isoDaysAgo(5) },
    ];
    expect(flagsOf(baseInput({ measurements: waistUp })).some((f) => f.type === "progressing")).toBe(false);
  });

  it("skips stale measurement data (latest reading older than the window)", () => {
    const flags = flagsOf(baseInput({ measurements: readings([[60, 80], [35, 80.1]]) }));
    expect(flags.some((f) => f.type === "plateau")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Going quiet
// ---------------------------------------------------------------------------

describe("going quiet", () => {
  // Weekly sessions, stopped 21 days ago.
  const weekly = Array.from({ length: 6 }, (_, i) => makeSession(isoDaysAgo(56 - i * 7), 50));
  const pkg: Package = {
    id: "p1",
    gymId: "gym-1",
    clientId: "c",
    totalSessions: 10,
    purchasedAt: isoDaysAgo(56),
  };
  const bookings: Booking[] = Array.from({ length: 6 }, (_, i) => ({
    id: `b-${i}`,
    gymId: "gym-1",
    clientId: "c",
    trainerId: "t1",
    packageId: "p1",
    startsAt: isoDaysAgo(56 - i * 7),
    status: "completed" as const,
  }));

  it("flags when the gap far exceeds the client's own usual gap", () => {
    const flags = flagsOf(baseInput({ sessions: weekly, bookings, packages: [pkg] }));
    const quiet = flags.find((f) => f.type === "quiet");
    expect(quiet).toBeDefined();
    expect(quiet!.explanation).toContain("21 days");
    expect(quiet!.explanation).toContain("every 7 days");
  });

  it("does not flag a client who was in recently", () => {
    const recent = [...weekly, makeSession(isoDaysAgo(3), 50)];
    expect(flagsOf(baseInput({ sessions: recent, bookings, packages: [pkg] })).some((f) => f.type === "quiet")).toBe(false);
  });

  it("does not flag when the package is used up and expired", () => {
    const expiredPkg: Package = { ...pkg, totalSessions: 6, expiresAt: isoDaysAgo(2) };
    expect(
      flagsOf(baseInput({ sessions: weekly, bookings, packages: [expiredPkg] })).some((f) => f.type === "quiet")
    ).toBe(false);
  });

  it("flags with an active package even when sessions are used up", () => {
    const noExpiryPkg: Package = { ...pkg, totalSessions: 6 };
    expect(
      flagsOf(baseInput({ sessions: weekly, bookings, packages: [noExpiryPkg] })).some((f) => f.type === "quiet")
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// No-shows
// ---------------------------------------------------------------------------

describe("no-shows", () => {
  const staleBooked: Booking = {
    id: "b1",
    gymId: "gym-1",
    clientId: "c",
    trainerId: "t1",
    startsAt: isoDaysAgo(6),
    status: "booked",
  };
  const markedNoShow: Booking = { ...staleBooked, id: "b2", startsAt: isoDaysAgo(9), status: "no_show" };

  it("flags a past booking that was never logged", () => {
    const flags = flagsOf(baseInput({ bookings: [staleBooked] }));
    const noShow = flags.find((f) => f.type === "no_show");
    expect(noShow).toBeDefined();
    expect(noShow!.explanation).toContain("never showed");
  });

  it("flags a booking marked no-show", () => {
    const flags = flagsOf(baseInput({ bookings: [markedNoShow] }));
    expect(flags.some((f) => f.type === "no_show")).toBe(true);
  });

  it("gives today's bookings the benefit of the doubt", () => {
    const today: Booking = {
      ...staleBooked,
      id: "b3",
      startsAt: new Date(NOW.getTime() - 4 * 3_600_000).toISOString(), // 4h ago today
    };
    expect(flagsOf(baseInput({ bookings: [today] })).some((f) => f.type === "no_show")).toBe(false);
  });

  it("does not flag when a session was logged for the booking", () => {
    const logged = makeSession(isoDaysAgo(9), 50);
    logged.bookingId = "b2";
    expect(
      flagsOf(baseInput({ bookings: [markedNoShow], sessions: [logged] })).some((f) => f.type === "no_show")
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------

describe("packages", () => {
  const bookings = (completed: number): Booking[] =>
    Array.from({ length: completed }, (_, i) => ({
      id: `b-${i}`,
      gymId: "gym-1",
      clientId: "c",
      trainerId: "t1",
      packageId: "p1",
      startsAt: isoDaysAgo(30 - i * 3),
      status: "completed" as const,
    }));

  it("flags a low package at or below the threshold", () => {
    const pkg: Package = { id: "p1", gymId: "gym-1", clientId: "c", totalSessions: 10, purchasedAt: isoDaysAgo(40) };
    const low = flagsOf(baseInput({ packages: [pkg], bookings: bookings(9) })).find((f) => f.type === "package_low");
    expect(low).toBeDefined();
    expect(low!.explanation).toContain("1 session");
    expect(flagsOf(baseInput({ packages: [pkg], bookings: bookings(8) })).some((f) => f.type === "package_low")).toBe(true);
    expect(flagsOf(baseInput({ packages: [pkg], bookings: bookings(7) })).some((f) => f.type === "package_low")).toBe(false);
  });

  it("flags a package expiring soon", () => {
    const pkg: Package = {
      id: "p1", gymId: "gym-1", clientId: "c", totalSessions: 10,
      purchasedAt: isoDaysAgo(40), expiresAt: isoDaysAgo(-10),
    };
    const flag = flagsOf(baseInput({ packages: [pkg] })).find((f) => f.type === "package_expiring");
    expect(flag).toBeDefined();
    expect(flag!.severity).toBe("warning");
    expect(flag!.explanation).toContain("10 days");
  });

  it("flags an expired package as critical", () => {
    const pkg: Package = {
      id: "p1", gymId: "gym-1", clientId: "c", totalSessions: 10,
      purchasedAt: isoDaysAgo(40), expiresAt: isoDaysAgo(3),
    };
    const flag = flagsOf(baseInput({ packages: [pkg] })).find((f) => f.type === "package_expiring");
    expect(flag).toBeDefined();
    expect(flag!.severity).toBe("critical");
  });

  it("never flags a package without an expiry date", () => {
    const pkg: Package = { id: "p1", gymId: "gym-1", clientId: "c", totalSessions: 10, purchasedAt: isoDaysAgo(40) };
    expect(flagsOf(baseInput({ packages: [pkg] })).some((f) => f.type === "package_expiring")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Session change summary (log-session confirmation)
// ---------------------------------------------------------------------------

describe("describeSessionChanges", () => {
  const prev: Session = {
    ...makeSession(isoDaysAgo(3), 60),
    exercises: [
      { exerciseId: "ex-squat", sets: [{ reps: 8, weightKg: 60 }] },
      { exerciseId: "ex-bench", sets: [{ reps: 8, weightKg: 50 }] },
    ],
  };

  it("lists weight and rep increases since the previous session", () => {
    const next: Session = {
      ...makeSession(isoDaysAgo(0), 0),
      exercises: [
        { exerciseId: "ex-squat", sets: [{ reps: 8, weightKg: 65 }] },
        { exerciseId: "ex-bench", sets: [{ reps: 10, weightKg: 50 }] },
      ],
    };
    const summary = describeSessionChanges(prev, next, exercises);
    expect(summary).toContain("Squat +5 kg");
    expect(summary).toContain("Bench Press +2 reps");
  });

  it("reports no change politely", () => {
    const next: Session = {
      ...makeSession(isoDaysAgo(0), 0),
      exercises: [
        { exerciseId: "ex-squat", sets: [{ reps: 8, weightKg: 60 }] },
        { exerciseId: "ex-bench", sets: [{ reps: 8, weightKg: 50 }] },
      ],
    };
    expect(describeSessionChanges(prev, next, exercises)).toBe("Same weights as last time.");
  });

  it("handles a client's first session", () => {
    const next = makeSession(isoDaysAgo(0), 60);
    expect(describeSessionChanges(undefined, next, exercises)).toContain("First logged session");
  });
});

// ---------------------------------------------------------------------------
// Runtime thresholds + follow-up message
// ---------------------------------------------------------------------------

import { DEFAULT_THRESHOLDS } from "./thresholds";
import { followUpMessage } from "./insights";

describe("runtime thresholds", () => {
  const sessions = Array.from({ length: 6 }, (_, i) => makeSession(isoDaysAgo(56 - i * 7), 50));
  const pkg: Package = {
    id: "p1", gymId: "gym-1", clientId: "c", totalSessions: 10, purchasedAt: isoDaysAgo(56),
  };
  const bookings: Booking[] = sessions.map((s, i) => ({
    id: `b-${i}`, gymId: "gym-1", clientId: "c", trainerId: "t1",
    packageId: "p1", startsAt: s.date, status: "completed" as const,
  }));
  const input = { ...baseInput({ sessions, bookings, packages: [pkg] }) };

  it("flags going quiet with default multiplier", () => {
    expect(computeClientFlags(input).some((f) => f.type === "quiet")).toBe(true);
  });

  it("stops flagging when the owner relaxes the multiplier in settings", () => {
    const relaxed = computeClientFlags(input, {
      ...DEFAULT_THRESHOLDS,
      quietGapMultiplier: 10,
    });
    expect(relaxed.some((f) => f.type === "quiet")).toBe(false);
  });
});

describe("followUpMessage", () => {
  const trainer = { trainerName: "Priya", gymName: "IronCore Fitness", daysSinceLast: 21 };

  it("builds a quiet message with days and sessions left", () => {
    const flag: InsightFlag = {
      type: "quiet", severity: "warning", label: "Going quiet",
      explanation: "No session for 21 days",
    };
    const msg = followUpMessage(client, flag, { ...trainer, sessionsLeft: 5 });
    expect(msg).toContain("Hi Test!");
    expect(msg).toContain("21 days");
    expect(msg).toContain("5 sessions left");
  });

  it("builds a package-low renewal message", () => {
    const flag: InsightFlag = {
      type: "package_low", severity: "warning", label: "Package low",
      explanation: "Only 1 session left on the package.",
    };
    const msg = followUpMessage(client, flag, { ...trainer, sessionsLeft: 1 });
    expect(msg).toContain("down to 1 session");
    expect(msg).toContain("renew");
  });
});

// ---------------------------------------------------------------------------
// Regression: the engineered seed stories
// ---------------------------------------------------------------------------

describe("seed regression (engineered stories)", () => {
  const data = buildSeedData();
  const byClient = new Map(
    computeAllClientFlags(data).map((c) => [c.client.id, c.flags.map((f) => f.type as string)])
  );

  const has = (id: string, type: string) => byClient.get(id)!.includes(type);
  const hasNot = (id: string, type: string) => !byClient.get(id)!.includes(type);

  it("progressing: Arjun, Aditya, Tanvi", () => {
    expect(has("c1", "progressing")).toBe(true);
    expect(has("c7", "progressing")).toBe(true);
    expect(has("c13", "progressing")).toBe(true);
  });

  it("plateau: Kavya, Pooja, Manish", () => {
    expect(has("c2", "plateau")).toBe(true);
    expect(has("c8", "plateau")).toBe(true);
    expect(has("c15", "plateau")).toBe(true);
  });

  it("going quiet: Rohan, Karan, Alok", () => {
    expect(has("c3", "quiet")).toBe(true);
    expect(has("c9", "quiet")).toBe(true);
    expect(has("c16", "quiet")).toBe(true);
  });

  it("package low: Sneha (1 left), Riya (2 left)", () => {
    expect(has("c4", "package_low")).toBe(true);
    expect(has("c10", "package_low")).toBe(true);
  });

  it("package expiring: Vikram Singh, Neha Kapoor; Divya has no expiry flag", () => {
    expect(has("c5", "package_expiring")).toBe(true);
    expect(has("c14", "package_expiring")).toBe(true);
    expect(hasNot("c6", "package_expiring")).toBe(true);
  });

  it("no-shows: Farah (marked), Gaurav (stale booked)", () => {
    expect(has("c17", "no_show")).toBe(true);
    expect(has("c18", "no_show")).toBe(true);
  });

  it("insight logic does not over-flag: Gaurav is a no-show, not quiet", () => {
    expect(hasNot("c18", "quiet")).toBe(true);
  });
});
