import { motion } from "framer-motion";
import { GAMES } from "../data/gameRegistry";
import { CATEGORIES, categoryInfo } from "../data/concepts";
import { LANGUAGES } from "../data/languages";
import { LEVEL_COUNT } from "../data/levels";
import { BottomNav } from "../components/BottomNav";
import { useProfile } from "../stores/useProfile";
import { pathProgress, pathsFor } from "../lib/progress";
import { cn } from "../lib/cn";

const LANG_CODES = LANGUAGES.filter((l) => l.available).map((l) => l.code);
const CAT_IDS = CATEGORIES.map((c) => c.id);

/** Namn + emoji för en stig (kategori, äventyr, "all" eller trace-språk). */
function pathLabel(path: string): { name: string; emoji: string } {
  if (path === "all") return { name: "Alla nivåer", emoji: "🧭" };
  if (path.startsWith("trace-")) {
    const lang = LANGUAGES.find((l) => `trace-${l.code}` === path);
    return { name: lang?.name ?? path, emoji: "✏️" };
  }
  const info = categoryInfo(path);
  return { name: info?.name ?? path, emoji: info?.emoji ?? "⭐" };
}

/**
 * Min samling: varje spel med sina stigar. En stig visas som en rad med
 * 20 små prickar (en per nivå) + stjärnor – fylls i när barnet spelar.
 */
export default function Collection() {
  const stars = useProfile((s) => s.stars);

  let total = 0;
  let earned = 0;
  let trophies = 0;
  for (const game of GAMES)
    for (const path of pathsFor(game, CAT_IDS, LANG_CODES)) {
      const p = pathProgress(stars, game.id, path, LEVEL_COUNT);
      total += LEVEL_COUNT * 3;
      earned += p.stars;
      if (p.cleared === LEVEL_COUNT) trophies++;
    }

  return (
    <main className="mx-auto max-w-3xl p-6 pb-24">
      <h1 className="text-2xl font-bold">Min samling 🏆</h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        ⭐ {earned} av {total} stjärnor · 🏆 {trophies} hela stigar klara
      </p>

      <div className="mt-6 space-y-6">
        {GAMES.map((game, gi) => {
          const paths = pathsFor(game, CAT_IDS, LANG_CODES);
          return (
            <motion.section
              key={game.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.04 }}
              className="rounded-3xl bg-white p-4 shadow dark:bg-zinc-800"
            >
              <h2 className="mb-3 flex items-center gap-2 font-bold">
                <span className={cn("rounded-xl bg-gradient-to-br p-1.5 text-xl", game.gradient)}>{game.emoji}</span>
                {game.name}
              </h2>
              <div className="space-y-2">
                {paths.map((path) => {
                  const p = pathProgress(stars, game.id, path, LEVEL_COUNT);
                  const label = pathLabel(path);
                  const complete = p.cleared === LEVEL_COUNT;
                  return (
                    <div key={path} className="flex items-center gap-2 text-sm">
                      <span className="w-28 shrink-0 truncate font-medium text-zinc-600 dark:text-zinc-300">
                        {label.emoji} {label.name}
                      </span>
                      <div className="flex flex-1 gap-0.5" aria-label={`${p.cleared} av ${LEVEL_COUNT} nivåer`}>
                        {Array.from({ length: LEVEL_COUNT }).map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-3 flex-1 rounded-full",
                              i < p.cleared ? "bg-gradient-to-r from-amber-300 to-yellow-400" : "bg-zinc-200 dark:bg-zinc-700",
                              (i + 1) % 5 === 0 && "mr-1"
                            )}
                          />
                        ))}
                      </div>
                      <span className="w-14 shrink-0 text-right text-xs font-semibold text-zinc-500">
                        {complete ? "🏆" : `${p.cleared}/${LEVEL_COUNT}`}
                        {p.gold > 0 ? ` 🥇${p.gold}` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          );
        })}
      </div>

      <BottomNav />
    </main>
  );
}
