import { Link } from "react-router-dom";
import type { Band, NestItem } from "../../types";
import { cn } from "../../lib/cn";
import { giftName, giftTag } from "../../lib/stickerBook";
import { BANDS } from "../../data/levels";
import type { BookPage } from "../../data/stickers";
import { BackButton } from "../BackButton";
import { GiftArt } from "./GiftArt";

/** En grupp prickar i remsan (en per hylla): bandet ger färgen, `filled` = inklistrat/tänt. */
export type StripGroup = { key: string; band?: Band; filled: boolean[] };

/**
 * Boksidans huvud: tillbaka till indexet, titel och emoji, "{klart} av {alla}",
 * prickremsan (som i Min samling – en prick per plats, grupperad per hylla) och
 * lappen med sidans gåva, som står där från första dagen.
 */
export function PageHeader({
  page,
  done,
  total,
  strip,
  gift,
  complete,
}: {
  page: BookPage;
  done: number;
  total: number;
  strip: StripGroup[];
  gift: NestItem | undefined;
  complete: boolean;
}) {
  const what = page.derived ? "spelmärken tända" : "inklistrade";
  return (
    <header>
      <div className="flex items-center gap-3">
        <BackButton to="/stickers" />
        <div className="min-w-0 flex-1">
          {/* tabIndex -1: sidan kan ta emot fokus efter en bläddring (annars hamnar det på <body>) */}
          <h1 tabIndex={-1} data-page-heading className="flex items-center gap-2 text-2xl font-black leading-tight outline-none">
            <span aria-hidden className="shrink-0">
              {page.emoji}
            </span>
            <span className="min-w-0 [overflow-wrap:anywhere]">{page.title}</span>
          </h1>
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            <span dir="ltr">
              {done} av {total}
            </span>{" "}
            {what}
          </p>
        </div>
      </div>

      <div role="img" aria-label={`${done} av ${total} ${what}`} className="mt-3 flex gap-2">
        {strip.map((g) => (
          <div key={g.key} className="flex gap-0.5" style={{ flex: g.filled.length }}>
            {g.filled.map((on, i) => (
              <span
                key={i}
                className={cn(
                  "h-3 flex-1 rounded-full",
                  on
                    ? cn("bg-gradient-to-r", g.band ? BANDS[g.band - 1].gradient : "from-amber-300 to-yellow-400")
                    : "bg-zinc-200 dark:bg-zinc-700"
                )}
              />
            ))}
          </div>
        ))}
      </div>

      {gift &&
        (complete ? (
          <Link
            to="/nest"
            className="mt-3 inline-flex min-h-12 max-w-full items-center gap-2 rounded-full bg-emerald-50 py-1.5 pl-3 pr-4 text-sm font-bold text-emerald-800 shadow-sm ring-1 ring-emerald-200 outline-none motion-safe:transition motion-safe:active:scale-95 focus-visible:ring-4 focus-visible:ring-purple-400 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/30"
          >
            <span aria-hidden>✓</span>
            <GiftArt item={gift} size={22} />
            <span className="min-w-0">
              {giftName(gift)} {gift.kind === "friend" ? "bor" : "finns"} i Nabus bo
            </span>
          </Link>
        ) : (
          <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-white/85 py-1.5 pl-3 pr-4 text-sm font-semibold shadow-sm ring-1 ring-black/5 dark:bg-zinc-800/85 dark:ring-white/10">
            <span className="shrink-0">Klar sida →</span>
            <GiftArt item={gift} size={22} />
            <span className="min-w-0">{giftTag(gift)}</span>
          </p>
        ))}
    </header>
  );
}
