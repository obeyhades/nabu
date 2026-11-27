import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Byter fråga med en mjuk glid-animation. `qkey` ändras för varje ny fråga.
 *
 * `split`: frågeytan delas i .stage-prompt (frågan), .stage-answers (svaren,
 * t.ex. FitGrid) och .stage-count (räknaren). Stående ligger de under varandra;
 * på en liggande mobil hamnar frågan till vänster och svaren till höger, så att
 * inga svar hamnar under skärmkanten.
 */
export function QuestionStage({
  qkey,
  split = false,
  className,
  children,
}: {
  qkey: string | number;
  split?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Stage key={qkey} split={split} className={className}>
        {children}
      </Stage>
    </AnimatePresence>
  );
}

function Stage({ split, className, children }: { split: boolean; className?: string; children: ReactNode }) {
  // Frågan som glider ut går inte att trycka på: annars kunde ett snabbt
  // dubbeltryck på t.ex. "Nästa" träffa det gamla kortet en gång till.
  const present = useIsPresent();
  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -60, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      inert={!present}
      style={present ? undefined : { pointerEvents: "none" }}
      className={cn(
        split ? "stage-split" : "flex w-full min-h-0 flex-1 flex-col items-center justify-center gap-6 short:gap-3",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/** Stor emoji/bild som studsar in. */
export function BigPicture({ children, className = "text-8xl" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -15 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 14 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** "3 / 10" under svaren (på en liggande mobil under frågan). */
export function RoundCount({ n, of, className }: { n: number; of: number; className?: string }) {
  return (
    <span dir="ltr" className={cn("stage-count font-semibold text-zinc-500 dark:text-zinc-400", className)}>
      {n} / {of}
    </span>
  );
}
