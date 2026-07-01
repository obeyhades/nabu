/** Duolingo-stil progress-bar (grön, rundad). value = 0–1. */
export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
