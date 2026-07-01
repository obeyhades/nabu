import { LEVELS } from "../data/levels";
import { CATEGORIES } from "../data/concepts";
import { StarRating } from "./StarRating";
import { useProfile } from "../stores/useProfile";
import { isLevelUnlocked, levelStars } from "../lib/progress";
import { cn } from "../lib/cn";
import type { GameId, Level } from "../types";

/** Steg 2: en rolig "stig" av namngivna nivåer. Låsta öppnas i tur och ordning. */
export function LevelPicker({
  game,
  category,
  subtitle,
  onPick,
  onBack,
}: {
  game: GameId;
  category: string; // Category-id för vanliga spel, "all" för matte
  subtitle?: string; // visas istället för kategorinamn (t.ex. "Matte")
  onPick: (level: Level) => void;
  onBack: () => void;
}) {
  const stars = useProfile((s) => s.stars);
  const cat = CATEGORIES.find((c) => c.id === category);
  const heading = subtitle ?? cat?.name ?? "";
  const headEmoji = cat?.emoji ?? "🧮";
  const cleared = LEVELS.filter((l) => levelStars(stars, game, category, l.level) > 0).length;

  return (
    <main className="mx-auto max-w-2xl p-6 pb-10">
      <div className="mb-1 flex items-center gap-3">
        <button onClick={onBack} className="text-zinc-400" aria-label="Tillbaka">
          ←
        </button>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <span>{headEmoji}</span> {heading}
        </h1>
      </div>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        {cleared} / {LEVELS.length} nivåer klara · välj en nivå
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {LEVELS.map((lvl) => {
          const unlocked = isLevelUnlocked(stars, game, category, lvl.level);
          const s = levelStars(stars, game, category, lvl.level);
          return (
            <div
              key={lvl.level}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-3xl border-2 p-4 text-center",
                unlocked
                  ? `bg-white shadow-lg dark:bg-zinc-800 ${lvl.border}`
                  : "border-dashed border-zinc-300 bg-zinc-100/50 dark:border-zinc-700 dark:bg-zinc-800/40"
              )}
            >
              <span className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">
                {lvl.level}
              </span>

              <div
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-2xl text-4xl shadow",
                  unlocked ? `bg-gradient-to-br ${lvl.gradient}` : "bg-zinc-200 dark:bg-zinc-700"
                )}
              >
                {unlocked ? lvl.icon : "🔒"}
              </div>

              <div>
                <div className="font-bold leading-tight">{lvl.title}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  {lvl.name}
                </div>
              </div>

              {unlocked ? (
                <>
                  <StarRating value={s} size={16} />
                  <button
                    onClick={() => onPick(lvl.level)}
                    className={cn(
                      "mt-1 rounded-full bg-gradient-to-r px-5 py-1.5 text-sm font-bold text-white shadow active:scale-95",
                      lvl.gradient
                    )}
                  >
                    Spela! ▶
                  </button>
                </>
              ) : (
                <span className="mt-2 text-xs text-zinc-400">Klara nivån innan 🔒</span>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
