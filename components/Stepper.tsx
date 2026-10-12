"use client";

// Large tap targets with minimal typing: big +/- buttons and an editable
// numeric field (numeric keyboard via inputMode). The input is uncontrolled
// with key={value}: any external value change (steppers, "same as last set")
// remounts it with the new value, so typing is never interrupted.

export function Stepper({
  value,
  onChange,
  step = 1,
  ariaLabel,
}: {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  ariaLabel: string;
}) {
  const bump = (dir: 1 | -1) => onChange(Math.round((value + dir * step) * 100) / 100);

  return (
    <div className="flex items-stretch">
      <button
        type="button"
        aria-label={`Decrease ${ariaLabel}`}
        onClick={() => bump(-1)}
        className="h-11 w-11 select-none rounded-l-xl border border-r-0 border-zinc-300 bg-white text-lg font-semibold text-zinc-600 active:bg-zinc-100"
      >
        −
      </button>
      <input
        key={value}
        defaultValue={String(value)}
        inputMode="decimal"
        type="text"
        aria-label={ariaLabel}
        onBlur={(e) => {
          const n = parseFloat(e.target.value);
          // Invalid or cleared input snaps back to the current value.
          onChange(Number.isNaN(n) ? value : n);
        }}
        className="h-11 w-16 border border-zinc-300 bg-white text-center text-sm font-semibold tabular-nums focus:border-indigo-400 focus:outline-none"
      />
      <button
        type="button"
        aria-label={`Increase ${ariaLabel}`}
        onClick={() => bump(1)}
        className="h-11 w-11 select-none rounded-r-xl border border-l-0 border-zinc-300 bg-white text-lg font-semibold text-zinc-600 active:bg-zinc-100"
      >
        +
      </button>
    </div>
  );
}
