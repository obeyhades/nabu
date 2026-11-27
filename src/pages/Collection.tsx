import { motion } from "framer-motion";
import { Link } from "react-router-dom";
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
 * Hör till boken i menyn ("Boken" lyser här), med en länk tillbaka dit.
 * Stjärnorna här är stigarnas stjärnor – inte de i Stjärnpåsen.
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
    <main className="mx-auto max-w-3xl p-6 pb-nav lg:max-w-5xl">
      <h1 className="text-2xl font-bold">Min samling 🏆</h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        ⭐ <span dir="ltr">{earned}</span> av <span dir="ltr">{total}</span> stjärnor på stigarna · 🏆{" "}
        <span dir="ltr">{trophies}</span> hela stigar klara
      </p>
      <Link
        to="/stickers"
        className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 py-2 font-semibold text-rose-700 shadow outline-none transition active:scale-95 focus-visible:ring-4 focus-visible:ring-purple-400 dark:bg-zinc-800 dark:text-rose-300"
      >
        <span aria-hidden>📖</span> Till klistermärkesboken
      </Link>

      <div className="mt-6 space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
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
                    // Mobil: namnet på en egen rad, så att stapeln får hela bredden
                    <div key={path} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm md:text-base">
                      {/* Ikonen i en egen ruta: samma luft till namnet för alla emoji (även 🗺️ med variantväljare) */}
                      {/* md:w-32: 16 px text på surfplattan – "Kroppsdelar" står helt (aldrig "Kroppsdel…") */}
                      <span className="flex w-full min-w-0 items-center gap-1.5 font-medium text-zinc-600 sm:w-28 sm:shrink-0 md:w-32 dark:text-zinc-300">
                        <span aria-hidden className="shrink-0">
                          {label.emoji}
                        </span>
                        <span className="min-w-0 truncate">{label.name}</span>
                      </span>
                      <div className="flex min-w-0 flex-1 gap-0.5" aria-label={`${p.cleared} av ${LEVEL_COUNT} nivåer`}>
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
                      {/* "12/20 🥇2" på en rad: kolumnen växer hellre än att radbryta */}
                      <span
                        dir="ltr"
                        className="min-w-14 shrink-0 whitespace-nowrap text-right text-xs font-semibold text-zinc-500 md:min-w-20 md:text-sm"
                      >
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
