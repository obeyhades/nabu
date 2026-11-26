import { useEffect, useState, type ReactNode } from "react";
import { MotionConfig, motion } from "framer-motion";
import type { LangCode, Reveal, StickerId } from "../types";
import { cn } from "../lib/cn";
import { playPeel } from "../lib/sfx";
import { parseLessonKey } from "../lib/progress";
import { showsEmoji } from "../lib/emojiSupport";
import { numberOf, tiltOf } from "../lib/stickerArt";
import { ALPHABETS } from "../data/alphabets";
import { labelOf } from "../data/concepts";
import { GAMES } from "../data/gameRegistry";
import { LANGUAGES, getLanguage } from "../data/languages";
import { BANDS } from "../data/levels";
import { ITEM_BY_ID } from "../data/nestItems";
import { parseStickerId, stickerName } from "../data/stickers";
import { hasRevealContent, useRewards } from "../stores/useRewards";
import { useSettings } from "../stores/useSettings";
import { useStickers } from "../stores/useStickers";
import { useSpeech } from "../hooks/useSpeech";
import { NumberBadge, Sticker, WordBlob } from "./Sticker";
import { StarPouch } from "./StarPouch";

/**
 * Belöningsremsan på vinstskärmen (§7.6). Läser `useRewards.last`, som
 * useLesson.finish() alltid skriver innan vinstskärmen visas.
 *
 * Ett av fem lägen: välj ord (2–3 kort), ett nytt klistermärke, ett regn av
 * bokstäver/siffror/vagn/pärla, "alla ord finns redan" eller bara påsen.
 * Etik: inget lovas i förväg, inget pulserar, inget tjatar om boet.
 *
 * Layout: rutan har sin slutliga höjd direkt (innehållet finns i DOM:en från
 * start, bara osynligt) och tonar in efter 0,9 s – efter stjärnorna. Knapparna
 * under blockeras aldrig. Högst ca 124 px hög, alltid dir="ltr".
 */

const REVEAL_DELAY_MS = 900; // efter playLevelUp och stjärnornas pop
const MAX_RAIN = 7;
const PEEL_SPRING = { type: "spring", stiffness: 260, damping: 18 } as const;

type Chip = { key: string; text: ReactNode; say: string; tone: "gift" | "badge" | "upgrade" | "more" };

const CHIP_TONE: Record<Chip["tone"], string> = {
  gift: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200",
  badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200",
  upgrade: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  more: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200",
};

const STAR_WORDS = ["", "En stjärna", "Två stjärnor", "Tre stjärnor"];

/** "En stjärna till påsen." – talen 1–3 i ord (en lektion ger högst 3). */
function pouchSay(n: number): string {
  return `${STAR_WORDS[n] ?? `${n} stjärnor`} till påsen.`;
}

