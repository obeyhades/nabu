import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StickerPageId } from "../../types";
import { cn } from "../../lib/cn";
import type { BookPage } from "../../data/stickers";

/**
 * Stora bläddringsknappar (72 px) i sidans nedre hörn: ‹ förra och › nästa i
 * indexets ordning. Boken speglas aldrig, så ‹ är alltid bakåt – även på arabiska.
 */
export function PageNav({
  prev,
  next,
  onTurn,
}: {
  prev: BookPage | null;
  next: BookPage | null;
  onTurn: (id: StickerPageId) => void;
}) {
  if (!prev && !next) return null;
  return (
    // Två knappar delar alltid på bredden (även 320 px): sidans namn avstavas hellre än att trycka ut nästa-knappen
    <nav aria-label="Bläddra i boken" dir="ltr" className="mt-6 flex items-start justify-between gap-3 px-1">
      {prev ? <TurnButton page={prev} forward={false} onTurn={onTurn} /> : <span />}
      {next ? <TurnButton page={next} forward onTurn={onTurn} /> : <span />}
    </nav>
  );
}

function TurnButton({ page, forward, onTurn }: { page: BookPage; forward: boolean; onTurn: (id: StickerPageId) => void }) {
  const Icon = forward ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      data-turn={forward ? "next" : "prev"}
      onClick={() => onTurn(page.id)}
      aria-label={`${forward ? "Nästa" : "Förra"} sida: ${page.title}`}
      className={cn(
        "group flex min-w-0 max-w-[calc(50%-6px)] items-center gap-2 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-purple-400",
        forward && "flex-row-reverse text-right"
      )}
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full min-[360px]:h-[72px] min-[360px]:w-[72px] bg-white text-purple-600 shadow-lg ring-1 ring-black/5 motion-safe:transition motion-safe:group-active:scale-90 dark:bg-zinc-800 dark:text-purple-300 dark:ring-white/10">
        <Icon size={40} strokeWidth={2.5} aria-hidden className="size-8 min-[360px]:size-10" />
      </span>
      <span aria-hidden lang="sv" className="word-fit max-w-[7.5rem] text-xs font-bold leading-tight text-zinc-600 dark:text-zinc-300 md:text-sm">
        <span className="block text-xl leading-none">{page.emoji}</span>
        {page.title}
      </span>
    </button>
  );
}
