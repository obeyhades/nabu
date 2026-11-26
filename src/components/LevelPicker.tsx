import { useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { BANDS, LEVEL_COUNT, levelsInBand } from "../data/levels";
import { categoryInfo } from "../data/concepts";
import { BackButton } from "./BackButton";
import { useProfile } from "../stores/useProfile";
import { useSpeech } from "../hooks/useSpeech";
import { playWrong } from "../lib/sfx";
import { isLevelUnlocked, levelStars, goldLevelStars, nextLevel } from "../lib/progress";
import { cn } from "../lib/cn";
import type { GameId, Level } from "../types";

/**
 * Nivåstigen: 20 nivåer i fyra band (Nybörjare → Mästare). Nivåerna låses
 * upp i tur och ordning, nästa nivå att spela studsar, låsta skakar när man
 * trycker. 3 stjärnor ger ett guld-omspel av nivån.
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
  category: string; // kategori-id, "adventure" eller "all" för spel utan kategori
  subtitle?: string;
  onPick: (level: Level) => void;
  onPickGold?: (level: Level) => void;
  onBack: () => void;
}) {
  const stars = useProfile((s) => s.stars);
  const { speak } = useSpeech();
  const [shaking, setShaking] = useState<Level | null>(null);

  const cat = categoryInfo(category);
  const heading = subtitle ?? cat?.name ?? "";
  const headEmoji = cat?.emoji ?? "🧮";
  const next = nextLevel(stars, game, category, LEVEL_COUNT);
  let cleared = 0;
  let total = 0;
  for (let l = 1; l <= LEVEL_COUNT; l++) {
    const s = levelStars(stars, game, category, l);
    if (s > 0) cleared++;
    total += s;
  }

  const tapLocked = (lvl: Level) => {
    playWrong();
    setShaking(lvl);
    // Texten är svensk – läs den med svensk röst oavsett valt språk
    speak("Klara nivån innan!", "sv");
    window.setTimeout(() => setShaking(null), 500);
  };

  return (
    <main className="mx-auto max-w-3xl p-6 pb-12">
      <div className="mb-1 flex items-center gap-3">
        <BackButton onClick={onBack} />
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <span className={cn("rounded-xl border-2 px-2 py-1 text-xl", cat?.tint)}>{headEmoji}</span> {heading}
        </h1>
      </div>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        {cleared} / {LEVEL_COUNT} nivåer klara · ⭐ {total} / {LEVEL_COUNT * 3} på stigen
      </p>

      <div className="space-y-7">
        {BANDS.map((band) => {
          const bandLevels = levelsInBand(band.band);
          const bandOpen = isLevelUnlocked(stars, game, category, bandLevels[0].level);
          return (
            <section key={band.band}>
              <div
                className={cn(
                  "mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r px-4 py-2 text-white shadow",
                  band.gradient,
                  !bandOpen && "opacity-50 grayscale"
                )}
              >
                <span className="text-2xl">{band.icon}</span>
                <div className="leading-tight">
                  <div className="font-bold">{band.title}</div>
                  <div className="text-xs opacity-90">
                    {band.name} · {band.desc}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {bandLevels.map((lvl, i) => {
                  const unlocked = isLevelUnlocked(stars, game, category, lvl.level);
                  const s = levelStars(stars, game, category, lvl.level);
                  const gold = goldLevelStars(stars, game, category, lvl.level);
                  const isNext = lvl.level === next;

                  if (!unlocked) {
                    return (
                      <button
                        key={lvl.level}
                        onClick={() => tapLocked(lvl.level)}
                        aria-label={`Nivå ${lvl.level}, låst`}
                        className={cn(
                          "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed border-zinc-300 bg-white/40 dark:border-zinc-700 dark:bg-zinc-800/40",
                          shaking === lvl.level && "animate-shake"
                        )}
                      >
                        <span className="text-3xl opacity-30 grayscale">{lvl.icon}</span>
                        <span className="flex items-center gap-1 text-xs font-bold text-zinc-400">
                          <Lock size={12} /> {lvl.level}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <motion.div
                      key={lvl.level}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={isNext ? { opacity: 1, scale: 1, y: [0, -6, 0] } : { opacity: 1, scale: 1 }}
                      transition={
                        isNext
                          ? { y: { repeat: Infinity, duration: 1.2, ease: "easeInOut" }, delay: i * 0.04 }
                          : { delay: i * 0.04, type: "spring", stiffness: 300, damping: 20 }
                      }
                      className="relative"
                    >
                      <button
                        onClick={() => onPick(lvl.level)}
                        aria-label={`Nivå ${lvl.level}, ${s} stjärnor`}
                        className={cn(
                          "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-3xl border-2 bg-white shadow-lg transition hover:-translate-y-1 active:scale-95 dark:bg-zinc-800",
                          band.border,
                          isNext && "ring-4 ring-purple-400/60",
                          s > 0 && "bg-gradient-to-br text-white " + band.gradient
                        )}
                      >
                        <span className="text-3xl drop-shadow">{lvl.icon}</span>
                        <span className="text-sm font-black">{lvl.level}</span>
                        <span className="text-xs leading-none tracking-tighter">
                          {[1, 2, 3].map((n) => (
                            <span key={n} className={n <= s ? "" : "opacity-25 grayscale"}>
                              ⭐
                            </span>
                          ))}
                        </span>
                        {isNext && (
                          <span className="absolute -top-2 rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow">
                            Spela!
                          </span>
                        )}
                      </button>
                      {gold > 0 && (
                        <span className="absolute -right-1 -top-1 text-lg" title="Guld klarat!">
                          🥇
                        </span>
                      )}
                      {s >= 3 && onPickGold && (
                        <button
                          onClick={() => onPickGold(lvl.level)}
                          className="mt-1 w-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 py-0.5 text-[11px] font-bold text-white shadow active:scale-95"
                        >
                          🥇 Guld{gold > 0 ? ` ${"⭐".repeat(gold)}` : ""}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
