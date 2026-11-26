import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";

import type { ChoiceState } from "../lib/choice";

/**
 * Svarsknapp med animation: studsar in, poppar vid rätt svar, skakar vid fel.
 * `state` räknas ut av spelet; knappen sköter bara utseendet.
 */
export function ChoiceButton({
  state,
  onClick,
  children,
  index = 0,
  className,
  label,
}: {
  state: ChoiceState;
  onClick: () => void;
  children: ReactNode;
  index?: number; // för att knapparna ska dyka upp en i taget
  className?: string;
  label?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={state !== "idle"}
      initial={{ scale: 0.6, opacity: 0, y: 12 }}
      animate={
        state === "correct"
          ? { scale: [1, 1.18, 1], opacity: 1, y: 0, rotate: [0, -4, 4, 0] }
          : state === "wrong"
            ? { x: [0, -10, 10, -6, 6, 0], opacity: 1, scale: 1, y: 0 }
            : { scale: 1, opacity: state === "dim" ? 0.35 : 1, y: 0 }
      }
      transition={{
        delay: state === "idle" ? index * 0.05 : 0,
        type: "spring",
        stiffness: 420,
        damping: 18,
      }}
      whileHover={state === "idle" ? { y: -3 } : undefined}
      whileTap={state === "idle" ? { scale: 0.92 } : undefined}
      className={cn(
        "flex items-center justify-center rounded-3xl shadow transition-colors",
        state === "idle" && "bg-white dark:bg-zinc-800",
        state === "correct" && "bg-emerald-500 text-white",
        state === "wrong" && "bg-red-400 text-white",
        state === "dim" && "bg-white dark:bg-zinc-800",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
