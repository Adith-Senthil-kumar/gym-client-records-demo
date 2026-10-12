"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardList,
  Plus,
  Search,
  X,
} from "lucide-react";
import { RoleNotice } from "@/components/RoleNotice";
import { Stepper } from "@/components/Stepper";
import { daysAgoLabel, isSameDay } from "@/lib/format";
import { describeSessionChanges } from "@/lib/insights";
import {
  addExercise,
  addSession,
  getActivePackageSummaryForClient,
  getClientById,
  getExerciseById,
  getLatestSessionForClient,
  listBookings,
  listExercises,
  listSessions,
} from "@/lib/repo";
import { useCurrentStaff } from "@/lib/select";
import { useDemoStore } from "@/lib/store";

interface Draft {
  exerciseId: string;
  sets: { reps: number; weightKg: number }[];
}

const FEEL = [
  { value: 1, emoji: "😞", label: "Struggled" },
  { value: 2, emoji: "😕", label: "Tired" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
];

export default function LogSessionPage() {
  return (
    <Suspense fallback={null}>
      <LogSessionContent />
    </Suspense>
  );
}

function LogSessionContent() {
  useDemoStore((s) => s.version);
  const { clientId } = useParams<{ clientId: string }>();
  const searchParams = useSearchParams();
  const staff = useCurrentStaff();
  const router = useRouter();
  const client = getClientById(clientId);
  const last = client ? getLatestSessionForClient(client.id) : undefined;

  const [exercises, setExercises] = useState<Draft[]>(() =>
    last ? last.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.map((s) => ({ ...s })) })) : []
  );
  const [feelRating, setFeelRating] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState<{ changes: string; remaining?: number; linkedBooking: boolean } | null>(null);

  if (!staff || !client) return null;
  if (staff.role !== "trainer") return <RoleNotice staff={staff} pageFor="trainers" />;

  const bookingParam = searchParams.get("booking");
  const booking = listBookings().find(
    (b) =>
      b.id === bookingParam ||
      (!bookingParam &&
        b.clientId === client.id &&
        b.trainerId === staff.id &&
        b.status === "booked" &&
        isSameDay(b.startsAt, new Date()))
  );

  // Guard against double-logging a booking that already has a session.
  if (booking && listSessions().some((s) => s.bookingId === booking.id)) {
    return (
      <div className="mx-auto mt-8 max-w-md space-y-5 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-8 w-8" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Already logged</h1>
          <p className="text-sm text-zinc-500">
            {`A session for ${client.name}'s booking has already been saved.`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/today")}
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700"
          >
            Today
          </button>
          <Link
            href={`/clients/${client.id}?tab=sessions`}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
          >
            View session
          </Link>
        </div>
      </div>
    );
  }

  const setStartMode = (mode: "copy" | "blank") => {
    if (mode === "copy" && last) {
      setExercises(last.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.map((s) => ({ ...s })) })));
    } else {
      setExercises([]);
    }
  };

  const addExerciseToDraft = (exerciseId: string) => {
    setExercises((prev) => {
      if (prev.some((e) => e.exerciseId === exerciseId)) return prev;
      // If this exercise was in the last session, prefill its sets.
      const lastEntry = last?.exercises.find((e) => e.exerciseId === exerciseId);
      const sets = lastEntry
        ? lastEntry.sets.map((s) => ({ ...s }))
        : [{ reps: 10, weightKg: 0 }];
      return [...prev, { exerciseId, sets }];
    });
  };

  const handleSave = () => {
    const session = addSession({
      bookingId: booking?.id,
      clientId: client.id,
      trainerId: staff.id,
      date: new Date().toISOString(),
      notes,
      feelRating,
      exercises: exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets })),
    });
    const changes = describeSessionChanges(last, session, listExercises());
    const remaining = getActivePackageSummaryForClient(client.id)?.remaining;
    setSaved({ changes, remaining, linkedBooking: !!booking });
  };

  if (saved) {
    return (
      <div className="mx-auto mt-8 max-w-md space-y-5 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-8 w-8" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Session saved</h1>
          <p className="text-sm text-zinc-500">{saved.changes}</p>
        </div>
        <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 text-left text-sm">
          {saved.linkedBooking && (
            <p className="flex items-center gap-2 text-zinc-600">
              <Check className="h-4 w-4 text-emerald-500" /> Booking marked as completed
            </p>
          )}
          {saved.remaining !== undefined && (
            <p className="flex items-center gap-2 text-zinc-600">
              <Check className="h-4 w-4 text-emerald-500" /> {saved.remaining} sessions left on the
              package
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/today")}
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700"
          >
            Today
          </button>
          <Link
            href={`/clients/${client.id}?tab=sessions`}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Client profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-32">
      <Link
        href={`/clients/${client.id}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500"
      >
        <ArrowLeft className="h-4 w-4" />
        {client.name}
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-900">
          <ClipboardList className="h-5 w-5 text-indigo-600" />
          Log session
        </h1>
        <p className="text-sm text-zinc-500">
          {booking
            ? `Today's booking · linked when you save`
            : "Not linked to a booking (won't use a package session)"}
        </p>
      </div>

      {/* Starting point */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setStartMode("copy")}
          disabled={!last}
          className="rounded-2xl border border-zinc-200 bg-white p-3.5 text-left disabled:opacity-40"
        >
          <p className="text-sm font-semibold text-zinc-900">Copy last session</p>
          <p className="text-xs text-zinc-500">
            {last ? `From ${daysAgoLabel(last.date)} · ${last.exercises.length} exercises` : "No previous session"}
          </p>
        </button>
        <button
          onClick={() => setStartMode("blank")}
          className="rounded-2xl border border-zinc-200 bg-white p-3.5 text-left"
        >
          <p className="text-sm font-semibold text-zinc-900">Start blank</p>
          <p className="text-xs text-zinc-500">Pick exercises from scratch</p>
        </button>
      </div>

      {/* Exercises */}
      {exercises.length === 0 && (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-sm text-zinc-400">
          No exercises yet — add the first one below.
        </p>
      )}

      <div className="space-y-3">
        {exercises.map((draft, exIdx) => (
          <ExerciseCard
            key={draft.exerciseId}
            draft={draft}
            onChange={(sets) =>
              setExercises((prev) => prev.map((e, i) => (i === exIdx ? { ...e, sets } : e)))
            }
            onRemove={() => setExercises((prev) => prev.filter((_, i) => i !== exIdx))}
          />
        ))}
      </div>

      <ExercisePicker onAdd={addExerciseToDraft} />

      {/* Feel + notes */}
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <p className="text-sm font-semibold text-zinc-900">How did {client.name.split(" ")[0]} feel?</p>
        <div className="flex justify-between gap-1">
          {FEEL.map((f) => (
            <button
              key={f.value}
              onClick={() => setFeelRating(f.value)}
              aria-label={f.label}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl ${
                feelRating === f.value
                  ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200"
                  : "border-zinc-200 bg-white"
              }`}
            >
              {f.emoji}
            </button>
          ))}
        </div>
        {feelRating !== undefined && (
          <p className="text-xs text-zinc-400">“{FEEL[feelRating - 1].label}”</p>
        )}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Session notes — form cues, energy, anything to remember…"
          rows={3}
          className="w-full rounded-xl border border-zinc-200 p-3 text-sm focus:border-indigo-400 focus:outline-none"
        />
      </div>

      {/* Sticky save */}
      <div className="fixed inset-x-0 bottom-[72px] z-40 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur md:bottom-0 md:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 md:max-w-5xl">
          <p className="text-xs text-zinc-500">
            {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
            {exercises.reduce((n, e) => n + e.sets.length, 0) > 0 &&
              ` · ${exercises.reduce((n, e) => n + e.sets.length, 0)} sets`}
          </p>
          <button
            onClick={handleSave}
            disabled={exercises.length === 0}
            className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-40"
          >
            Save session
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ExerciseCard({
  draft,
  onChange,
  onRemove,
}: {
  draft: Draft;
  onChange: (sets: Draft["sets"]) => void;
  onRemove: () => void;
}) {
  const name = getExerciseById(draft.exerciseId)?.name ?? draft.exerciseId;

  const updateSet = (setIdx: number, patch: Partial<Draft["sets"][number]>) =>
    onChange(draft.sets.map((s, i) => (i === setIdx ? { ...s, ...patch } : s)));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-zinc-900">{name}</p>
        <button
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {draft.sets.map((set, setIdx) => (
          <div key={setIdx}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-400">Set {setIdx + 1}</p>
              <div className="flex items-center gap-1">
                {setIdx > 0 && (
                  <button
                    onClick={() => updateSet(setIdx, draft.sets[setIdx - 1])}
                    className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] text-zinc-500 active:bg-zinc-50"
                  >
                    Same as previous
                  </button>
                )}
                {draft.sets.length > 1 && (
                  <button
                    onClick={() => onChange(draft.sets.filter((_, i) => i !== setIdx))}
                    aria-label={`Remove set ${setIdx + 1}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <Stepper
                value={set.reps}
                onChange={(reps) => updateSet(setIdx, { reps })}
                step={1}
                ariaLabel="reps"
              />
              <span className="text-sm text-zinc-400">×</span>
              <Stepper
                value={set.weightKg}
                onChange={(weightKg) => updateSet(setIdx, { weightKg })}
                step={2.5}
                ariaLabel="weight in kg"
              />
              <span className="text-sm text-zinc-400">kg</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onChange([...draft.sets, { ...draft.sets[draft.sets.length - 1] }])}
        className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 text-sm font-medium text-indigo-600 active:bg-indigo-50"
      >
        <Plus className="h-4 w-4" />
        Add set (same as last)
      </button>
    </div>
  );
}

function ExercisePicker({ onAdd }: { onAdd: (exerciseId: string) => void }) {
  const [query, setQuery] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const q = query.trim().toLowerCase();

  const library = listExercises();
  const matches = (q ? library.filter((e) => e.name.toLowerCase().includes(q)) : library).slice(0, 6);
  const exactMatch = library.some((e) => e.name.toLowerCase() === q);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="mb-2 text-sm font-semibold text-zinc-900">Add exercise</p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowNewForm(false);
          }}
          placeholder="Search the exercise library…"
          className="h-11 w-full rounded-xl border border-zinc-200 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none"
        />
      </div>

      {q && !showNewForm && (
        <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200">
          {matches.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                onAdd(e.id);
                setQuery("");
              }}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-zinc-50"
            >
              <span className="text-zinc-800">{e.name}</span>
              <span className="text-xs text-zinc-400">{e.muscleGroup}</span>
            </button>
          ))}
          {matches.length === 0 && (
            <p className="px-3 py-2.5 text-sm text-zinc-400">No matches in the library</p>
          )}
          {!exactMatch && (
            <button
              onClick={() => setShowNewForm(true)}
              className="flex w-full items-center gap-2 border-t border-zinc-100 px-3 py-2.5 text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="h-4 w-4" />
              Add “{query.trim()}” as a new exercise
              <ChevronRight className="ml-auto h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {!q && !showNewForm && (
        <button
          onClick={() => setShowNewForm(true)}
          className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 text-sm font-medium text-zinc-500"
        >
          <Plus className="h-4 w-4" />
          Add a brand-new exercise
        </button>
      )}

      {showNewForm && <NewExerciseForm onAdd={onAdd} onDone={() => { setQuery(""); setShowNewForm(false); }} defaultName={query.trim()} />}
    </div>
  );
}

function NewExerciseForm({
  onAdd,
  onDone,
  defaultName,
}: {
  onAdd: (exerciseId: string) => void;
  onDone: () => void;
  defaultName: string;
}) {
  const [name, setName] = useState(defaultName);
  const groups = [...new Set(listExercises().map((e) => e.muscleGroup))].sort();
  const [muscleGroup, setMuscleGroup] = useState(groups[0] ?? "Other");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const exercise = addExercise({ name: name.trim(), muscleGroup });
        onAdd(exercise.id);
        onDone();
      }}
      className="mt-3 space-y-2.5 rounded-xl bg-zinc-50 p-3"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise name"
        autoFocus
        className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-indigo-400 focus:outline-none"
      />
      <select
        value={muscleGroup}
        onChange={(e) => setMuscleGroup(e.target.value)}
        className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-indigo-400 focus:outline-none"
      >
        {groups.map((g) => (
          <option key={g}>{g}</option>
        ))}
        <option value="Other">Other</option>
      </select>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-xl border border-zinc-300 bg-white py-2.5 text-sm font-medium text-zinc-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white"
        >
          Add exercise
        </button>
      </div>
    </form>
  );
}
