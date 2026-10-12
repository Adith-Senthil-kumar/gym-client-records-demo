// Seed data for the demo. All dates are generated RELATIVE to today, so the
// demo never looks stale. The 18 clients are deliberately engineered so every
// insight type (progressing / plateau / quiet / package low / expiring /
// no-show) has examples visible in the UI. See README for how to tweak.

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
import { GYM_ID } from "./config";

// ---------------------------------------------------------------------------
// Date helpers (negative daysAgo = future)
// ---------------------------------------------------------------------------

function isoDaysAgo(daysAgo: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// ---------------------------------------------------------------------------
// Gym, staff, exercise library, measurement types
// ---------------------------------------------------------------------------

const GYM: Gym = { id: GYM_ID, name: "IronCore Fitness" };

const STAFF: Staff[] = [
  { id: "owner-1", gymId: GYM_ID, name: "Vikram Malhotra", role: "owner" },
  { id: "desk-1", gymId: GYM_ID, name: "Anita Desai", role: "frontdesk" },
  { id: "t1", gymId: GYM_ID, name: "Priya Sharma", role: "trainer" },
  { id: "t2", gymId: GYM_ID, name: "Rahul Verma", role: "trainer" },
  { id: "t3", gymId: GYM_ID, name: "Meera Iyer", role: "trainer" },
];

const EXERCISES: Exercise[] = [
  { id: "ex-squat", gymId: GYM_ID, name: "Squat", muscleGroup: "Legs" },
  { id: "ex-bench", gymId: GYM_ID, name: "Bench Press", muscleGroup: "Chest" },
  { id: "ex-deadlift", gymId: GYM_ID, name: "Deadlift", muscleGroup: "Back" },
  { id: "ex-ohp", gymId: GYM_ID, name: "Overhead Press", muscleGroup: "Shoulders" },
  { id: "ex-latpulldown", gymId: GYM_ID, name: "Lat Pulldown", muscleGroup: "Back" },
  { id: "ex-seatedrow", gymId: GYM_ID, name: "Seated Row", muscleGroup: "Back" },
  { id: "ex-lunges", gymId: GYM_ID, name: "Lunges", muscleGroup: "Legs" },
  { id: "ex-legpress", gymId: GYM_ID, name: "Leg Press", muscleGroup: "Legs" },
  { id: "ex-plank", gymId: GYM_ID, name: "Plank", muscleGroup: "Core" },
  { id: "ex-rdl", gymId: GYM_ID, name: "Romanian Deadlift", muscleGroup: "Back" },
  { id: "ex-barbellrow", gymId: GYM_ID, name: "Barbell Row", muscleGroup: "Back" },
  { id: "ex-curl", gymId: GYM_ID, name: "Dumbbell Curl", muscleGroup: "Arms" },
  { id: "ex-triceps", gymId: GYM_ID, name: "Triceps Pushdown", muscleGroup: "Arms" },
  { id: "ex-legext", gymId: GYM_ID, name: "Leg Extension", muscleGroup: "Legs" },
  { id: "ex-legcurl", gymId: GYM_ID, name: "Leg Curl", muscleGroup: "Legs" },
  { id: "ex-calfraise", gymId: GYM_ID, name: "Calf Raise", muscleGroup: "Legs" },
  { id: "ex-chestfly", gymId: GYM_ID, name: "Chest Fly", muscleGroup: "Chest" },
  { id: "ex-lateralraise", gymId: GYM_ID, name: "Lateral Raise", muscleGroup: "Shoulders" },
  { id: "ex-pushups", gymId: GYM_ID, name: "Push-ups", muscleGroup: "Chest" },
  { id: "ex-pullups", gymId: GYM_ID, name: "Pull-ups", muscleGroup: "Back" },
  { id: "ex-chinups", gymId: GYM_ID, name: "Chin-ups", muscleGroup: "Back" },
  { id: "ex-hipthrust", gymId: GYM_ID, name: "Hip Thrust", muscleGroup: "Legs" },
  { id: "ex-glutebridge", gymId: GYM_ID, name: "Glute Bridge", muscleGroup: "Legs" },
  { id: "ex-cablerow", gymId: GYM_ID, name: "Cable Row", muscleGroup: "Back" },
  { id: "ex-facepull", gymId: GYM_ID, name: "Face Pull", muscleGroup: "Shoulders" },
  { id: "ex-arnoldpress", gymId: GYM_ID, name: "Arnold Press", muscleGroup: "Shoulders" },
  { id: "ex-inclinebench", gymId: GYM_ID, name: "Incline Bench Press", muscleGroup: "Chest" },
  { id: "ex-gobletsquat", gymId: GYM_ID, name: "Goblet Squat", muscleGroup: "Legs" },
  { id: "ex-splitsquat", gymId: GYM_ID, name: "Bulgarian Split Squat", muscleGroup: "Legs" },
  { id: "ex-kbswing", gymId: GYM_ID, name: "Kettlebell Swing", muscleGroup: "Full Body" },
  { id: "ex-hammercurl", gymId: GYM_ID, name: "Hammer Curl", muscleGroup: "Arms" },
  { id: "ex-skullcrusher", gymId: GYM_ID, name: "Skull Crusher", muscleGroup: "Arms" },
  { id: "ex-cablecurl", gymId: GYM_ID, name: "Cable Curl", muscleGroup: "Arms" },
  { id: "ex-uprightrow", gymId: GYM_ID, name: "Upright Row", muscleGroup: "Shoulders" },
  { id: "ex-frontsquat", gymId: GYM_ID, name: "Front Squat", muscleGroup: "Legs" },
  { id: "ex-sumodeadlift", gymId: GYM_ID, name: "Sumo Deadlift", muscleGroup: "Back" },
  { id: "ex-goodmorning", gymId: GYM_ID, name: "Good Morning", muscleGroup: "Back" },
  { id: "ex-russiantwist", gymId: GYM_ID, name: "Russian Twist", muscleGroup: "Core" },
  { id: "ex-mountainclimbers", gymId: GYM_ID, name: "Mountain Climbers", muscleGroup: "Core" },
  { id: "ex-jumpingrope", gymId: GYM_ID, name: "Jumping Rope", muscleGroup: "Cardio" },
];

const MEASUREMENT_TYPES: MeasurementType[] = [
  { id: "mt-weight", gymId: GYM_ID, name: "Body weight", unit: "kg" },
  { id: "mt-bodyfat", gymId: GYM_ID, name: "Body fat", unit: "%" },
  { id: "mt-waist", gymId: GYM_ID, name: "Waist", unit: "cm" },
  { id: "mt-chest", gymId: GYM_ID, name: "Chest", unit: "cm" },
  { id: "mt-hips", gymId: GYM_ID, name: "Hips", unit: "cm" },
  { id: "mt-arms", gymId: GYM_ID, name: "Arms", unit: "cm" },
  { id: "mt-thighs", gymId: GYM_ID, name: "Thighs", unit: "cm" },
];

// Rotating trainer notes, applied across all clients' sessions.
const SESSION_NOTES = [
  "Good energy, pushed hard on the last set.",
  "Form improving on the main lift.",
  "Client reporting better sleep and energy this week.",
  "Slightly fatigued; kept weights conservative.",
  "Great session, hit a new personal best.",
  "Focused on tempo and control throughout.",
  "Stressful week for the client; moderate intensity.",
  "Discussed protein intake, adding a post-session shake.",
];

// ---------------------------------------------------------------------------
// Client specs: declarative "story" per client, expanded into full history
// ---------------------------------------------------------------------------

interface ExercisePlan {
  exerciseId: string;
  sets: number;
  reps: number;
  startKg: number;
  kgPerSession: number; // weight added per session (0 = flat from the start)
  stallAfter?: number; // stop progressing after this many sessions (plateau)
}

interface MeasurementPlan {
  typeId: string;
  start: number;
  perWeek: number; // change per week; negative = loss toward goal
  stallAfterWeeks?: number; // measurement stops changing after N weeks
}

interface ClientSpec {
  id: string;
  name: string;
  phone: string;
  goal: string;
  notes: string;
  trainerId: string;
  joinedDaysAgo: number;
  gapDays: number; // this client's usual gap between sessions
  lastSessionDaysAgo: number; // large value = going quiet
  hour: number; // preferred session time of day
  exercises: ExercisePlan[];
  measurements: MeasurementPlan[];
  package: {
    remaining: number; // sessions left on the package
    expiresDaysFromNow?: number; // omit = package never expires
  };
  feelCycle?: number[]; // rotating 1-5 "how did it feel" ratings
  todayHours?: number[]; // extra bookings today (keeps Today view busy)
  tomorrowHours?: number[]; // extra bookings tomorrow
  extraBookings?: { daysAgo: number; status: BookingStatus }[]; // no-shows etc.
}

const CLIENT_SPECS: ClientSpec[] = [
  // --- Priya Sharma (t1) ---------------------------------------------------
  {
    // Progressing: squat/bench/lat pulldown all rising, weight & waist falling.
    id: "c1", name: "Arjun Mehta", phone: "+91 98765 01001",
    goal: "Fat loss — target 78 kg", notes: "Mild hypertension; watch rest periods.",
    trainerId: "t1", joinedDaysAgo: 78, gapDays: 6, lastSessionDaysAgo: 2, hour: 7,
    exercises: [
      { exerciseId: "ex-squat", sets: 3, reps: 8, startKg: 60, kgPerSession: 2.5 },
      { exerciseId: "ex-bench", sets: 3, reps: 8, startKg: 47.5, kgPerSession: 1.25 },
      { exerciseId: "ex-latpulldown", sets: 3, reps: 10, startKg: 55, kgPerSession: 1.25 },
    ],
    measurements: [
      { typeId: "mt-weight", start: 86, perWeek: -0.4 },
      { typeId: "mt-waist", start: 98, perWeek: -0.5 },
      { typeId: "mt-bodyfat", start: 28, perWeek: -0.3 },
    ],
    package: { remaining: 6, expiresDaysFromNow: 30 },
    feelCycle: [4, 5, 4, 5, 5],
    todayHours: [7], tomorrowHours: [],
  },
  {
    // Plateau: bench, row and press all stalled after the first month; body fat flat.
    id: "c2", name: "Kavya Reddy", phone: "+91 98765 01002",
    goal: "Upper body strength", notes: "Old wrist injury; prefers neutral-grip work.",
    trainerId: "t1", joinedDaysAgo: 84, gapDays: 6, lastSessionDaysAgo: 3, hour: 19,
    exercises: [
      { exerciseId: "ex-bench", sets: 3, reps: 8, startKg: 42.5, kgPerSession: 1.25, stallAfter: 4 },
      { exerciseId: "ex-seatedrow", sets: 3, reps: 10, startKg: 45, kgPerSession: 2.5, stallAfter: 4 },
      { exerciseId: "ex-ohp", sets: 3, reps: 8, startKg: 27.5, kgPerSession: 1.25, stallAfter: 5 },
    ],
    measurements: [
      { typeId: "mt-arms", start: 32, perWeek: 0.1 },
      { typeId: "mt-bodyfat", start: 31, perWeek: 0 },
    ],
    package: { remaining: 8, expiresDaysFromNow: 45 },
    todayHours: [], tomorrowHours: [19],
  },
  {
    // Going quiet: usual gap 7 days, but last session was 22 days ago.
    id: "c3", name: "Rohan Gupta", phone: "+91 98765 01003",
    goal: "General fitness", notes: "Prefers evening slots after work.",
    trainerId: "t1", joinedDaysAgo: 72, gapDays: 7, lastSessionDaysAgo: 22, hour: 18,
    exercises: [
      { exerciseId: "ex-legpress", sets: 3, reps: 10, startKg: 120, kgPerSession: 2.5 },
      { exerciseId: "ex-seatedrow", sets: 3, reps: 10, startKg: 40, kgPerSession: 1.25 },
      { exerciseId: "ex-lunges", sets: 3, reps: 12, startKg: 20, kgPerSession: 1 },
    ],
    measurements: [
      { typeId: "mt-weight", start: 81, perWeek: -0.2 },
    ],
    package: { remaining: 5, expiresDaysFromNow: 40 },
    todayHours: [], tomorrowHours: [],
  },
  {
    // Low package: only 1 session left.
    id: "c4", name: "Sneha Kulkarni", phone: "+91 98765 01004",
    goal: "Weight loss for wedding in December", notes: "Knee discomfort on stairs.",
    trainerId: "t1", joinedDaysAgo: 54, gapDays: 6, lastSessionDaysAgo: 4, hour: 7,
    exercises: [
      { exerciseId: "ex-gobletsquat", sets: 3, reps: 12, startKg: 16, kgPerSession: 1 },
      { exerciseId: "ex-latpulldown", sets: 3, reps: 10, startKg: 45, kgPerSession: 1.25 },
      { exerciseId: "ex-lateralraise", sets: 3, reps: 12, startKg: 7.5, kgPerSession: 0 },
    ],
    measurements: [
      { typeId: "mt-weight", start: 74, perWeek: -0.35 },
      { typeId: "mt-waist", start: 89, perWeek: -0.4 },
    ],
    package: { remaining: 1, expiresDaysFromNow: 25 },
    todayHours: [18], tomorrowHours: [],
  },
  {
    // Package expiring in 10 days (renewal opportunity).
    id: "c5", name: "Vikram Singh", phone: "+91 98765 01005",
    goal: "Muscle gain — 75 kg bodyweight", notes: "No injuries.",
    trainerId: "t1", joinedDaysAgo: 66, gapDays: 6, lastSessionDaysAgo: 4, hour: 8,
    exercises: [
      { exerciseId: "ex-deadlift", sets: 3, reps: 5, startKg: 100, kgPerSession: 2.5 },
      { exerciseId: "ex-bench", sets: 3, reps: 8, startKg: 55, kgPerSession: 1.25 },
      { exerciseId: "ex-barbellrow", sets: 3, reps: 8, startKg: 50, kgPerSession: 1.25 },
    ],
    measurements: [
      { typeId: "mt-weight", start: 68, perWeek: 0.15 },
      { typeId: "mt-arms", start: 33, perWeek: 0.1 },
    ],
    package: { remaining: 4, expiresDaysFromNow: 10 },
    todayHours: [], tomorrowHours: [],
  },
  {
    // Package with NO expiry (shows expiry is optional). Steady progress.
    id: "c6", name: "Divya Nair", phone: "+91 98765 01006",
    goal: "Toning and core strength", notes: "Lower back sensitivity; no deadlifts.",
    trainerId: "t1", joinedDaysAgo: 90, gapDays: 7, lastSessionDaysAgo: 5, hour: 19,
    exercises: [
      { exerciseId: "ex-hipthrust", sets: 3, reps: 10, startKg: 50, kgPerSession: 1.25 },
      { exerciseId: "ex-seatedrow", sets: 3, reps: 12, startKg: 40, kgPerSession: 1.25 },
      { exerciseId: "ex-lateralraise", sets: 3, reps: 12, startKg: 6, kgPerSession: 0 },
    ],
    measurements: [
      { typeId: "mt-waist", start: 84, perWeek: -0.2 },
    ],
    package: { remaining: 7 }, // no expiresDaysFromNow on purpose
    todayHours: [], tomorrowHours: [19],
  },

  // --- Rahul Verma (t2) ----------------------------------------------------
  {
    // Progressing: deadlift and press climbing steadily for trekking season.
    id: "c7", name: "Aditya Rao", phone: "+91 98765 01007",
    goal: "Strength for trekking season", notes: "Ankle sprain history; watch single-leg work.",
    trainerId: "t2", joinedDaysAgo: 84, gapDays: 5, lastSessionDaysAgo: 1, hour: 7,
    exercises: [
      { exerciseId: "ex-deadlift", sets: 3, reps: 5, startKg: 90, kgPerSession: 2.5 },
      { exerciseId: "ex-ohp", sets: 3, reps: 8, startKg: 40, kgPerSession: 1.25 },
      { exerciseId: "ex-splitsquat", sets: 3, reps: 10, startKg: 20, kgPerSession: 1.25 },
    ],
    measurements: [
      { typeId: "mt-thighs", start: 56, perWeek: 0.15 },
      { typeId: "mt-weight", start: 74, perWeek: 0.1 },
    ],
    package: { remaining: 7, expiresDaysFromNow: 35 },
    feelCycle: [4, 5, 5, 4, 5],
    todayHours: [7], tomorrowHours: [],
  },
  {
    // Plateau: squat/pulldown/leg press stalled; weight and waist also flat.
    id: "c8", name: "Pooja Joshi", phone: "+91 98765 01008",
    goal: "Fat loss — target 60 kg", notes: "PCOS; expects slower progress.",
    trainerId: "t2", joinedDaysAgo: 90, gapDays: 6, lastSessionDaysAgo: 3, hour: 18,
    exercises: [
      { exerciseId: "ex-squat", sets: 3, reps: 8, startKg: 45, kgPerSession: 1.25, stallAfter: 5 },
      { exerciseId: "ex-latpulldown", sets: 3, reps: 10, startKg: 40, kgPerSession: 1.25, stallAfter: 5 },
      { exerciseId: "ex-legpress", sets: 3, reps: 10, startKg: 90, kgPerSession: 2.5, stallAfter: 4 },
    ],
    measurements: [
      { typeId: "mt-weight", start: 68, perWeek: 0 },
      { typeId: "mt-waist", start: 85, perWeek: 0 },
    ],
    package: { remaining: 6, expiresDaysFromNow: 30 },
    todayHours: [], tomorrowHours: [18],
  },
  {
    // Going quiet: usual gap 8 days, last session 19 days ago.
    id: "c9", name: "Karan Malhotra", phone: "+91 98765 01009",
    goal: "Muscle gain", notes: "Shift worker; flexible timings.",
    trainerId: "t2", joinedDaysAgo: 60, gapDays: 8, lastSessionDaysAgo: 19, hour: 20,
    exercises: [
      { exerciseId: "ex-bench", sets: 3, reps: 8, startKg: 62.5, kgPerSession: 1.25 },
      { exerciseId: "ex-barbellrow", sets: 3, reps: 8, startKg: 55, kgPerSession: 1.25 },
      { exerciseId: "ex-curl", sets: 3, reps: 12, startKg: 15, kgPerSession: 0.5 },
    ],
    measurements: [
      { typeId: "mt-arms", start: 35, perWeek: 0.1 },
    ],
    package: { remaining: 4, expiresDaysFromNow: 20 },
    todayHours: [], tomorrowHours: [],
  },
  {
    // Low package: 2 sessions left.
    id: "c10", name: "Riya Sen", phone: "+91 98765 01010",
    goal: "Marathon prep strength", notes: "Avoid heavy spinal loading.",
    trainerId: "t2", joinedDaysAgo: 66, gapDays: 6, lastSessionDaysAgo: 6, hour: 7,
    exercises: [
      { exerciseId: "ex-lunges", sets: 3, reps: 12, startKg: 18, kgPerSession: 1 },
      { exerciseId: "ex-legpress", sets: 3, reps: 10, startKg: 100, kgPerSession: 2.5 },
      { exerciseId: "ex-calfraise", sets: 3, reps: 15, startKg: 40, kgPerSession: 2.5 },
    ],
    measurements: [
      { typeId: "mt-thighs", start: 52, perWeek: 0.1 },
    ],
    package: { remaining: 2, expiresDaysFromNow: 28 },
    todayHours: [], tomorrowHours: [],
  },
  {
    // Steady newer client, slight progress (healthy control example).
    id: "c11", name: "Sameer Khan", phone: "+91 98765 01011",
    goal: "General fitness", notes: "New to free weights.",
    trainerId: "t2", joinedDaysAgo: 48, gapDays: 7, lastSessionDaysAgo: 2, hour: 18,
    exercises: [
      { exerciseId: "ex-chestfly", sets: 3, reps: 12, startKg: 20, kgPerSession: 1 },
      { exerciseId: "ex-seatedrow", sets: 3, reps: 10, startKg: 35, kgPerSession: 1.25 },
      { exerciseId: "ex-legpress", sets: 3, reps: 10, startKg: 80, kgPerSession: 2.5 },
    ],
    measurements: [
      { typeId: "mt-weight", start: 79, perWeek: -0.1 },
    ],
    package: { remaining: 9, expiresDaysFromNow: 50 },
    todayHours: [18], tomorrowHours: [],
    // Marked completed at the desk but the trainer never logged the details —
    // shows up in the owner's logging-consistency metric.
    extraBookings: [{ daysAgo: 20, status: "completed" }],
  },
  {
    // Steady; posture/back focus.
    id: "c12", name: "Ishaan Bose", phone: "+91 98765 01012",
    goal: "Posture and back strength", notes: "Desk job; tight hips.",
    trainerId: "t2", joinedDaysAgo: 72, gapDays: 7, lastSessionDaysAgo: 4, hour: 19,
    exercises: [
      { exerciseId: "ex-latpulldown", sets: 3, reps: 10, startKg: 50, kgPerSession: 1.25 },
      { exerciseId: "ex-facepull", sets: 3, reps: 15, startKg: 25, kgPerSession: 1.25 },
      { exerciseId: "ex-barbellrow", sets: 3, reps: 10, startKg: 45, kgPerSession: 1.25 },
    ],
    measurements: [
      { typeId: "mt-chest", start: 100, perWeek: 0.1 },
    ],
    package: { remaining: 6, expiresDaysFromNow: 40 },
    todayHours: [], tomorrowHours: [18],
  },

  // --- Meera Iyer (t3) -----------------------------------------------------
  {
    // Progressing: weight, waist and hips all trending to goal.
    id: "c13", name: "Tanvi Deshpande", phone: "+91 98765 01013",
    goal: "Fat loss — 10 kg", notes: "Vegetarian; protein mainly from dairy.",
    trainerId: "t3", joinedDaysAgo: 80, gapDays: 6, lastSessionDaysAgo: 3, hour: 7,
    exercises: [
      { exerciseId: "ex-gobletsquat", sets: 3, reps: 12, startKg: 20, kgPerSession: 1 },
      { exerciseId: "ex-ohp", sets: 3, reps: 8, startKg: 25, kgPerSession: 1.25 },
      { exerciseId: "ex-hipthrust", sets: 3, reps: 10, startKg: 55, kgPerSession: 1.25 },
    ],
    measurements: [
      { typeId: "mt-weight", start: 72, perWeek: -0.5 },
      { typeId: "mt-waist", start: 88, perWeek: -0.6 },
      { typeId: "mt-hips", start: 102, perWeek: -0.5 },
    ],
    package: { remaining: 5, expiresDaysFromNow: 32 },
    feelCycle: [4, 4, 5, 5, 5],
    todayHours: [7], tomorrowHours: [],
  },
  {
    // Package expiring in 12 days (renewal opportunity).
    id: "c14", name: "Neha Kapoor", phone: "+91 98765 01014",
    goal: "Toning", notes: "Prefers mornings before work.",
    trainerId: "t3", joinedDaysAgo: 70, gapDays: 6, lastSessionDaysAgo: 2, hour: 8,
    exercises: [
      { exerciseId: "ex-seatedrow", sets: 3, reps: 12, startKg: 38, kgPerSession: 1.25 },
      { exerciseId: "ex-lunges", sets: 3, reps: 12, startKg: 14, kgPerSession: 1 },
      { exerciseId: "ex-lateralraise", sets: 3, reps: 12, startKg: 6, kgPerSession: 0 },
    ],
    measurements: [
      { typeId: "mt-arms", start: 30, perWeek: 0.05 },
    ],
    package: { remaining: 6, expiresDaysFromNow: 12 },
    todayHours: [], tomorrowHours: [8],
  },
  {
    // Plateau: maintenance client; big lifts flat for 6+ weeks.
    id: "c15", name: "Manish Patel", phone: "+91 98765 01015",
    goal: "Strength maintenance", notes: "Travels often; irregular schedule.",
    trainerId: "t3", joinedDaysAgo: 96, gapDays: 7, lastSessionDaysAgo: 4, hour: 17,
    exercises: [
      { exerciseId: "ex-bench", sets: 3, reps: 8, startKg: 70, kgPerSession: 1.25, stallAfter: 4 },
      { exerciseId: "ex-deadlift", sets: 3, reps: 5, startKg: 120, kgPerSession: 2.5, stallAfter: 4 },
      { exerciseId: "ex-ohp", sets: 3, reps: 8, startKg: 45, kgPerSession: 1.25, stallAfter: 5 },
    ],
    measurements: [
      { typeId: "mt-weight", start: 82, perWeek: 0 },
      { typeId: "mt-chest", start: 105, perWeek: 0 },
    ],
    package: { remaining: 5, expiresDaysFromNow: 26 },
    todayHours: [], tomorrowHours: [17],
  },
  {
    // Going quiet: usual gap 10 days, last session 26 days ago.
    id: "c16", name: "Alok Mishra", phone: "+91 98765 01016",
    goal: "Weight loss", notes: "Knee issue; avoid deep squats.",
    trainerId: "t3", joinedDaysAgo: 78, gapDays: 10, lastSessionDaysAgo: 26, hour: 18,
    exercises: [
      { exerciseId: "ex-legpress", sets: 3, reps: 10, startKg: 90, kgPerSession: 2.5 },
      { exerciseId: "ex-chestfly", sets: 3, reps: 12, startKg: 22, kgPerSession: 1 },
      { exerciseId: "ex-seatedrow", sets: 3, reps: 10, startKg: 38, kgPerSession: 1.25 },
    ],
    measurements: [
      { typeId: "mt-weight", start: 88, perWeek: -0.25 },
    ],
    package: { remaining: 3, expiresDaysFromNow: 30 },
    todayHours: [], tomorrowHours: [],
  },
  {
    // Active client, but has a NO-SHOW booking 9 days ago.
    id: "c17", name: "Farah Ali", phone: "+91 98765 01017",
    goal: "General fitness", notes: "Wrist strain; uses lifting straps.",
    trainerId: "t3", joinedDaysAgo: 62, gapDays: 6, lastSessionDaysAgo: 6, hour: 17,
    exercises: [
      { exerciseId: "ex-latpulldown", sets: 3, reps: 10, startKg: 48, kgPerSession: 1.25 },
      { exerciseId: "ex-lunges", sets: 3, reps: 12, startKg: 16, kgPerSession: 1 },
      { exerciseId: "ex-ohp", sets: 3, reps: 8, startKg: 22, kgPerSession: 1.25 },
    ],
    measurements: [
      { typeId: "mt-bodyfat", start: 30, perWeek: -0.15 },
    ],
    package: { remaining: 7, expiresDaysFromNow: 44 },
    todayHours: [17], tomorrowHours: [],
    extraBookings: [{ daysAgo: 9, status: "no_show" }],
  },
  {
    // Stale booked booking 5 days ago (never showed, never logged) = no-show flag.
    id: "c18", name: "Gaurav Menon", phone: "+91 98765 01018",
    goal: "Muscle gain", notes: "Lower back tightness; stretch before lifting.",
    trainerId: "t3", joinedDaysAgo: 84, gapDays: 6, lastSessionDaysAgo: 11, hour: 7,
    exercises: [
      { exerciseId: "ex-deadlift", sets: 3, reps: 5, startKg: 95, kgPerSession: 2.5 },
      { exerciseId: "ex-bench", sets: 3, reps: 8, startKg: 52.5, kgPerSession: 1.25 },
      { exerciseId: "ex-curl", sets: 3, reps: 12, startKg: 14, kgPerSession: 0.5 },
    ],
    measurements: [
      { typeId: "mt-weight", start: 76, perWeek: 0.1 },
      { typeId: "mt-arms", start: 34, perWeek: 0.1 },
    ],
    package: { remaining: 5, expiresDaysFromNow: 50 },
    todayHours: [], tomorrowHours: [],
    extraBookings: [{ daysAgo: 5, status: "booked" }],
  },
];

// ---------------------------------------------------------------------------
// Spec expansion: turns each ClientSpec into bookings, sessions, measurements
// ---------------------------------------------------------------------------

interface BuiltClient {
  client: Client;
  pkg: Package;
  bookings: Booking[];
  sessions: Session[];
  measurements: Measurement[];
}

function buildFromSpec(spec: ClientSpec): BuiltClient {
  // Session days, oldest first, every gapDays, ending exactly at lastSessionDaysAgo.
  const sessionDays: number[] = [];
  for (let d = spec.joinedDaysAgo; d >= spec.lastSessionDaysAgo; d -= spec.gapDays) {
    sessionDays.push(d);
  }
  if (sessionDays[sessionDays.length - 1] !== spec.lastSessionDaysAgo) {
    sessionDays[sessionDays.length - 1] = spec.lastSessionDaysAgo;
  }

  const pkg: Package = {
    id: `${spec.id}-pkg`,
    gymId: GYM_ID,
    clientId: spec.id,
    totalSessions: 0, // filled in below
    purchasedAt: isoDaysAgo(spec.joinedDaysAgo, 12),
    expiresAt:
      spec.package.expiresDaysFromNow != null
        ? isoDaysAgo(-spec.package.expiresDaysFromNow, 20)
        : undefined,
  };

  const bookings: Booking[] = [];
  const sessions: Session[] = [];
  const feelCycle = spec.feelCycle ?? [4, 4, 5, 3, 5];

  sessionDays.forEach((day, i) => {
    const bookingId = `${spec.id}-b${i}`;
    const startsAt = isoDaysAgo(day, spec.hour);
    bookings.push({
      id: bookingId,
      gymId: GYM_ID,
      clientId: spec.id,
      trainerId: spec.trainerId,
      packageId: pkg.id,
      startsAt,
      status: "completed",
    });

    const exercises = spec.exercises.map((ex) => {
      const progressed = ex.stallAfter != null && i >= ex.stallAfter ? ex.stallAfter : i;
      const weightKg = round(ex.startKg + ex.kgPerSession * progressed, 2);
      return {
        exerciseId: ex.exerciseId,
        sets: Array.from({ length: ex.sets }, () => ({ reps: ex.reps, weightKg })),
      };
    });

    sessions.push({
      id: `${spec.id}-s${i}`,
      gymId: GYM_ID,
      bookingId,
      clientId: spec.id,
      trainerId: spec.trainerId,
      date: startsAt,
      notes: SESSION_NOTES[i % SESSION_NOTES.length],
      feelRating: feelCycle[i % feelCycle.length],
      exercises,
    });
  });

  // Package total = sessions actually used + desired remaining.
  pkg.totalSessions = sessions.length + spec.package.remaining;

  // Measurements roughly every 3.5 weeks while the client was active.
  const measurements: Measurement[] = [];
  spec.measurements.forEach((m, tIdx) => {
    let week = 0;
    for (let d = spec.joinedDaysAgo - 7; d >= spec.lastSessionDaysAgo - 4; d -= 24) {
      const weeks = m.stallAfterWeeks != null && week >= m.stallAfterWeeks ? m.stallAfterWeeks : week;
      measurements.push({
        id: `${spec.id}-m${tIdx}-${week}`,
        gymId: GYM_ID,
        clientId: spec.id,
        typeId: m.typeId,
        value: round(m.start + m.perWeek * weeks, 1),
        date: isoDaysAgo(d, 10),
      });
      week += 24 / 7;
    }
  });

  // Keep "Today" views busy for every trainer.
  const extra = (hours: number[] | undefined, daysFromNow: number, suffix: string) =>
    (hours ?? []).forEach((h, i) =>
      bookings.push({
        id: `${spec.id}-${suffix}${i}`,
        gymId: GYM_ID,
        clientId: spec.id,
        trainerId: spec.trainerId,
        packageId: pkg.id,
        startsAt: isoDaysAgo(-daysFromNow, h),
        status: "booked",
      })
    );
  extra(spec.todayHours, 0, "today");
  extra(spec.tomorrowHours, 1, "tom");

  // No-shows and other irregular bookings.
  (spec.extraBookings ?? []).forEach((eb, i) =>
    bookings.push({
      id: `${spec.id}-x${i}`,
      gymId: GYM_ID,
      clientId: spec.id,
      trainerId: spec.trainerId,
      packageId: pkg.id,
      startsAt: isoDaysAgo(eb.daysAgo, spec.hour),
      status: eb.status,
    })
  );

  const client: Client = {
    id: spec.id,
    gymId: GYM_ID,
    name: spec.name,
    phone: spec.phone,
    joinedAt: isoDaysAgo(spec.joinedDaysAgo, 12),
    goal: spec.goal,
    assignedTrainerId: spec.trainerId,
    notes: spec.notes,
  };

  return { client, pkg, bookings, sessions, measurements };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function buildSeedData(): GymData {
  const clients: Client[] = [];
  const packages: Package[] = [];
  const bookings: Booking[] = [];
  const sessions: Session[] = [];
  const measurements: Measurement[] = [];

  for (const spec of CLIENT_SPECS) {
    const built = buildFromSpec(spec);
    clients.push(built.client);
    packages.push(built.pkg);
    bookings.push(...built.bookings);
    sessions.push(...built.sessions);
    measurements.push(...built.measurements);
  }

  return {
    gym: GYM,
    staff: STAFF,
    clients,
    packages,
    bookings,
    sessions,
    exercises: EXERCISES,
    measurementTypes: MEASUREMENT_TYPES,
    measurements,
  };
}
