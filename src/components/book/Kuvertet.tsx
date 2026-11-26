import type { LangCode, OwnedSticker, StickerId } from "../../types";
import { cn } from "../../lib/cn";
import { STICKER_ALIGN, stickerCaption, stickerSize } from "../../lib/stickerBook";
import { PAGE_BY_ID, PAGE_OF_STICKER, stickerName } from "../../data/stickers";
import { Sticker } from "../Sticker";

type Owned = Record<StickerId, OwnedSticker>;

/**
 * Kuvertet: väntande klistermärken längst ner på boksidan, precis ovanför menyn.
 * Den här sidans märken kommer först, sedan en lapp "{n} till andra sidor →"
 * och de andra sidornas märken (ett tryck på dem bläddrar dit, redan upplyfta).
 * Fast höjd, egen vågrät scroll och alltid vänster-till-höger.
 */
export function Kuvertet({
  here,
  others,
  owned,
  lang,
  lifted,
  canPlaceAll,
  onPick,
  onOthers,
  onPlaceAll,
  register,
}: {
  here: StickerId[];
  others: StickerId[];
  owned: Owned;
  lang: LangCode;
  lifted: StickerId | null;
  canPlaceAll: boolean;
  onPick: (id: StickerId) => void;
  onOthers: () => void;
  onPlaceAll: () => void;
  register: (id: StickerId, el: HTMLElement | null) => void;
}) {
  const total = here.length + others.length;
  if (!total) return null;

  return (
    <div
      role="region"
      aria-label={`Kuvertet, ${total} ${total === 1 ? "klistermärke" : "klistermärken"}`}
      dir="ltr"
      className="fixed inset-x-0 bottom-[68px] z-30 h-[104px] border-t border-amber-200 bg-amber-50 shadow-[0_-6px_16px_rgb(0_0_0/0.06)] dark:border-zinc-700 dark:bg-zinc-900"
    >
      {/* kuvertets flik (bara pynt) */}
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 h-3 w-28 -translate-x-1/2 bg-amber-200 [clip-path:polygon(0_100%,50%_0,100%_100%)] dark:bg-zinc-700"
      />
      <div className="mx-auto flex h-full max-w-3xl items-center gap-3 overflow-x-auto overscroll-x-contain px-3 [scrollbar-width:none]">
        {canPlaceAll && (
          <button
            type="button"
            data-place-all
            onClick={onPlaceAll}
            aria-label={`Sätt in alla ${here.length} på den här sidan`}
            className="flex h-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-500 px-3 text-sm font-bold leading-tight text-white shadow outline-none motion-safe:transition motion-safe:active:scale-95 focus-visible:ring-4 focus-visible:ring-purple-400"
          >
            <span aria-hidden className="text-xl leading-none">
              📥
            </span>
            Sätt in alla
          </button>
        )}
        {here.map((id) => (
          <TrayItem
            key={id}
            id={id}
            o={owned[id]}
            lang={lang}
            lifted={lifted === id}
            onPick={onPick}
            register={register}
          />
        ))}
        {others.length > 0 && (
          <button
            type="button"
            onClick={onOthers}
            className="flex h-20 shrink-0 items-center rounded-2xl border-2 border-dashed border-zinc-400 px-3 text-left text-sm font-bold leading-tight text-zinc-700 outline-none motion-safe:transition motion-safe:active:scale-95 focus-visible:ring-4 focus-visible:ring-purple-400 dark:border-zinc-500 dark:text-zinc-200"
          >
            <span>
              <span dir="ltr">{others.length}</span> till andra
              <br />
              sidor →
            </span>
          </button>
        )}
        {others.map((id) => (
          <TrayItem key={id} id={id} o={owned[id]} lang={lang} lifted={false} away onPick={onPick} register={register} />
        ))}
      </div>
    </div>
  );
}

/** Ett märke i kuvertet. Ett märke från en annan sida visar den sidans emoji i hörnet. */
function TrayItem({
  id,
  o,
  lang,
  lifted,
  away = false,
  onPick,
  register,
}: {
  id: StickerId;
  o: OwnedSticker | undefined;
  lang: LangCode;
  lifted: boolean;
  away?: boolean;
  onPick: (id: StickerId) => void;
  register: (id: StickerId, el: HTMLElement | null) => void;
}) {
  const caption = stickerCaption(id, lang);
  const pageId = PAGE_OF_STICKER.get(id);
  const pageEmoji = away && pageId ? PAGE_BY_ID.get(pageId)?.emoji : null;
  return (
    <button
      ref={(el) => register(id, el)}
      type="button"
      aria-pressed={away ? undefined : lifted}
      aria-label={`Sätt in ${stickerName(id)}`}
      onClick={() => onPick(id)}
      className={cn(
        "relative flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl shadow-sm ring-1 outline-none transition-colors focus-visible:ring-4 focus-visible:ring-purple-400",
        STICKER_ALIGN,
        lifted
          ? "bg-amber-100 ring-4 ring-amber-400 dark:bg-amber-400/20 dark:ring-amber-300"
          : away
            ? "bg-white/70 ring-amber-200 dark:bg-zinc-800/60 dark:ring-zinc-700"
            : "bg-white ring-amber-200 dark:bg-zinc-800 dark:ring-zinc-700"
      )}
    >
      <Sticker
        id={id}
        state={lifted ? "lifted" : "tray"}
        parts={o?.parts}
        tricky={o?.tricky === 1}
        lang={lang}
        decorative
        className={cn(stickerSize(id), caption && "-mt-1")}
      />
      {caption && (
        <span
          aria-hidden
          lang={caption.lang}
          dir={caption.dir}
          className="max-w-[74px] truncate text-[11px] font-bold leading-tight text-zinc-700 dark:text-zinc-200"
        >
          {caption.text}
        </span>
      )}
      {pageEmoji && (
        <span
          aria-hidden
          className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white text-sm shadow ring-1 ring-black/5 dark:bg-zinc-700"
        >
          {pageEmoji}
        </span>
      )}
    </button>
  );
}

/** Ett litet kuvert med upp till tre märken som sticker upp (bokens index). Dekorativt. */
export function EnvelopeArt({ ids, owned }: { ids: StickerId[]; owned: Owned }) {
  return (
    <span aria-hidden className={cn("relative block h-14 w-[72px] shrink-0", STICKER_ALIGN)}>
      <span className="absolute inset-x-0 bottom-0 h-10 rounded-lg bg-amber-300 dark:bg-amber-500/70" />
      {ids.slice(0, 3).map((id, i) => (
        <span key={id} className="absolute bottom-4 text-[1.6rem]" style={{ left: 2 + i * 20, rotate: `${(i - 1) * 12}deg` }}>
          <Sticker id={id} parts={owned[id]?.parts} tricky={owned[id]?.tricky === 1} decorative />
        </span>
      ))}
      <span className="absolute inset-x-0 bottom-0 h-8 rounded-b-lg bg-amber-200 [clip-path:polygon(0_0,50%_55%,100%_0,100%_100%,0_100%)] dark:bg-amber-400/80" />
    </span>
  );
}
