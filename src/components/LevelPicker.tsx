import { useState } from "react";
import { Lock } from "lucide-react";
import { LEVELS } from "../data/levels";
import { CATEGORIES } from "../data/concepts";
import { StarRating } from "./StarRating";
import { BackButton } from "./BackButton";
import { useProfile } from "../stores/useProfile";
import { useSpeech } from "../hooks/useSpeech";
import { playWrong } from "../lib/sfx";
import { isLevelUnlocked, levelStars, goldLevelStars } from "../lib/progress";
import { cn } from "../lib/cn";
import type { GameId, Level } from "../types";

/**
 * Steg 2: en rolig "stig" av namngivna nivåer. Låsta öppnas i tur och ordning
 * (låsta kort skakar + förklarar om man trycker). 3 stjärnor låser upp guld-läget.
 */
export function LevelPicker({
  game,
  category,
  subtitle,
  onPick,
  onPickGold,
  onBack,
}: {
  game: GameId;
  category: string; // Category-id för vanliga spel, "all" för matte/räkna
  subtitle?: string; // visas istället för kategorinamn (t.ex. "Matte")
  onPick: (level: Level) => void;
  onPickGold?: (level: Level) => void;
  onBack: () => void;
}) {
  const stars = useProfile((s) => s.stars);
  const { speak } = useSpeech();
  const [shaking, setShaking] = useState<Level | null>(null);

  const cat = CATEGORIES.find((c) => c.id === category);
  const heading = subtitle ?? cat?.name ?? "";
  const headEmoji = cat?.emoji ?? "🧮";
  const cleared = LEVELS.filter((l) => levelStars(stars, game, category, l.level) > 0).length;

  const tapLocked = (lvl: Level) => {
    playWrong();
    setShaking(lvl);
    // Texten är svensk – läs den med svensk röst oavsett valt språk
    speak("Klara nivån innan!", "sv");
    window.setTimeout(() => setShaking(null), 500);
  };

  return (
    <main className="mx-auto max-w-2xl p-6 pb-10">
      <div className="mb-1 flex items-center gap-3">
        <BackButton onClick={onBack} />
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <span className={cn("rounded-xl border-2 px-2 py-1 text-xl", cat?.tint)}>{headEmoji}</span>{" "}
          {heading}
        </h1>
      </div>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        {cleared} / {LEVELS.length} nivåer klara · välj en nivå
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {LEVELS.map((lvl) => {
          const unlocked = isLevelUnlocked(stars, game, category, lvl.level);
          const s = levelStars(stars, game, category, lvl.level);
          const gold = goldLevelStars(stars, game, category, lvl.level);
          const goldReady = s >= 3 && Boolean(onPickGold);

          if (!unlocked) {
            // Låst: visa nivåfärgen "genom dimman" + reagera på tryck
            return (
              <button
                key={lvl.level}
                onClick={() => tapLocked(lvl.level)}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-zinc-300 bg-white/40 p-4 text-center dark:border-zinc-700 dark:bg-zinc-800/40",
                  shaking === lvl.level && "animate-shake"
                )}
              >
                <span className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">
                  {lvl.level}
                </span>
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-4xl opacity-40 grayscale",
                    lvl.gradient
                  )}
                >
                  {lvl.icon}
                </div>
                <div>
                  <div className="font-bold leading-tight text-zinc-400">{lvl.title}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    {lvl.name}
                  </div>
                </div>
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-400">
                  <Lock size={14} /> Klara nivån innan
                </span>
              </button>
            );
          }

          return (
            <div
              key={lvl.level}
              role="button"
              tabIndex={0}
              onClick={() => onPick(lvl.level)}
              onKeyDown={(e) => e.key === "Enter" && onPick(lvl.level)}
              className={cn(
                "relative flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 bg-white p-4 text-center shadow-lg transition hover:-translate-y-1 active:scale-95 dark:bg-zinc-800",
                lvl.border
              )}
            >
              <span className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">
                {lvl.level}
              </span>
              {gold > 0 && (
                <span className="absolute right-2 top-2 text-lg" title="Guld klarat!">
                  🥇
                </span>
              )}

              <div
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-4xl shadow",
                  lvl.gradient
                )}
              >
                {lvl.icon}
              </div>

              <div>
                <div className="font-bold leading-tight">{lvl.title}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  {lvl.name}
                </div>
              </div>

              <StarRating value={s} size={16} />
              <span
                className={cn(
                  "mt-1 rounded-full bg-gradient-to-r px-5 py-1.5 text-sm font-bold text-white shadow",
                  lvl.gradient
                )}
              >
                Spela! ▶
              </span>

              {goldReady && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPickGold?.(lvl.level);
                  }}
                  className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-1 text-xs font-bold text-white shadow active:scale-95"
                >
                  🥇 Guld{gold > 0 ? ` ${"⭐".repeat(gold)}` : "!"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
