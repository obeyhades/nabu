import type { LangCode, Level } from "../types";
import { CONCEPTS } from "./concepts";
import { graphemes } from "../lib/graphemes";
import { shuffle } from "../lib/shuffle";

/**
 * Alfabet per språk för "Spåra & rita". Arabiska saknar versaler/gemener –
 * där används de fristående (isolerade) bokstavsformerna och `lower` är null.
 */
export type Alphabet = {
  upper: string[];
  lower: string[] | null;
  digits: string[];
  /** Bokstäver som brukar vara svåra att forma – används i repetitionsnivåerna. */
  tricky: { upper: string[]; lower: string[] };
};

const split = (s: string) => [...s];
const DIGITS = split("0123456789");

export const ALPHABETS: Record<LangCode, Alphabet> = {
  sv: {
    upper: split("ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ"),
    lower: split("abcdefghijklmnopqrstuvwxyzåäö"),
    digits: DIGITS,
    tricky: { upper: split("BDGJKMNQRSWZÅÄÖ"), lower: split("abdgjkpqyfåäö") },
  },
  en: {
    upper: split("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
    lower: split("abcdefghijklmnopqrstuvwxyz"),
    digits: DIGITS,
    tricky: { upper: split("BDGJKMNQRSWZ"), lower: split("abdgjkpqyfe") },
  },
  el: {
    upper: split("ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"),
    lower: split("αβγδεζηθικλμνξοπρστυφχψω"),
    digits: DIGITS,
    tricky: { upper: split("ΓΔΘΛΞΣΦΨΩ"), lower: split("βγδζθλξφψω") },
  },
  ru: {
    upper: split("АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"),
    lower: split("абвгдеёжзийклмнопрстуфхцчшщъыьэюя"),
    digits: DIGITS,
    tricky: { upper: split("БДЁЖЗФЩЫЮЯ"), lower: split("бдёжзфщыюя") },
  },
  ar: {
    upper: split("ابتثجحخدذرزسشصضطظعغفقكلمنهوي"),
    lower: null,
    digits: DIGITS,
    tricky: { upper: split("جحخعغكهشصضطظقي"), lower: split("جحخعغكهشصضطظقي") },
  },
};

export type TraceKind = "upper" | "lower" | "digit" | "word";
export type TraceLevel = { items: string[]; kind: TraceKind };

/** Arabiska vokaltecken/tatweel – spåras inte (för små att rita). */
const HARAKAT = /[ً-ْٰـ]/g;

/** Ordet som det ska spåras (utan arabiska vokaltecken). */
export function traceText(word: string): string {
  return word.replace(HARAKAT, "");
}

/** Dela en lista i `n` på varandra följande, ungefär lika stora bitar. */
function chunk<T>(arr: T[], n: number, index: number): T[] {
  const size = arr.length / n;
  return arr.slice(Math.round(index * size), Math.round((index + 1) * size));
}

function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

/** Korta ord (≤ 6 grafem, inga mellanslag) från ett band, på valt språk. */
function shortWords(lang: LangCode, band: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of CONCEPTS) {
    if (c.level !== band) continue;
    const label = c.labels[lang];
    if (!label || /\s/.test(label)) continue;
    const t = traceText(label);
    if (graphemes(t).length > 6 || seen.has(t)) continue;
    seen.add(t);
    out.push(label);
  }
  return out;
}

/** Nivån som heltal 1–20 (samma klämning för byggning och inspelning). */
function clampLevel(level: Level): Level {
  return Math.min(20, Math.max(1, Math.round(level)));
}

/**
 * Nivåstigen (1–20):
 *  1–5   versaler i 5 bitar (arabiska: första halvan av alfabetet)
 *  6–10  gemener i 5 bitar (arabiska: andra halvan)
 *  11–12 siffror 0–4, 5–9
 *  13–15 repetition av kluriga bokstäver (versaler, gemener, blandat)
 *  16–20 korta ord (band 1 för 16–17, band 2 för 18–20)
 * Orden returneras med ev. arabiska vokaltecken – använd `traceText()` för att rita.
 * `lvl` är redan klämd till 1–20.
 */
function buildTraceLevel(lang: LangCode, lvl: Level): TraceLevel {
  const a = ALPHABETS[lang] ?? ALPHABETS.sv;
  const half = Math.ceil(a.upper.length / 2);

  if (lvl <= 5) {
    const src = a.lower ? a.upper : a.upper.slice(0, half);
    return { items: chunk(src, 5, lvl - 1), kind: "upper" };
  }
  if (lvl <= 10) {
    const src = a.lower ?? a.upper.slice(half);
    return { items: chunk(src, 5, lvl - 6), kind: a.lower ? "lower" : "upper" };
  }
  if (lvl === 11) return { items: a.digits.slice(0, 5), kind: "digit" };
  if (lvl === 12) return { items: a.digits.slice(5), kind: "digit" };
  if (lvl === 13) return { items: sample(a.tricky.upper, 5), kind: "upper" };
  if (lvl === 14) return { items: sample(a.tricky.lower, 6), kind: a.lower ? "lower" : "upper" };
  if (lvl === 15) {
    const mixed = [...sample(a.tricky.upper, 4), ...sample(a.tricky.lower, 3)];
    return { items: shuffle([...new Set(mixed)]), kind: a.lower ? "lower" : "upper" };
  }

  const band = lvl <= 17 ? 1 : 2;
  const count = lvl <= 17 ? 4 : 5;
  let pool = shortWords(lang, band);
  if (pool.length < count) pool = [...pool, ...shortWords(lang, 1).filter((w) => !pool.includes(w))];
  return { items: sample(pool, count), kind: "word" };
}

/**
 * Senast byggda spårnivån. Klistermärkesboken läser den i finish() för att veta
 * exakt vilka bokstäver/ord lektionen hade. TraceGame spelar alla items (bitarna
 * är ≤ 7 = MAX_ROUNDS) men blandar ordningen själv – mängden är det som räknas.
 */
let lastTrace: ({ lang: LangCode; level: Level } & TraceLevel) | null = null;

/** Nivåstigen (se `buildTraceLevel`). Varje anrop sparas som senaste spårnivån. */
export function traceLevel(lang: LangCode, level: Level): TraceLevel {
  const lvl = clampLevel(level);
  const built = buildTraceLevel(lang, lvl);
  lastTrace = { lang, level: lvl, items: [...built.items], kind: built.kind };
  return built;
}

/** Senaste spårnivåns items – bara om språk och nivå stämmer, annars null. */
export function lastTraceItems(lang: LangCode, level: Level): TraceLevel | null {
  if (!lastTrace || lastTrace.lang !== lang || lastTrace.level !== clampLevel(level)) return null;
  return { items: [...lastTrace.items], kind: lastTrace.kind };
}

/**
 * De fasta items för nivå 1–12 (bokstäver och siffror – ingen slump där).
 * Nivå 13–20 slumpas och ger null. Sparas inte som senaste spårnivån.
 */
export function fixedTraceItems(lang: LangCode, level: Level): string[] | null {
  const lvl = clampLevel(level);
  return lvl <= 12 ? buildTraceLevel(lang, lvl).items : null;
}
