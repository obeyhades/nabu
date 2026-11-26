import { Link } from "react-router-dom";
import { GAMES } from "../data/gameRegistry";
import { STICKER_IDS } from "../data/stickers";
import { GameCard } from "../components/GameCard";
import { MotivationCard } from "../components/MotivationCard";
import { BottomNav } from "../components/BottomNav";
import { Mascot } from "../components/Mascot";
import { StarPouch } from "../components/StarPouch";
import { balanceOf, trayIds } from "../lib/rewards";
import { useProfile } from "../stores/useProfile";
import { useStickers } from "../stores/useStickers";
import { useNest } from "../stores/useNest";
import { useSettings } from "../stores/useSettings";
import type { OwnedSticker, StickerId } from "../types";

/** Antal ordklistermärken barnet har (bara ord som finns i boken). */
function wordCount(owned: Record<StickerId, OwnedSticker>): number {
  let n = 0;
  for (const id in owned) if (id.startsWith("w:") && STICKER_IDS.has(id)) n++;
  return n;
}

// Gemensamt för de två ingångskorten: stora tryckytor, lugna (aldrig pulserande)
const ENTRY =
  "flex min-h-[72px] flex-col items-start gap-1 rounded-3xl p-4 text-left shadow outline-none transition active:scale-95 focus-visible:ring-4 focus-visible:ring-purple-400";

export default function Dashboard() {
  const name = useProfile((s) => s.name);
  const avatar = useProfile((s) => s.avatar);
  const words = useStickers((s) => wordCount(s.owned));
  const tray = useStickers((s) => trayIds(s.owned).length);
  const balance = useNest(balanceOf);
  const shopOn = useSettings((s) => s.shopOn);

  return (
    <main className="mx-auto max-w-3xl p-6 pb-24">
      <header className="flex items-center gap-3">
        <span className="text-4xl">{avatar}</span>
        <div>
          <h1 className="text-2xl font-bold">Hej {name || "Vän"}! 👋</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Vad vill du lära dig idag?</p>
        </div>
      </header>

      <div className="mt-6">
        <MotivationCard />
      </div>

      {/* Boken och boet: vad barnet redan har – inga löften om vad som kommer */}
      <section aria-label="Boken och boet" className="mt-4 grid grid-cols-2 gap-3">
        <Link
          to="/stickers"
          className={`${ENTRY} bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/50 dark:to-zinc-800`}
        >
          <span aria-hidden className="text-4xl leading-none">
            📖
          </span>
          <span className="font-bold leading-tight text-rose-700 dark:text-rose-300">
            Klister&shy;märkes&shy;boken
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            <span dir="ltr">{words}</span> ord
          </span>
          {tray > 0 && (
            <span className="mt-0.5 rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-bold text-white">
              <span dir="ltr">{tray}</span> att klistra in
            </span>
          )}
        </Link>

        <Link
          to="/nest"
          className={`${ENTRY} bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/50 dark:to-zinc-800`}
        >
          <Mascot mood="still" className="text-4xl" />
          <span className="font-bold leading-tight text-amber-800 dark:text-amber-300">Nabus bo</span>
          {shopOn && (
            <span className="inline-flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-300">
              <StarPouch className="text-lg" />
              <span>
                <span dir="ltr">{balance}</span> i påsen
              </span>
            </span>
          )}
        </Link>
      </section>

      {/* 2 kolumner även på mobil; udda sista kortet spänner hela bredden */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 [&>*:last-child:nth-child(odd)]:col-span-2">
        {GAMES.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </section>

      <BottomNav />
    </main>
  );
}
