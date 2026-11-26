import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Byter fråga med en mjuk glid-animation. `qkey` ändras för varje ny fråga.
 */
export function QuestionStage({ qkey, children }: { qkey: string | number; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={qkey}
        initial={{ opacity: 0, x: 60, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -60, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="flex w-full flex-1 flex-col items-center justify-center gap-6"
      >
        {children}
      </motion.div>
    </AnimatePresence>
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
