# Gym Client Records & Insights — Demo

**Live demo: https://gym-client-records-demo.vercel.app**

A frontend-only demo shown to gym owners and personal trainers to validate the
idea. No server, no database, no auth. Data lives in `localStorage` behind a
repository layer, seeded with realistic history generated **relative to today**
so the demo never looks stale.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Recharts (charts), Zustand (reactivity only; persistence handled by the repo)
- Vitest for insight-function tests

## Commands

```bash
npm run dev        # develop
npm run build      # production build (also type-checks)
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest — insight function unit tests + seed regression
npx tsx scripts/verify-seed.ts  # sanity-check the engineered seed stories
```

If `npm test` fails with "Cannot find native binding" (a known npm bug with
optional dependencies that can resurface after installing packages), fix with:

```bash
rm -rf node_modules package-lock.json && npm install
```

## Structure

```
lib/
  types.ts       # data model: Gym, Staff, Client, Package, Booking, Session,
                 # SessionExercise, Exercise, MeasurementType, Measurement, InsightFlag
  config.ts      # ALL insight thresholds + storage keys. One place to tune.
  seed.ts        # demo data. Dates relative to today; see below.
  repo.ts        # repository layer — the ONLY code touching localStorage.
                 # Reads (getClients, addSession, ...) + resetDemoData().
  store.ts       # zustand version counter; repo bumps it after every write,
                 # components subscribe and re-read through the repo.
  insights.ts    # pure functions computing flags from data (no storage, no
                 # React) + human-readable explanations. Tested in
                 # insights.test.ts, incl. regression tests on the seed stories.
app/             # screens — see "Screens (routes)" below
components/      # AppShell, RoleSwitcher, FlagChip, Stepper, Toaster, ...
```

### How the insight rules work

All computed by `computeClientFlags` in `lib/insights.ts`, driven by `config`:

- **Plateau (lifts):** for the client's top 3 most frequently logged exercises,
  compare the best weight in the last `plateauWeeks` against the best before
  the window. "Best" compares weight first, then total reps at that weight, so
  adding reps counts as progress. Requires `plateauMinSessions` sessions in the
  window and history before it.
- **Plateau (measurements):** a tracked measurement changed less than
  `measurementStallByUnit[unit]` over the window (latest reading must be inside it).
- **Going quiet:** days since last session exceed `quietGapMultiplier` × the
  client's OWN median gap (min 3 sessions, `quietMinDays` floor), and the
  package still has value (sessions left, no expiry, or not yet expired).
- **No-show:** a booking before today that is still `booked` or marked
  `no_show` with no logged session. Today's bookings get the benefit of the doubt.
- **Package low / expiring:** sessions left ≤ `packageLowSessions` (derived from
  completed bookings linked to the package), or `expiresAt` within
  `packageExpiringDays` (already-expired is flagged critical).
- **Progressing:** a top lift improved, or a measurement moved toward the goal
  (direction inferred from the type name via `progressDirections` keywords:
  fat/waist/hips down, chest/arm/thigh up, anything else either way).

Every flag carries `severity` (`positive` / `warning` / `critical`), a short
`label` for chips, and a full-sentence `explanation` ready for the UI.

Key rule: **components never touch `localStorage`** — they import from `lib/repo.ts`.
Swapping in Supabase later means reimplementing that one file.

Also in `lib/`: `select.ts` (read-side selectors combining repo + insights, e.g.
`listClientSummaries(trainerId)`), `role.ts` (which staff member is "signed in"),
`toast.ts` (confirmation toasts), `format.ts` (display formatting helpers).

## Screens (routes)

All inside the app shell (`components/AppShell.tsx`): role switcher top bar +
bottom tab bar on mobile, sidebar on desktop. Pick a role from the top-right
menu — trainers see only their own clients.

