import { AnimatePresence, motion } from "framer-motion";
import { BackButton } from "./BackButton";
import { ProgressBar } from "./ProgressBar";
import { getLevel } from "../data/levels";
import type { Level } from "../types";

/**
 * Överst i varje spel: tillbaka, nivå-bricka, framsteg och kombo-räknare
 * (🔥 när barnet har flera rätt i rad).
 */
export function GameHeader({
  onBack,
  progress,
  level,
  gold = false,
  combo = 0,
  extra,
}: {
  onBack: () => void;
  progress: number; // 0–1
  level?: Level;
  gold?: boolean;
  combo?: number;
  extra?: React.ReactNode;
}) {
  const info = level ? getLevel(level) : null;
  return (
    <div className="flex items-center gap-3 pt-2" dir="ltr">
      <BackButton onClick={onBack} />
      {info && (
        <span
          className={
            "flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-bold shadow " +
            (gold
              ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-white"
              : "bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300")
          }
          title={`Nivå ${info.level}`}
        >
          {gold ? "🥇" : info.icon} {info.level}
        </span>
      )}
      <ProgressBar value={progress} />
      <AnimatePresence>
        {combo >= 2 && (
          <motion.span
            key={combo}
            initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className="shrink-0 rounded-full bg-gradient-to-r from-orange-400 to-red-500 px-3 py-1 text-sm font-black text-white shadow"
            aria-label={`${combo} rätt i rad`}
          >
            🔥 {combo}
          </motion.span>
        )}
      </AnimatePresence>
      {extra}
    </div>
  );
}
