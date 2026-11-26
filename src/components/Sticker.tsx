import { memo, useEffect, useState, type ReactNode } from "react";
import type { Band, Category, GameDefinition, LangCode, Level, StickerId } from "../types";
import { cn } from "../lib/cn";
import { showsEmoji } from "../lib/emojiSupport";
import { BAND_HEX, numberOf, tiltOf } from "../lib/stickerArt";
import { ALPHABETS } from "../data/alphabets";
import { labelOf } from "../data/concepts";
import { GAMES } from "../data/gameRegistry";
import { getLanguage } from "../data/languages";
import { BANDS, LEVELS, bandOf } from "../data/levels";
import {
  WAGON_LABELS,
  countingMax,
  medallionKey,
  parseStickerId,
  stickerName,
  stickerTrick,
  type ParsedSticker,
  type StickerTrick,
} from "../data/stickers";
import { useSettings } from "../stores/useSettings";

/**
 * Ett klistermärke i boken. Ritar alla sorter: ord (emoji, WordBlob när
 * enheten saknar emojin, NumberBadge för sifferord), bokstav/siffra
 * (LetterTile), vagn (Wagon), pärla (Bead) och spelmärke (`s:<spel>`).
 *
 * Lägen: `placed` (inklistrat), `tray` (i kuvertet), `lifted` (upplyft för att
 * klistras in) och `ghost` (silhuett på en tom plats). Nivåer: `blank` (övat i
 * 3 spel – glans + ✨), `gold` (Guldkant) och för bokstäver `tricky` (Kluring-ram).
 *
 * Storlek: allt är i em – sätt textstorleken med `className` (t.ex. text-5xl).
 * `play`: öka talet för att spela märkets trick (hopp, åk, rulla …).
 * Bara statiska filter; animationer rör bara transform/opacity.
 */
type Props = {
  id: StickerId;
  state?: "placed" | "tray" | "lifted" | "ghost";
  parts?: 1 | 2 | 3; // bokstäver: 1 versal, 2 gemen, 3 båda ("Aa")
  tricky?: boolean;
  blank?: boolean;
  gold?: boolean;
  lit?: boolean; // spelmärken: tänt (minst en avklarad nivå)
  bands?: readonly Band[]; // spelmärken: banden med ram
  lang?: LangCode; // inlärningsspråket för ord (standard: inställningen)
  play?: number;
  decorative?: boolean; // aria-hidden när knappen runt om bär etiketten
  className?: string;
};

const TRICK_CLASS: Record<StickerTrick, string> = {
  hop: "animate-sticker-hop",
  drive: "animate-sticker-drive",
  roll: "animate-sticker-roll",
  wobble: "animate-sticker-wobble",
  wiggle: "animate-sticker-wiggle",
  bounce: "animate-item-bounce",
  flip: "animate-sticker-flip",
  chug: "animate-sticker-chug",
  spin: "animate-sticker-spin",
  sheen: "", // glansen ritas som ett eget lager
};

// Ljusa toner – ett klistermärke ser likadant ut i ljust och mörkt läge
const BLOB_TINT: Record<Category, string> = {
  animals: "bg-amber-100 border-amber-300",
  food: "bg-rose-100 border-rose-300",
  fruit: "bg-pink-100 border-pink-300",
  vegetables: "bg-green-100 border-green-300",
  vehicles: "bg-sky-100 border-sky-300",
  body: "bg-orange-100 border-orange-300",
  numbers: "bg-indigo-100 border-indigo-300",
  blandad: "bg-violet-100 border-violet-300",
};

const bandGradient = (level: Level) => BANDS[bandOf(level) - 1].gradient;

// ── Märkenas ansikten (kan också användas var för sig) ──────────────────

/** Ordet som en tonad klick – när enheten inte kan rita emojin (TOFU_RISK). */
export function WordBlob({ word, category, lang }: { word: string; category: Category; lang: LangCode }) {
  return (
    <span
      className={cn(
        "grid h-[1.05em] w-[1.05em] place-items-center overflow-hidden border-[0.04em] px-[0.08em] text-center",
        BLOB_TINT[category]
      )}
      style={{ borderRadius: "46% 54% 52% 48% / 55% 45% 55% 45%" }}
    >
      <span
        lang={lang}
        dir={getLanguage(lang).dir}
        className="text-[0.22em] font-extrabold leading-tight text-zinc-800 [overflow-wrap:anywhere]"
      >
        {word}
      </span>
    </span>
  );
}

/** Sifferord: siffran stort och ordet under (aldrig keycap-emoji). */
export function NumberBadge({ n, word, lang }: { n: number; word: string; lang: LangCode }) {
  return (
    <span className="grid h-[1.05em] w-[1.05em] grid-rows-[1fr_auto] place-items-center rounded-[0.24em] bg-gradient-to-br from-indigo-400 to-violet-500 pb-[0.07em] text-white">
      <span dir="ltr" className="self-end text-[0.56em] font-black leading-none">
        {n}
      </span>
      <span
        lang={lang}
        dir={getLanguage(lang).dir}
        className="max-w-full text-center text-[0.15em] font-bold leading-tight [overflow-wrap:anywhere]"
      >
        {word}
      </span>
    </span>
  );
}

