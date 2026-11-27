import { motion } from "framer-motion";
import { ZoomIn } from "lucide-react";
import type { LangCode, Met, OwnedSticker, StickerId } from "../../types";
import { cn } from "../../lib/cn";
import { longestWord } from "../../lib/fit";
import { isBlank } from "../../lib/rewards";
import { STICKER_ALIGN, conceptOf, slotGlyph, stickerCaption, stickerSize, type ShelfView } from "../../lib/stickerBook";
import { stickerName, type BookShelf } from "../../data/stickers";
import { Sticker } from "../Sticker";

type Owned = Record<StickerId, OwnedSticker>;

/**
 * En hylla på en boksida: rubriken ("🌱 Första stegen") och platserna i ett rutnät.
 * En inklistrad plats visar märket (med Blank/Guldkant/Kluring) och ordet på
 * inlärningsspråket. En tom plats är en knapp med streckad kant, silhuetten och
 * ordet – att klistra in blir att matcha form och ord.
 * Raden tonas när ett av dess märken är upplyft. Affischer har fler kolumner,
 * och bara den arabiska bokstavsaffischen går höger-till-vänster. Affischens
 * bokstavshylla förklarar Kluring-ramen (den streckade lila kanten).
 * På telefon har hyllan ingen egen sidmarginal, så att platserna blir ≥ 72 px
 * även på 360 px breda skärmar (fyra kolumner).
 */

const KLURING = "Kluring: spåra den i repetitionsnivåerna 13–15";
/** Platsens ord: hela ordet på en rad (~0,6 em per tecken i fet stil + ett teckens marginal, som ordkorten). */
function captionFont(text: string): string {
  const n = Math.max(1, longestWord(text));
  return `min(var(--lbl), max(10px, calc(100cqi / ${((n + 1) * 0.6).toFixed(2)})))`;
}

export function StickerShelf({
  shelf,
  offset,
  owned,
  met,
  lang,
  poster = false,
  rtl = false,
  view,
  onSlot,
  onCard,
  onCardHold,
  onCardRelease,
  registerSpot,
}: {
  shelf: BookShelf;
  offset: number; // första platsens nummer på sidan (vågens fördröjning)
  owned: Owned;
  met: Record<string, Met>;
  lang: LangCode;
  poster?: boolean;
  rtl?: boolean;
  view: ShelfView;
  onSlot: (id: StickerId) => void;
  onCard: (id: StickerId) => void;
  /** 🔍-knappen har fokus/pekaren: den får inte försvinna under användaren. */
  onCardHold: () => void;
  onCardRelease: (id: StickerId) => void;
  registerSpot: (id: StickerId, el: HTMLElement | null) => void;
}) {
  const tinted = !!view.lifted && shelf.ids.includes(view.lifted);
  const headingId = `hylla-${shelf.ids[0]?.replace(/[^a-z0-9]/gi, "-")}`;
  const letters = poster && !!shelf.ids[0]?.startsWith("l:");
  // Fem platser med korta ord (siffror, räknetåget): fem i rad redan på telefonen. Fem med långa
  // ord (helikopter, vattenmelon): 3 + 2 centrerat på telefonen, annars avstavas ordet i den smala platsen.
  const longCaption = shelf.ids.some((id) => [...(stickerCaption(id, lang)?.text ?? "")].length > 6);
  // Minsta telefonerna (320 px): ett ord på tio bokstäver (sköldpadda, hamburgare) ryms inte i fyra kolumner
  const veryLong = shelf.ids.length > 4 && shelf.ids.some((id) => longestWord(stickerCaption(id, lang)?.text ?? "") >= 10);

  return (
    <section
      aria-labelledby={headingId}
      data-shelf
      className={cn(
        "rounded-2xl px-0 py-2 transition-colors duration-300 sm:p-2",
        tinted && "bg-amber-200/45 ring-2 ring-amber-400/70 dark:bg-amber-300/10 dark:ring-amber-300/40"
      )}
    >
      <h2 id={headingId} className="mb-2 flex items-center gap-2 px-1 text-sm font-black">
        <span aria-hidden className="text-lg">
          {shelf.icon}
        </span>
        {shelf.label}
      </h2>
      {letters && (
        <p className="-mt-1 mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 shrink-0 rounded-[3px] bg-white outline-dashed outline-2 outline-offset-1 outline-fuchsia-500"
          />
          {KLURING}
        </p>
      )}
      <div
        dir={rtl ? "rtl" : undefined}
        className={cn(
          "grid grid-cols-4 gap-3",
          // Räknetåget och Pärlbandet har fem platser per hylla: fem kolumner redan på telefonen
          // (tätare mellanrum) – aldrig 4 + 1 – och ingen tom sjätte på större skärmar
          poster
            ? "sm:grid-cols-6 md:grid-cols-8"
            : shelf.ids.length === 5
              ? longCaption
                ? "grid-cols-6 sm:grid-cols-5 [&>*]:col-span-2 sm:[&>*]:col-span-1 [&>*:nth-child(4)]:col-start-2 sm:[&>*:nth-child(4)]:col-start-auto"
                : "grid-cols-5 gap-2 sm:gap-3"
              : cn("sm:grid-cols-5 md:grid-cols-6", veryLong && "max-[359px]:grid-cols-3")
        )}
      >
        {shelf.ids.map((id, i) => (
          <Slot
            key={id}
            id={id}
            index={offset + i}
            o={owned[id]}
            m={met[conceptOf(id) ?? ""]}
            lang={lang}
            view={view}
            onSlot={onSlot}
            onCard={onCard}
            onCardHold={onCardHold}
            onCardRelease={onCardRelease}
            registerSpot={registerSpot}
          />
        ))}
      </div>
    </section>
  );
}

