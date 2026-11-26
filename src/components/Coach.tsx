import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { CoachEvent } from "../hooks/useCoach";

const PRAISE = ["Bra!", "Snyggt!", "Wow!", "Rätt!", "Toppen!", "Superbra!"];
const COMBO = ["Tre i rad! 🔥", "Du är het! 🔥", "Vilken kombo! ⚡"];
const COMFORT = ["Nästan!", "Försök igen!", "Du klarar det!", "Ingen fara!"];

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];

/**
 * Ugglan Nabu som coach i hörnet: hoppar och säger något när barnet svarar.
 * Spelet skickar in ett `event` som ändras vid varje svar.
 */
export function Coach({ event }: { event: CoachEvent | null }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!event) return;
    const text =
      event.kind === "wrong" ? pick(COMFORT) : event.combo > 0 && event.combo % 3 === 0 ? pick(COMBO) : pick(PRAISE);
    setMsg(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 1300);
    return () => window.clearTimeout(timer.current);
  }, [event]);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-30 flex items-end gap-2 rtl:left-4 rtl:right-auto" dir="ltr">
      <AnimatePresence>
        {msg && (
          <motion.div
            key={msg + (event?.n ?? 0)}
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mb-8 rounded-2xl rounded-br-sm bg-white px-3 py-1.5 text-sm font-bold text-purple-600 shadow-lg dark:bg-zinc-800 dark:text-purple-300"
          >
            {msg}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.span
        key={event?.n ?? 0}
        animate={
          event?.kind === "correct"
            ? { y: [0, -18, 0], rotate: [0, -10, 10, 0] }
            : event?.kind === "wrong"
              ? { rotate: [0, -8, 8, 0] }
              : {}
        }
        transition={{ duration: 0.5 }}
        className="text-5xl drop-shadow"
        aria-hidden
      >
        🦉
      </motion.span>
    </div>
  );
}