| Route | Who | What |
|---|---|---|
| `/today` | Trainer | Today's bookings with last-session summary, flag chips, Log buttons, "Needs attention" |
| `/bookings` | Front desk, Owner | Day view with date switcher, grouped by trainer, status changes (completed / no-show / cancelled), create booking (bottom sheet) |
| `/clients` | All | Searchable client list — owner can additionally filter by trainer and by flag (front desk sees no insight flags) |
| `/clients/new` | Front desk, Owner | Register client (name, phone, goal, trainer, notes) |
| `/clients/[id]` | All | Profile: package status + tabs Overview / Sessions / Measurements / Notes (front desk sees only Overview + Notes; "Add package" for front desk/owner) |
| `/clients/[id]/packages/new` | Front desk, Owner | Sessions, purchase date, optional expiry |
| `/clients/[id]/log-session` | Trainer | Copy last session or start blank, exercise autocomplete, big steppers, feel + notes, save confirmation ("Squat +5 kg") |
| `/clients/[id]/measurements/new` | Trainer | Fast form, previous value beside each input |
| `/overview` | Owner | KPI cards, at-risk table with "copy follow-up message", session volume chart (6 weeks), package renewals, logging consistency per trainer |
| `/settings` | Owner | Reset demo data, live-edit insight thresholds, add/remove measurement types, staff list |
| `/debug` | — | Phase-2 flag debug page (every client's computed flags) |

## Changing insight thresholds

Defaults live in `lib/config.ts`; the owner Settings screen edits them at
runtime via `lib/thresholds.ts` (a zustand store that bumps the global data
version, so every flag recomputes live):

| Threshold | Config key | Default |
|---|---|---|
| Plateau window | `plateauWeeks` | 4 weeks |
| Min sessions in window to judge a plateau | `plateauMinSessions` | 3 |
| Measurement "stalled" change, per unit | `measurementStallByUnit` | kg 0.5, % 0.5, cm 1 |
| Going-quiet multiplier vs client's own median gap | `quietGapMultiplier` | 2x |
| Package low | `packageLowSessions` | 2 sessions left |
| Package expiring | `packageExpiringDays` | 14 days |

In phase 5 the owner Settings screen edits these at runtime; editing the file
changes the defaults.

## Changing seed data

Open `lib/seed.ts`. Each client is a small declarative "spec" at the top of the
file, expanded into full history by `buildFromSpec`:

```ts
{
  id: "c1", name: "Arjun Mehta", phone: "+91 98765 01001",
  goal: "Fat loss — target 78 kg", notes: "Mild hypertension; ...",
  trainerId: "t1",
  joinedDaysAgo: 78,     // all dates are relative to today
  gapDays: 6,            // this client's usual gap between sessions
  lastSessionDaysAgo: 2, // set much larger than gapDays to make them "go quiet"
  hour: 7,               // preferred session time
  exercises: [           // startKg + kgPerSession per session; stallAfter = plateau
    { exerciseId: "ex-squat", sets: 3, reps: 8, startKg: 60, kgPerSession: 2.5 },
  ],
  measurements: [        // every ~3.5 weeks; perWeek = change per week
    { typeId: "mt-weight", start: 86, perWeek: -0.4 },
  ],
  package: { remaining: 6, expiresDaysFromNow: 30 }, // omit expiresDaysFromNow = never expires
  todayHours: [7],       // bookings today (keeps the Today screen busy)
}
```

So: to make someone plateau, set `stallAfter` on their exercises; to make
someone go quiet, set `lastSessionDaysAgo` far beyond `gapDays`; to make a
package low, set `package.remaining` to 1-2. The 18 seeded clients are
deliberately engineered so **every** insight has at least one example (see the
comments next to each client).

The seeded stories (for the demo walkthrough):

- Progressing: Arjun Mehta, Aditya Rao, Tanvi Deshpande (+ steady Divya Nair, Sameer Khan)
- Plateau: Kavya Reddy, Pooja Joshi, Manish Patel
- Going quiet: Rohan Gupta, Karan Malhotra, Alok Mishra
- Package low: Sneha Kulkarni (1 left), Riya Sen (2 left)
- Package expiring: Vikram Singh (10 days), Neha Kapoor (12 days)
- No-shows: Farah Ali (marked), Gaurav Menon (stale "booked")
- Logging gap: Sameer Khan has one booking the desk marked completed but the trainer never logged (drives the owner's logging-consistency metric)
- No-expiry package: Divya Nair

Click **Reset demo data** (demo menu, or on the phase-1 page) to restore seeds.

## Changing measurement types

Measurement types are data, not hardcoded columns: `{ id, name, unit }`. The
defaults live in `lib/seed.ts` (`MEASUREMENT_TYPES`); at runtime the owner
Settings screen (phase 5) adds/removes types via `repo.addMeasurementType` /
`repo.removeMeasurementType`.

## Demo walkthrough script (3 minutes)

Goal: show the gym owner that the app replaces the paper register AND tells them
who needs attention today. Run it as **Priya (trainer)** first, then switch to
**Vikram (owner)**. Reset demo data before starting (menu → Reset demo data).

**Before the demo:** open the app, reset the data, stay on the role menu. Have
the browser window narrowed to phone-ish width for the first half — that's how
trainers will actually use it.

**Minute 1 — "This is what your trainers see" (as Priya):**
1. **Today** — "Every booked client for today, with what they did last time,
   right on the card. No flipping through the paper register."
   Point at Arjun Mehta: rising weights, 6 sessions left.
2. Point at **Needs attention** — "Rohan hasn't been in for three weeks, and
   he's paid for five more sessions. The app noticed before you would have."

**Minute 2 — "Logging takes 30 seconds" (as Priya):**
3. Tap **Log** on a client card → "It starts from their last session — the
   trainer just fixes the numbers they remember." Bump the squat +5 kg, tap a
   feel emoji, hit **Save session**.
4. Read the confirmation aloud — "Squat +5 kg — it tells the trainer what
   changed since last time. The booking is done and the package counted down."
   Note the card has moved to "Logged today".

**Minute 3 — "And this is what YOU see" (switch to Vikram, widen the window):**
5. **Overview** — "Across all trainers: who's at risk and why, in plain words.
   Sneha has one session left — that's a renewal conversation today."
6. Tap **Copy follow-up** on a quiet client — "A ready-to-send message. Paste
   it into WhatsApp, done."
7. **Settings → Insight thresholds** — "Every rule is a dial. Too many
   'plateau' flags? Widen the window and the whole app updates instantly."
   Bump the quiet multiplier to 5 and watch the at-risk list shrink.

**If they ask about the front desk:** switch to Anita — bookings day view,
register client, add package; note that the front desk never sees workout or
measurement data.

**Likely questions:** "Where does the data live?" — this demo stores it in the
browser; the structure is ready for a real database. "Do clients see this?" —
coming later. "Payments?" — coming later.

## Phases

- [x] Phase 1 — setup, types, repo layer, seed data, config
- [x] Phase 2 — insight functions + tests + debug page listing every client's flags
- [x] Phase 3 — trainer screens (Today, My clients, Client profile, Log session, Measurements)
- [x] Phase 4 — front desk screens (Bookings day view, Register client, Add package)
- [x] Phase 5 — owner dashboard and settings
- [x] Phase 6 — polish, empty states, mobile pass, walkthrough script
- [ ] Phase 5 — owner dashboard + settings
- [ ] Phase 6 — polish, empty states, mobile pass, walkthrough script
