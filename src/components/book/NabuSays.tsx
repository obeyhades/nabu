import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { Mascot } from "../Mascot";

/**
 * Nabu med en pratbubbla (bokens välkomst och ledtråden "Titta efter formen!").
 * Nabu bär det hen har på sig i boet. Bubblan tonar in; vid reducerad rörelse
 * bara opacitet (MotionConfig på sidan).
 */
export function NabuSays({ children, className, size = "text-5xl" }: { children: ReactNode; className?: string; size?: string }) {
  return (
    <div dir="ltr" className={cn("flex items-end gap-2", className)}>
      <Mascot mood="idle" className={cn("shrink-0 drop-shadow", size)} />
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="mb-4 min-w-0 rounded-2xl rounded-bl-sm bg-white px-4 py-3 font-semibold text-zinc-800 shadow-lg ring-1 ring-black/5 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
      >
        {children}
      </motion.div>
    </div>
  );
}