function Slot({
  id,
  index,
  o,
  m,
  lang,
  view,
  onSlot,
  onCard,
  onCardHold,
  onCardRelease,
  registerSpot,
}: {
  id: StickerId;
  index: number;
  o: OwnedSticker | undefined;
  m: Met | undefined;
  lang: LangCode;
  view: ShelfView;
  onSlot: (id: StickerId) => void;
  onCard: (id: StickerId) => void;
  onCardHold: () => void;
  onCardRelease: (id: StickerId) => void;
  registerSpot: (id: StickerId, el: HTMLElement | null) => void;
}) {
  const placed = o?.p === 1;
  const name = stickerName(id);
  const caption = stickerCaption(id, lang);
  const glyph = placed ? null : slotGlyph(id);
  const wiggleN = view.wiggle?.id === id ? view.wiggle.n : 0;
  const landedN = view.landed?.id === id ? view.landed.n : 0;
  const cascadeAt = view.cascade?.get(id);
  const hinted = view.hint === id;

  return (
    <div className="relative flex">
      <button
        type="button"
        onClick={() => onSlot(id)}
        aria-label={placed ? `Klistermärke: ${name}${o.tricky === 1 ? ", Kluring" : ""}` : `Tom plats: ${name}`}
        className={cn(
          // Kvadrat, men växer på höjden när ordet behöver två rader (alla platser i raden följer med)
          "@container relative flex aspect-square w-full scroll-mb-[calc(var(--nav-space)+var(--tray-h)+28px)] scroll-mt-24 flex-col items-center justify-center rounded-2xl px-0.5 py-1 transition-colors duration-300 focus-visible:ring-4 focus-visible:ring-purple-400",
          hinted ? "outline-dashed outline-4 outline-offset-2 outline-amber-400" : "outline-none",
          placed
            ? "active:bg-white/40 dark:active:bg-white/5"
            : cn(
                "border-2 border-dashed border-zinc-500 dark:border-zinc-400",
                view.lifted ? "bg-white/95 dark:bg-zinc-800/90" : "bg-white/60 dark:bg-zinc-900/40"
              )
        )}
      >
        {/* vågen (sidan klar) → vickningen (fel plats) → smacket (landning) → märket */}
        <span
          key={`w${view.wave}`}
          className={cn("flex w-full min-w-0 flex-col items-center", placed && view.wave > 0 && "animate-page-wave")}
          style={placed && view.wave > 0 ? { animationDelay: `${index * 40}ms` } : undefined}
        >
          <span key={`v${wiggleN}`} className={cn("flex w-full min-w-0 flex-col items-center", wiggleN > 0 && "animate-wiggle-soft")}>
            {/* Märkets ruta: 52 px, men aldrig bredare än platsen (fem i rad på 320 px) */}
            <span ref={(el) => registerSpot(id, el)} className={cn("grid h-[52px] w-full max-w-[52px] place-items-center", STICKER_ALIGN)}>
              {placed ? (
                <span className={cn("inline-block", view.flying === id && "invisible")}>
                  <motion.span
                    className="inline-block"
                    initial={cascadeAt !== undefined ? { opacity: 0, scale: 1.35, y: -14 } : false}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: (cascadeAt ?? 0) * 0.12, type: "spring", stiffness: 500, damping: 22 }}
                  >
                    <span key={`s${landedN}`} className={cn("inline-block", landedN > 0 && "animate-sticker-slap")}>
                      <Sticker
                        id={id}
                        parts={o.parts}
                        tricky={o.tricky === 1}
                        blank={isBlank(m)}
                        gold={!!m?.gold}
                        lang={lang}
                        play={view.plays[id] ?? 0}
                        decorative
                        className={stickerSize(id)}
                      />
                    </span>
                  </motion.span>
                </span>
              ) : glyph ? (
                <span
                  aria-hidden
                  lang={glyph.lang}
                  dir={glyph.dir}
                  className={cn(
                    "font-black leading-none text-zinc-500/50 dark:text-zinc-300/40",
                    [...glyph.text].length > 1 ? "text-[1.7rem]" : "text-[2rem]"
                  )}
                >
                  {glyph.text}
                </span>
              ) : (
                <Sticker id={id} state="ghost" lang={lang} className={stickerSize(id)} />
              )}
            </span>
            {caption && (
              <span
                aria-hidden
                lang={caption.lang}
                dir={caption.dir}
                // Ordet på en rad, så stort som platsen tillåter (högst 12 px, 14 px på surfplattan). Först
                // under 10 px får det dela sig på två rader (avstavning efter lang) – aldrig flöda över grannen.
                className="word-fit mt-0.5 line-clamp-2 max-w-full text-center font-bold leading-tight text-zinc-700 [--lbl:12px] dark:text-zinc-200 md:[--lbl:14px]"
                style={{ fontSize: captionFont(caption.text) }}
              >
                {caption.text}
              </span>
            )}
          </span>
        </span>
      </button>

      {view.card === id && placed && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          onClick={() => onCard(id)}
          onFocus={onCardHold}
          onBlur={() => onCardRelease(id)}
          onPointerEnter={onCardHold}
          onPointerLeave={(e) => {
            if (e.currentTarget !== document.activeElement) onCardRelease(id); // har den fokus väntar den på blur
          }}
          aria-label={`Visa ordkortet: ${name}`}
          className="absolute -right-3.5 -top-3.5 z-10 grid h-10 w-10 place-items-center rounded-full bg-purple-500 text-white shadow-lg ring-[3px] ring-white outline-none before:absolute before:-inset-1 before:content-[''] focus-visible:ring-purple-300 dark:ring-zinc-900"
        >
          <ZoomIn size={20} aria-hidden />
        </motion.button>
      )}
    </div>
  );
}
