import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, X } from "lucide-react";
import type { GameDefinition, LangCode, Met, OwnedSticker, StickerId } from "../../types";
import { cn } from "../../lib/cn";
import { wrapTab } from "../../lib/focusTrap";
import { isBlank } from "../../lib/rewards";
import { LANG_NAMES_SV, formatDateSv, stickerVoice } from "../../lib/stickerBook";
import { GAMES } from "../../data/gameRegistry";
import { LANGUAGES } from "../../data/languages";
import { OWL_STICKER, parseStickerId } from "../../data/stickers";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useSpeech } from "../../hooks/useSpeech";
import { Sticker } from "../Sticker";

// Stämplarnas färger per språk (bara pynt – namnet står alltid som text)
const STAMP: Record<LangCode, string> = {
  sv: "border-sky-500 text-sky-700 dark:border-sky-400 dark:text-sky-300",
  en: "border-rose-500 text-rose-700 dark:border-rose-400 dark:text-rose-300",
  el: "border-indigo-500 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300",
  ru: "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300",
  ar: "border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300",
};

/**
 * Ordkortet: ett ark nerifrån med det stora märket (med Blank/Guldkant), det
 * svenska namnet, ordet på alla fem språk med 🔊, spelen där ordet övats,
 * språkstämplar, vägen till Blank och Guldkant och dagen märket kom.
 * Stängs med ✕, Esc eller ett tryck utanför. Fokus stannar i arket så länge det är öppet.
 */