/** Bokstav eller siffra på en bricka. `tricky` = Kluring-ramen (repetitionsnivåerna 13–15). */
export function LetterTile({
  text,
  lang,
  tricky = false,
  digit = false,
}: {
  text: string;
  lang: LangCode;
  tricky?: boolean;
  digit?: boolean;
}) {
  return (
    <span
      className={cn(
        "grid h-[1.05em] w-[1.05em] place-items-center rounded-[0.2em] border-[0.05em]",
        digit ? "border-sky-200 bg-sky-50 text-sky-700" : "border-violet-200 bg-white text-violet-700",
        tricky && "outline-dashed outline-[0.07em] outline-offset-[0.03em] outline-fuchsia-500"
      )}
    >
      <span
        lang={lang}
        dir={digit ? "ltr" : getLanguage(lang).dir}
        className={cn("font-black leading-none", [...text].length > 1 ? "text-[0.5em]" : "text-[0.66em]")}
      >
        {text}
      </span>
    </span>
  );
}

/** En vagn på Räknetåget: nivåns ikon och räknesättet. */
export function Wagon({ level }: { level: Level }) {
  return (
    <span className="relative grid h-[1.05em] w-[1.15em] grid-rows-[1fr_auto]">
      <span
        className={cn(
          "mx-[0.03em] grid place-items-center content-center rounded-[0.14em] bg-gradient-to-br py-[0.04em] text-white",
          bandGradient(level)
        )}
      >
        <span className="text-[0.4em] leading-none">{LEVELS[level - 1]?.icon}</span>
        <span dir="ltr" className="whitespace-nowrap text-[0.14em] font-black leading-tight">
          {WAGON_LABELS[level - 1]}
        </span>
      </span>
      {/* kopplingar och hjul */}
      <span className="absolute bottom-[0.34em] left-0 h-[0.05em] w-[0.06em] rounded-full bg-zinc-600" />
      <span className="absolute bottom-[0.34em] right-0 h-[0.05em] w-[0.06em] rounded-full bg-zinc-600" />
      <span className="-mt-[0.08em] flex justify-between px-[0.18em]">
        <span className="h-[0.2em] w-[0.2em] rounded-full border-[0.04em] border-zinc-400 bg-zinc-700" />
        <span className="h-[0.2em] w-[0.2em] rounded-full border-[0.04em] border-zinc-400 bg-zinc-700" />
      </span>
    </span>
  );
}

/** En pärla på Pärlbandet: bandets färg, nivåns ikon och "till {hi}". */
export function Bead({ level }: { level: Level }) {
  return (
    <span className="grid h-[1.1em] w-[1.05em] grid-rows-[1fr_auto] place-items-center">
      <span
        className={cn(
          "relative grid h-[0.8em] w-[0.8em] place-items-center rounded-full bg-gradient-to-br shadow-[inset_-0.04em_-0.06em_0.1em_rgb(0_0_0/0.25)]",
          bandGradient(level)
        )}
      >
        <span className="absolute left-[18%] top-[14%] h-[0.12em] w-[0.18em] rounded-full bg-white/60" />
        <span className="text-[0.4em] leading-none">{LEVELS[level - 1]?.icon}</span>
      </span>
      <span className="whitespace-nowrap rounded-full bg-white px-[0.4em] text-[0.15em] font-bold leading-snug text-zinc-700">
        till <span dir="ltr">{countingMax(level)}</span>
      </span>
    </span>
  );
}

/** Spelmärke på Märkeshyllan: tänt eller släckt, med en ramfjärdedel per klart band. */
function Medallion({ game, lit, bands }: { game: GameDefinition; lit: boolean; bands: readonly Band[] }) {
  return (
    <span className="relative grid h-[1.05em] w-[1.05em] place-items-center">
      <span
        className={cn(
          "grid h-[0.8em] w-[0.8em] place-items-center rounded-full",
          lit ? cn("bg-gradient-to-br", game.gradient) : "bg-zinc-200"
        )}
      >
        <span className={cn("text-[0.46em] leading-none", !lit && "opacity-40 grayscale")}>{game.emoji}</span>
      </span>
      <svg viewBox="0 0 100 100" aria-hidden focusable="false" className="absolute inset-0 h-full w-full -rotate-90">
        {([1, 2, 3, 4] as const).map((b, k) => {
          const on = lit && bands.includes(b);
          return (
            <circle
              key={b}
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="20 80"
              strokeDashoffset={-(k * 25 + 2.5)}
              stroke={on ? BAND_HEX[b][0] : undefined}
              className={on ? undefined : "stroke-zinc-300"}
            />
          );
        })}
      </svg>
    </span>
  );
}

