import { GAMES } from "../data/gameRegistry";
import { CATEGORIES } from "../data/concepts";
import { LEVELS } from "../data/levels";
import { StarRating } from "../components/StarRating";
import { BottomNav } from "../components/BottomNav";
import { useProfile } from "../stores/useProfile";
import { isLevelUnlocked, levelStars } from "../lib/progress";
import { cn } from "../lib/cn";
import type { GameId } from "../types";

export default function Collection() {
  const stars = useProfile((s) => s.stars);

  // Matte har ingen kategori ("all"), övriga spel har Djur/Mat/Siffror
  const catsFor = (game: GameId): string[] =>
    game === "math" ? ["all"] : CATEGORIES.map((c) => c.id);

  let total = 0;
  let earned = 0;
  for (const game of GAMES)
    for (const cat of catsFor(game.id))
      for (const lvl of LEVELS) {
        total += 3;
        earned += levelStars(stars, game.id, cat, lvl.level);
      }

  const levelRow = (game: GameId, cat: string) => (
    <div className="grid grid-cols-4 gap-2">
      {LEVELS.map((lvl) => {
        const s = levelStars(stars, game, cat, lvl.level);
        const unlocked = isLevelUnlocked(stars, game, cat, lvl.level);
        return (
          <div
            key={lvl.level}
            title={`Nivå ${lvl.level} – ${lvl.name}`}
            className={cn(
              "rounded-2xl p-2 text-center shadow-sm",
              s > 0 ? `bg-gradient-to-br ${lvl.gradient} text-white` : "bg-white dark:bg-zinc-800"
            )}
          >
            <div className="text-xs font-bold">{unlocked ? `Nivå ${lvl.level}` : "🔒"}</div>
            <div className="mt-1 flex justify-center">
              {unlocked ? (
                <StarRating value={s} size={12} />
              ) : (
                <span className="text-xs text-zinc-400">Låst</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <main className="mx-auto max-w-3xl p-6 pb-24">
      <h1 className="text-2xl font-bold">Min samling 🏆</h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        {earned} av {total} stjärnor
      </p>

      <div className="mt-6 space-y-8">
        {GAMES.map((game) => (
          <section key={game.id}>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <span className="text-2xl">{game.emoji}</span> {game.name}
            </h2>
            {game.id === "math" ? (
              levelRow("math", "all")
            ) : (
              <div className="space-y-4">
                {CATEGORIES.map((cat) => (
                  <div key={cat.id}>
                    <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                      <span>{cat.emoji}</span> {cat.name}
                    </div>
                    {levelRow(game.id, cat.id)}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
