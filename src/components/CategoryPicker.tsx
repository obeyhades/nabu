import { motion } from "framer-motion";
import { ADVENTURE, CATEGORIES } from "../data/concepts";
import { LEVEL_COUNT } from "../data/levels";
import { BackButton } from "./BackButton";
import { useProfile } from "../stores/useProfile";
import { levelStars } from "../lib/progress";
import type { GameId, PlayCategory } from "../types";
import { cn } from "../lib/cn";

/**
 * Steg 1 i ordspelen: Äventyret (en stig genom alla kategorier) eller
 * fri träning i en kategori. Varje kategori har sin egen färgvärld.
 */
export function CategoryPicker({
  game,
  title,
  onPick,
  onBack,
}: {
  game: GameId;
  title: string;
  onPick: (category: PlayCategory) => void;
  onBack?: () => void; // om satt: gå tillbaka i spelet istället för till startsidan
}) {
  const stars = useProfile((s) => s.stars);
  const clearedIn = (cat: string) => {
    let n = 0;
    for (let l = 1; l <= LEVEL_COUNT; l++) if (levelStars(stars, game, cat, l) > 0) n++;
    return n;
  };
  const adv = clearedIn(ADVENTURE.id);

  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="mb-6 flex items-center gap-3">
        {onBack ? <BackButton onClick={onBack} /> : <BackButton to="/dashboard" />}
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      {/* Äventyret */}
      <motion.button
        onClick={() => onPick(ADVENTURE.id)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.96 }}
        className="relative mb-6 flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 p-5 text-left text-white shadow-xl"
      >
        <motion.span
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="text-5xl"
        >
          {ADVENTURE.emoji}
        </motion.span>
        <div className="flex-1">
          <div className="text-xl font-black">Äventyret</div>
          <div className="text-sm opacity-90">
            {LEVEL_COUNT} nivåer genom alla kategorier – blir svårare steg för steg
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/30">
            <div className="h-full rounded-full bg-white" style={{ width: `${(adv / LEVEL_COUNT) * 100}%` }} />
          </div>
        </div>
        <span className="text-sm font-bold">
          {adv}/{LEVEL_COUNT}
        </span>
      </motion.button>

      <p className="mb-3 font-semibold text-zinc-600 dark:text-zinc-400">Fri träning – välj kategori:</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CATEGORIES.map((c, i) => (
          <motion.button
            key={c.id}
            onClick={() => onPick(c.id)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * i, type: "spring", stiffness: 300, damping: 20 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.93 }}
            className={cn("flex flex-col items-center gap-1 rounded-3xl border-2 p-4 shadow-lg", c.tint)}
          >
            <span className="text-4xl">{c.emoji}</span>
            <span className="text-sm font-bold">{c.name}</span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {clearedIn(c.id)}/{LEVEL_COUNT}
            </span>
          </motion.button>
        ))}
      </div>
    </main>
  );
}