/** Tecknet på en bokstavsbricka: "A", "a" eller "Aa" (arabiska har en form). Vänd = andra formen. */
function letterText(lang: LangCode, index: number, parts: 1 | 2 | 3 | undefined, flipped: boolean): string {
  const a = ALPHABETS[lang];
  const up = a.upper[index];
  const low = a.lower?.[index];
  if (!low) return up;
  if (flipped) return parts === 2 ? up : low;
  return parts === 2 ? low : parts === 3 ? `${up}${low}` : up;
}

function faceFor(
  p: ParsedSticker,
  o: { learn: LangCode; parts?: 1 | 2 | 3; tricky: boolean; flipped: boolean }
): ReactNode {
  switch (p.family) {
    case "word": {
      const c = p.concept;
      const n = c.category === "numbers" ? numberOf(c.id) : null;
      if (n !== null) return <NumberBadge n={n} word={labelOf(c, o.learn)} lang={o.learn} />;
      if (!showsEmoji(c.emoji)) return <WordBlob word={labelOf(c, o.learn)} category={c.category} lang={o.learn} />;
      return <span className="leading-none">{c.emoji}</span>;
    }
    case "letter":
      return <LetterTile text={letterText(p.lang, p.index, o.parts, o.flipped)} lang={p.lang} tricky={o.tricky} />;
    case "digit":
      return <LetterTile text={ALPHABETS[p.lang].digits[p.digit]} lang={p.lang} digit />;
    case "wagon":
      return <Wagon level={p.level} />;
    case "bead":
      return <Bead level={p.level} />;
  }
}

function StickerView({
  id,
  state = "placed",
  parts,
  tricky = false,
  blank = false,
  gold = false,
  lit = true,
  bands,
  lang,
  play = 0,
  decorative = false,
  className,
}: Props) {
  const uiLang = useSettings((s) => s.lang);
  const parsed = parseStickerId(id);
  const game = parsed ? undefined : GAMES.find((g) => medallionKey(g.id) === id);
  const isLetter = parsed?.family === "letter";

  // Bokstäver vänds och visar andra formen i en sekund, sedan tillbaka
  const [flipped, setFlipped] = useState(false);
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    if (!play || !isLetter) return;
    const timers = [
      window.setTimeout(() => setFlipped(true), 200), // mitt i vändningen
      window.setTimeout(() => setTurn((t) => t + 1), 1000), // vänd tillbaka …
      window.setTimeout(() => setFlipped(false), 1200), // … och byt tecken mitt i
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [play, isLetter]);

  // Okända id (t.ex. ett borttaget ord som redan var inklistrat) döljs
  if (!parsed && !game) return null;

  const ghost = state === "ghost";
  const lifted = state === "lifted";
  const trick = play > 0 && !ghost ? stickerTrick(id) : null;
  const face = game ? (
    <Medallion game={game} lit={lit} bands={bands ?? []} />
  ) : (
    faceFor(parsed!, { learn: lang ?? uiLang, parts, tricky, flipped })
  );
  const hidden = decorative || ghost;
  const shiny = blank && !ghost;

  return (
    <span
      role={hidden ? undefined : "img"}
      aria-label={hidden ? undefined : game ? `Spelmärke: ${game.name}` : `Klistermärke: ${stickerName(id)}`}
      aria-hidden={hidden || undefined}
      className={cn("relative inline-block select-none align-middle leading-none", className)}
    >
      {lifted && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-full h-[0.16em] w-[0.8em] -translate-x-1/2 -translate-y-[0.1em] rounded-full bg-black/25 blur-[3px]"
        />
      )}
      {/* lutningen (fast per id) och lyftet ligger på var sitt omslag */}
      <span
        className={cn(
          "inline-block motion-safe:transition-transform motion-safe:duration-150",
          lifted && "-translate-y-[0.08em] scale-110 will-change-transform"
        )}
        style={ghost ? undefined : { rotate: `${tiltOf(id)}deg` }}
      >
        <span key={`${play}:${turn}`} className={cn("inline-block", trick && TRICK_CLASS[trick])}>
          <span
            className={cn(
              "relative inline-grid h-[1.15em] w-[1.15em] place-items-center",
              ghost ? "sticker-ghost" : "sticker",
              gold && !ghost && "sticker--gold"
            )}
          >
            {face}
            {(shiny || trick === "sheen") && (
              <span aria-hidden className="sticker-shine animate-sheen">
                {face}
              </span>
            )}
            {shiny && (
              <span aria-hidden className="absolute -right-[0.08em] -top-[0.1em] text-[0.34em] leading-none">
                ✨
              </span>
            )}
          </span>
        </span>
      </span>
    </span>
  );
}

export const Sticker = memo(StickerView);