export function WordCardSheet({
  id,
  o,
  m,
  lang,
  onClose,
  restoreFocus,
}: {
  id: StickerId;
  o: OwnedSticker | undefined;
  m: Met | undefined;
  lang: LangCode;
  onClose: () => void;
  /** Fokus efter stängning om knappen man öppnade från inte finns kvar. */
  restoreFocus?: () => void;
}) {
  const { speak } = useSpeech();
  const sheet = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [play, setPlay] = useState(0);
  useScrollLock();

  // Senaste onClose utan att effekten nedan startar om (då skulle fokus hoppa)
  const close = useRef(onClose);
  const restore = useRef(restoreFocus);
  useEffect(() => {
    close.current = onClose;
    restore.current = restoreFocus;
  }, [onClose, restoreFocus]);

  // Fokus in i arket, Esc stänger, Tab går runt inne i arket; fokus tillbaka efteråt
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
        return;
      }
      wrapTab(e, sheet.current);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      // Knappen man öppnade från kan ha försvunnit – då tar sidan emot fokus
      if (before?.isConnected) before.focus();
      else restore.current?.();
    };
  }, []);

  const p = parseStickerId(id);
  if (!p || p.family !== "word") return null;
  const c = p.concept;
  const sv = c.labels.sv ?? c.id;
  const games = (m?.g ?? [])
    .map((g) => GAMES.find((x) => x.id === g))
    .filter((g): g is GameDefinition => !!g);
  const langs = LANGUAGES.filter((l) => (m?.l ?? []).includes(l.code));
  const blankCount = Math.min(3, m?.g.length ?? 0);
  const headingId = `ordkort-${c.id}`;

  const tapBig = () => {
    setPlay((n) => n + 1);
    const v = stickerVoice(id, lang);
    if (v) speak(v.text, v.lang, v.conceptId);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        dir="ltr"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        // dvh: toppen hamnar aldrig under Safaris adressfält; rullningen stannar i bladet
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-5 pb-[max(2rem,var(--safe-b))] pt-3 shadow-2xl dark:bg-zinc-900"
      >
        <span aria-hidden className="mx-auto mb-2 block h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          aria-label="Stäng ordkortet"
          className="absolute right-3 top-3 grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-600 outline-none motion-safe:transition motion-safe:active:scale-90 focus-visible:ring-4 focus-visible:ring-purple-400 dark:bg-zinc-800 dark:text-zinc-300"
        >
          <X size={26} aria-hidden />
        </button>

        <div className="flex flex-col items-center pt-2 text-center">
          <button
            type="button"
            onClick={tapBig}
            aria-label={`Lyssna: ${sv}`}
            className="grid h-36 w-36 place-items-center rounded-3xl outline-none motion-safe:transition motion-safe:active:scale-95 focus-visible:ring-4 focus-visible:ring-purple-400"
          >
            <Sticker id={id} blank={isBlank(m)} gold={!!m?.gold} lang={lang} play={play} decorative className="text-8xl" />
          </button>
          <h2 id={headingId} className="mt-1 text-3xl font-black">
            {sv}
          </h2>
          {id === OWL_STICKER && o?.via === "gift" && (
            <p className="mt-1 text-sm font-semibold text-purple-600 dark:text-purple-300">Nabus eget klistermärke 🦉</p>
          )}
        </div>

        {/* Ordet på alla språk */}
        <ul className="mt-5 divide-y divide-zinc-100 rounded-2xl bg-zinc-50 dark:divide-zinc-800 dark:bg-zinc-800/60">
          {LANGUAGES.map((l) => {
            const word = c.labels[l.code];
            if (!word) return null;
            return (
              <li
                key={l.code}
                className={cn("flex items-center gap-3 px-3 py-1.5", l.code === lang && "rounded-2xl bg-purple-50 dark:bg-purple-500/15")}
              >
                <span className="w-16 shrink-0 text-xs font-semibold text-zinc-500 sm:w-20 sm:text-sm dark:text-zinc-400">
                  {LANG_NAMES_SV[l.code]}
                </span>
                <span lang={l.code} dir={l.dir} className="word-fit flex-1 text-xl font-bold">
                  {word}
                </span>
                <button
                  type="button"
                  onClick={() => speak(word, l.code, c.id)}
                  aria-label={`Lyssna på ${LANG_NAMES_SV[l.code].toLowerCase()}`}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-purple-600 shadow-sm outline-none motion-safe:transition motion-safe:active:scale-90 focus-visible:ring-4 focus-visible:ring-purple-400 dark:bg-zinc-700 dark:text-purple-300"
                >
                  <Volume2 size={22} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>

        {/* Var och hur ordet har övats */}
        {games.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Övat i:</h3>
            <ul className="mt-1.5 flex flex-wrap gap-2">
              {games.map((g) => (
                <li key={g.id} className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-100 text-2xl dark:bg-zinc-800" title={g.name}>
                  <span aria-hidden>{g.emoji}</span>
                  <span className="sr-only">{g.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {langs.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Övat på:</h3>
            <ul className="mt-2 flex flex-wrap gap-3">
              {langs.map((l, i) => (
                <li
                  key={l.code}
                  title={LANG_NAMES_SV[l.code]}
                  className={cn(
                    "grid h-14 w-14 place-items-center rounded-full border-4 border-double bg-white text-base font-black tracking-wide dark:bg-zinc-900",
                    STAMP[l.code]
                  )}
                  style={{ rotate: `${(i % 2 ? 1 : -1) * (6 + i * 2)}deg` }}
                >
                  <span aria-hidden>{l.code.toUpperCase()}</span>
                  <span className="sr-only">{LANG_NAMES_SV[l.code]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="mt-5 space-y-2 text-sm font-semibold">
          <li className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
            <span aria-hidden>✨</span>
            <span className="flex-1">
              Blank: övat i 3 olika spel (<span dir="ltr">{blankCount}/3</span>)
            </span>
            <span aria-hidden className={blankCount >= 3 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}>
              {blankCount >= 3 ? "✓" : "○"}
            </span>
          </li>
          <li className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
            <span aria-hidden>🥇</span>
            <span className="flex-1">Guldkant: klara ett guldspel där ordet finns</span>
            <span aria-hidden className={m?.gold ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}>
              {m?.gold ? "✓" : "○"}
            </span>
            <span className="sr-only">{m?.gold ? "klart" : "inte än"}</span>
          </li>
        </ul>

        {o?.at && <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">Fick: {formatDateSv(o.at)}</p>}
      </motion.div>
    </motion.div>
  );
}
