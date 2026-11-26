import { useState } from "react";
import type { GameId, NestItem } from "../../types";
import { cn } from "../../lib/cn";
import { stickerVoice, type BadgeStatus } from "../../lib/stickerBook";
import { BANDS } from "../../data/levels";
import { ITEM_BY_ID, giftCondition } from "../../data/nestItems";
import { medallionKey } from "../../data/stickers";
import { useSpeech } from "../../hooks/useSpeech";
import { useNest } from "../../stores/useNest";
import { Sticker } from "../Sticker";
import { GiftArt } from "./GiftArt";

/**
 * Märkeshyllan: ett spelmärke per spel (i GAMES-ordning) på trähyllor.
 * Allt räknas fram ur stjärnorna – inget klistras in här. Märket lyser när
 * spelet har en avklarad nivå, och varje band som är klart på någon stig ger
 * en fjärdedel av ramen (🌱 🚀 🔥 👑). Ett tryck glänser och säger spelets namn.
 * Under hyllan står sidans två gåvor: Medaljen (alla 🌱) och Mästarkronan (alla 👑).
 */
export function BadgeShelf({ badges, onSay }: { badges: BadgeStatus[]; onSay?: (text: string) => void }) {
  const { speak } = useSpeech();
  const ownedItems = useNest((s) => s.owned);
  const [plays, setPlays] = useState<Partial<Record<GameId, number>>>({});

  const tap = (b: BadgeStatus) => {
    setPlays((p) => ({ ...p, [b.game.id]: (p[b.game.id] ?? 0) + 1 }));
    const v = stickerVoice(medallionKey(b.game.id), "sv");
    if (v) speak(v.text, v.lang);
    onSay?.(describe(b));
  };

  const withBand = (band: 1 | 4) => badges.filter((b) => b.bands.includes(band)).length;
  const gifts: { item: NestItem | undefined; done: number }[] = [
    { item: ITEM_BY_ID.get("neck-medal"), done: withBand(1) },
    { item: ITEM_BY_ID.get("hat-crown"), done: withBand(4) },
  ];

  return (
    <div>
      <h2 className="mb-1 px-1 text-sm font-black">
        <span aria-hidden className="text-lg">
          🏅{" "}
        </span>
        Spelmärken
      </h2>
      <p className="mb-3 px-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
        Klara ett band i ett spel så får märket en bit ram:{" "}
        {BANDS.map((b) => (
          <span key={b.band} aria-label={b.title} role="img" className="mx-0.5">
            {b.icon}
          </span>
        ))}
      </p>

      {/* Hyllplanen: cellerna ligger kant i kant så att planen blir hela rader */}
      <ul className="grid grid-cols-3 gap-y-4 sm:grid-cols-4 md:grid-cols-6">
        {badges.map((b) => (
          <li key={b.game.id} className="flex flex-col items-center border-b-[10px] border-amber-800/25 px-1 pb-2 dark:border-amber-200/15">
            <button
              type="button"
              onClick={() => tap(b)}
              aria-label={describe(b)}
              className="flex min-h-[104px] w-full flex-col items-center justify-end gap-1 rounded-2xl px-1 pt-1 outline-none motion-safe:transition motion-safe:active:scale-95 focus-visible:ring-4 focus-visible:ring-purple-400"
            >
              <Sticker
                id={medallionKey(b.game.id)}
                lit={b.lit}
                bands={b.bands}
                play={plays[b.game.id] ?? 0}
                decorative
                className="text-[3.25rem]"
              />
              <span className={cn("text-center text-xs font-bold leading-tight", !b.lit && "text-zinc-500 dark:text-zinc-400")}>
                {b.game.name}
              </span>
              <span aria-hidden className="flex gap-0.5 text-[11px] leading-none">
                {BANDS.map((band) => (
                  <span key={band.band} className={b.bands.includes(band.band) ? "" : "opacity-25 grayscale"}>
                    {band.icon}
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <ul className="mt-6 space-y-3">
        {gifts.map(({ item, done }) =>
          item ? (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900/60 dark:ring-white/10"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-amber-50 dark:bg-zinc-800">
                <GiftArt item={item} size={36} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{item.name}</span>
                <span className="block text-sm text-zinc-600 dark:text-zinc-300">{giftCondition(item)}</span>
              </span>
              {ownedItems[item.id] ? (
                <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
                  ✓ I boet
                </span>
              ) : (
                <span className="shrink-0 text-sm font-bold text-zinc-600 dark:text-zinc-300">
                  <span dir="ltr">
                    {done} av {badges.length}
                  </span>
                </span>
              )}
            </li>
          ) : null
        )}
      </ul>
    </div>
  );
}

/** "Spelmärke: Para ihop, ramar: Första stegen, På äventyr" / "… inte spelat än". */
function describe(b: BadgeStatus): string {
  if (!b.lit) return `Spelmärke: ${b.game.name}, inte spelat än`;
  const bands = b.bands.map((n) => BANDS[n - 1].title);
  return bands.length ? `Spelmärke: ${b.game.name}, ramar: ${bands.join(", ")}` : `Spelmärke: ${b.game.name}, tänt`;
}