/** "A, B och C" (eller "A, B eller C" för val) */
function listSv(xs: string[], and = "och"): string {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} ${and} ${xs[xs.length - 1]}`;
}

/** Stor bokstav först i en uppläst mening ("katt blev blank!" → "Katt blev blank!"). */
const sentence = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Språket orden visas på: spårspråket för Spåra, annars inlärningsspråket. */
function lessonLang(key: string, fallback: LangCode): LangCode {
  const k = parseLessonKey(key);
  if (k?.game !== "trace") return fallback;
  const code = k.category.slice("trace-".length);
  return LANGUAGES.find((l) => l.code === code)?.code ?? fallback;
}

/** Bokstaven i en bokstavs-id (versal, och gemen om språket har en). */
function letterOf(id: StickerId): { up: string; low: string | null } | null {
  const p = parseStickerId(id);
  if (p?.family !== "letter") return null;
  const a = ALPHABETS[p.lang];
  return { up: a.upper[p.index], low: a.lower?.[p.index] ?? null };
}

/** Chipsen i prioritetsordning: gåvor > spelmärken > uppgraderingar. */
function chipsFor(r: Reveal): Chip[] {
  const out: Chip[] = [];
  for (const id of r.gifts) {
    const item = ITEM_BY_ID.get(id);
    if (item) out.push({ key: `g:${id}`, tone: "gift", text: `🎁 ${item.name} flyttar in i boet`, say: `${item.name} flyttar in i boet.` });
  }
  for (const b of r.badges) {
    const game = GAMES.find((g) => g.id === b.game);
    if (!game) continue;
    out.push(
      b.band === 0
        ? { key: `b:${b.game}:0`, tone: "badge", text: `Nytt spelmärke: ${game.emoji} ${game.name}`, say: `Nytt spelmärke: ${game.name}.` }
        : {
            key: `b:${b.game}:${b.band}`,
            tone: "badge",
            text: `${game.emoji} fick en ${BANDS[b.band - 1].icon}-ram!`,
            say: `Spelmärket ${game.name} fick en ny ram!`,
          }
    );
  }
  for (const u of r.upgrades) {
    const key = `u:${u.s}:${u.kind}`;
    if (u.kind === "blank" || u.kind === "gold") {
      const name = stickerName(u.s);
      if (!name) continue;
      out.push(
        u.kind === "blank"
          ? { key, tone: "upgrade", text: `✨ ${name} blev blank!`, say: `${name} blev blank!` }
          : { key, tone: "upgrade", text: `🥇 ${name} fick guldkant!`, say: `${name} fick guldkant!` }
      );
      continue;
    }
    const l = letterOf(u.s);
    if (!l) continue;
    if (u.kind === "lower" && l.low)
      out.push({
        key,
        tone: "upgrade",
        text: `${l.up}${l.low} – nu kan du både stor och liten bokstav!`,
        say: `${l.up} och ${l.low} – nu kan du både stor och liten bokstav!`,
      });
    if (u.kind === "tricky") out.push({ key, tone: "upgrade", text: `Kluring-ram på ${l.up}!`, say: `Kluring-ram på ${l.up}!` });
  }
  return out;
}

/** Högst `max` chips; finns fler blir den sista platsen "+N till i boken". */
function fitChips(chips: Chip[], max: number): Chip[] {
  if (chips.length <= max) return chips;
  const shown = chips.slice(0, Math.max(0, max - 1));
  const rest = chips.length - shown.length;
  return [...shown, { key: "more", tone: "more", text: `+${rest} till i boken`, say: "" }];
}

// ── Små delar ───────────────────────────────────────────────────────────

/** "[påse] +2 i påsen" – påsen ritas alltid som påsen, aldrig som ett ensamt ⭐. */
function PouchChip({ n, big = false }: { n: number; big?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-amber-100 font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
        big ? "px-4 py-1.5 text-lg" : "px-2.5 py-0.5 text-xs"
      )}
    >
      <StarPouch className={big ? "text-2xl" : "text-base"} />
      <span dir="ltr">+{n}</span> i påsen
    </span>
  );
}

/** Påsen på högkant bredvid ordkorten (valraden har ingen plats för en rad till). */
function PouchTag({ n }: { n: number }) {
  return (
    <span className="flex h-20 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-amber-100 font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
      <StarPouch className="text-2xl" />
      <span dir="ltr" className="text-sm font-black leading-tight">
        +{n}
      </span>
      <span className="text-[10px] leading-tight">i påsen</span>
    </span>
  );
}

function Chips({ chips }: { chips: Chip[] }) {
  if (!chips.length) return null;
  return (
    <>
      {chips.map((c) => (
        <span
          key={c.key}
          className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight", CHIP_TONE[c.tone])}
        >
          {c.text}
        </span>
      ))}
    </>
  );
}

/** Ordets ansikte: emoji, sifferbricka eller WordBlob (när enheten saknar emojin). */
function WordFace({ id, lang }: { id: StickerId; lang: LangCode }) {
  const p = parseStickerId(id);
  if (p?.family !== "word") return null;
  const c = p.concept;
  const n = numberOf(c.id);
  const word = labelOf(c, lang);
  return (
    <span aria-hidden className="sticker h-[1.15em] w-[1.15em]">
      {n !== null ? (
        <NumberBadge n={n} word={word} lang={lang} />
      ) : showsEmoji(c.emoji) ? (
        <span className="leading-none">{c.emoji}</span>
      ) : (
        <WordBlob word={word} category={c.category} lang={lang} />
      )}
    </span>
  );
}

/** Ordet på inlärningsspråket (rätt `lang`/`dir` – bara ordet får vara RTL). */
function WordText({ id, lang, className }: { id: StickerId; lang: LangCode; className?: string }) {
  const p = parseStickerId(id);
  if (p?.family !== "word") return null;
  return (
    <span lang={lang} dir={getLanguage(lang).dir} className={className}>
      {labelOf(p.concept, lang)}
    </span>
  );
}

// ── Remsan ──────────────────────────────────────────────────────────────

export function RewardStrip() {
  const last = useRewards((s) => s.last);
  const shopOn = useSettings((s) => s.shopOn);
  // Utan Stjärnboden visas inte påsen (samma regel som startsidans bo-kort)
  const reveal = last && !shopOn ? { ...last, pouch: 0 } : last;
  if (!reveal || !hasRevealContent(reveal)) return null;
  // Ny reveal → nytt tillstånd (valet, timern och uppläsningen börjar om)
  return <StripBody key={reveal.n} r={reveal} />;
}

function StripBody({ r }: { r: Reveal }) {
  const uiLang = useSettings((s) => s.lang);
  const owned = useStickers((s) => s.owned);
  const { speak } = useSpeech();
  const [shown, setShown] = useState(false);
  const [tapped, setTapped] = useState(false);

  const lang = lessonLang(r.key, uiLang);
  const chips = chipsFor(r);
  const granted = !!r.word || r.rain.length > 0;
  const mode = r.word
    ? r.word.options.length >= 2
      ? "choice"
      : "single"
    : r.rain.length > 0
      ? "rain"
      : r.allKnown
        ? "known"
        : "pouch";

  // Innehållet tonar in efter stjärnorna; "peel"-ljudet bara om ett klistermärke gavs.
  // Bara ljud och synlighet här – allt är redan givet i finish().
  useEffect(() => {
    const t = window.setTimeout(() => {
      setShown(true);
      if (granted) playPeel();
    }, REVEAL_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [granted]);

  /** Tryck på ett ordkort: byt det givna ordet (om det går), läs upp och "peel". */
  const pick = (id: StickerId) => {
    const w = r.word;
    const p = parseStickerId(id);
    if (!w || p?.family !== "word") return;
    if (id !== w.chosen && useStickers.getState().choose(w.chosen, id, w.options))
      useRewards.getState().setChosen(id);
    setTapped(true);
    playPeel();
    speak(labelOf(p.concept, lang), lang, p.conceptId);
  };

  const hear = (id: StickerId) => {
    const p = parseStickerId(id);
    if (p?.family === "word") speak(labelOf(p.concept, lang), lang, p.conceptId);
  };

  // Uppläst sammanfattning (svenska namn), t.ex. "Nytt klistermärke: katt. Två stjärnor till påsen."
  const summary = [
    r.word && `Nytt klistermärke: ${stickerName(r.word.chosen)}.`,
    r.word &&
      r.word.options.length >= 2 &&
      `Du kan byta till ${listSv(r.word.options.filter((o) => o !== r.word?.chosen).map(stickerName), "eller")}.`,
    r.rain.length === 1 && `Nytt klistermärke: ${stickerName(r.rain[0])}.`,
    r.rain.length > 1 && `${r.rain.length} nya klistermärken: ${listSv(r.rain.map(stickerName))}.`,
    r.allKnown && "Alla orden finns redan i din bok – bra repetition!",
    r.pouch > 0 && pouchSay(r.pouch),
    ...chips.map((c) => sentence(c.say)),
  ]
    .filter(Boolean)
    .join(" ");

  const pouch = r.pouch > 0 ? <PouchChip n={r.pouch} /> : null;

  let body: ReactNode;
  if (mode === "choice" && r.word) {
    const w = r.word;
    const row3 = chips.length ? fitChips(chips, 2) : [];
    body = (
      <div className="flex flex-col items-center gap-1.5">
        {/* Rubriken byter text efter första trycket men behåller sin höjd (ingen hoppande layout) */}
        <p className="min-h-4 text-xs font-bold leading-tight text-purple-700 dark:text-purple-300">
          {tapped ? "Klart! De andra orden kommer när du övar igen." : "Välj ett ord till din bok"}
        </p>
        <div className="flex items-center justify-center gap-2">
          {w.options.map((id) => {
            const chosen = id === w.chosen;
            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => pick(id)}
                aria-pressed={chosen}
                aria-label={`Välj ${stickerName(id)}`}
                initial={false}
                animate={{ rotate: chosen ? 0 : tiltOf(id), y: chosen ? -4 : 0 }}
                transition={PEEL_SPRING}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "sticker-curl relative flex h-20 w-[76px] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-2xl bg-white px-1 outline-none dark:bg-zinc-800",
                  "focus-visible:ring-4 focus-visible:ring-purple-400",
                  chosen ? "shadow-lg ring-4 ring-amber-400" : "shadow ring-1 ring-black/5 dark:ring-white/10"
                )}
              >
                <span className="text-4xl">
                  <WordFace id={id} lang={lang} />
                </span>
                <WordText
                  id={id}
                  lang={lang}
                  className="max-w-full truncate text-[11px] font-bold leading-tight text-zinc-700 dark:text-zinc-200"
                />
                {chosen && (
                  <span
                    aria-hidden
                    className="absolute left-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[10px] font-black text-white"
                  >
                    ✓
                  </span>
                )}
              </motion.button>
            );
          })}
          {r.pouch > 0 && <PouchTag n={r.pouch} />}
        </div>
        <div className="flex min-h-4 flex-wrap items-center justify-center gap-1">
          {row3.length ? (
            <Chips chips={row3} />
          ) : (
            r.praise && <span className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">{r.praise}</span>
          )}
        </div>
      </div>
    );
  } else if (mode === "single" && r.word) {
    const id = r.word.chosen;
    body = (
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={() => hear(id)}
            aria-label={`Hör ${stickerName(id)}`}
            whileTap={{ scale: 0.95 }}
            style={{ rotate: tiltOf(id) }}
            className="sticker-curl relative grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg outline-none ring-4 ring-amber-400 focus-visible:ring-purple-400 dark:bg-zinc-800"
          >
            <span className="text-5xl">
              <WordFace id={id} lang={lang} />
            </span>
          </motion.button>
          <div className="flex min-w-0 flex-col items-start text-left">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="text-sm font-bold text-purple-700 dark:text-purple-300">Nytt klistermärke!</span>
              {pouch}
            </div>
            <div className="flex items-baseline gap-1.5">
              <WordText id={id} lang={lang} className="text-xl font-black leading-tight" />
              {lang !== "sv" && <span className="text-xs text-zinc-500 dark:text-zinc-400">{stickerName(id)}</span>}
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Tryck för att höra</span>
          </div>
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            <Chips chips={fitChips(chips, 3)} />
          </div>
        )}
      </div>
    );
  } else if (mode === "rain") {
    // Högst 7 rutor i raden: blir det fler tar "+N" den sjunde platsen
    const tiles = r.rain.length <= MAX_RAIN ? r.rain : r.rain.slice(0, MAX_RAIN - 1);
    const extra = r.rain.length - tiles.length;
    // En ensam vagn eller pärla (eller några få bokstäver) får större rutor
    const roomy = tiles.length <= 3;
    body = (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center justify-center gap-1.5">
          {tiles.map((id, i) => (
            <motion.span
              key={id}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={shown ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
              transition={{ ...PEEL_SPRING, delay: i * 0.08 }}
              // align-top: Stickerns inline-grid sätts annars på textens baslinje (vagnar och pärlor hamnar för lågt)
              className={cn(
                "relative grid place-items-center [&_.sticker]:align-top",
                roomy ? "h-14 w-14" : "h-10 w-10"
              )}
            >
              <Sticker
                id={id}
                state="tray"
                parts={owned[id]?.parts}
                tricky={owned[id]?.tricky === 1}
                lang={lang}
                decorative
                className={roomy ? "text-[44px]" : "text-[30px]"}
              />
              {/* bocken per bricka: "den här är din nu" */}
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-zinc-900"
              >
                ✓
              </span>
            </motion.span>
          ))}
          {extra > 0 && (
            <span className="grid h-10 min-w-10 place-items-center rounded-full bg-white px-1.5 text-sm font-bold text-zinc-600 shadow dark:bg-zinc-800 dark:text-zinc-300">
              <span dir="ltr">+{extra}</span>
            </span>
          )}
        </div>
        {r.praise && <p className="text-xs font-semibold leading-tight text-zinc-600 dark:text-zinc-300">{r.praise}</p>}
        {(pouch || chips.length > 0) && (
          <div className="flex flex-wrap items-center justify-center gap-1">
            {pouch}
            <Chips chips={fitChips(chips, 3)} />
          </div>
        )}
      </div>
    );
  } else if (mode === "known") {
    body = (
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-sm font-semibold leading-snug text-purple-700 dark:text-purple-300">
          Alla orden finns redan i din bok – bra repetition!
        </p>
        {(pouch || chips.length > 0) && (
          <div className="flex flex-wrap items-center justify-center gap-1">
            {pouch}
            <Chips chips={fitChips(chips, 3)} />
          </div>
        )}
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col items-center gap-1.5">
        {r.pouch > 0 && <PouchChip n={r.pouch} big />}
        {chips.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            <Chips chips={fitChips(chips, 3)} />
          </div>
        )}
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div dir="ltr" className="w-full max-w-sm">
        <p role="status" aria-live="polite" className="sr-only">
          {shown ? summary : ""}
        </p>
        {/* Finns i layouten från start (slutlig höjd) men syns och går att trycka på först efter 0,9 s */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          inert={!shown}
        >
          {body}
        </motion.div>
      </div>
    </MotionConfig>
  );
}
