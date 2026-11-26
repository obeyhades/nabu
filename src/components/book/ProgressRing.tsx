import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Sidans framstegsring i bokens index (samma stil som LevelRing): grå bana och
 * en bärnstensfärgad båge. En klar sida får en hel grön ring och en liten bock.
 * Mitten visar sidans emoji (eller affischens första bokstäver).
 */
export function ProgressRing({ frac, done, size = 64, children }: { frac: number; done: boolean; size?: number; children: ReactNode }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, done ? 1 : frac)));
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden focusable="false" className="absolute inset-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-white/80 dark:stroke-zinc-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={cn(done ? "stroke-emerald-500" : "stroke-amber-400", frac <= 0 && !done && "opacity-0")}
        />
      </svg>
      <span className="relative leading-none">{children}</span>
      {done && (
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[11px] font-black text-white ring-2 ring-white dark:ring-zinc-800"
        >
          ✓
        </span>
      )}
    </span>
  );
}
