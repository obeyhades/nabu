import type {
  Band,
  Concept,
  GameDefinition,
  LangCode,
  NestItem,
  OwnedSticker,
  StickerId,
  StickerPageId,
} from "../types";
import { ALPHABETS } from "../data/alphabets";
import { CONCEPTS, labelOf } from "../data/concepts";
import { GAMES } from "../data/gameRegistry";
import { getLanguage } from "../data/languages";
import { BOOK_PAGES, PAGE_OF_STICKER, WAGON_LABELS, countingMax, parseStickerId, type BookPage } from "../data/stickers";
import { badgeBands, medallionLit, pageProgress, trayIds } from "./rewards";
import { numberOf } from "./stickerArt";

/**
 * Hjälpare för klistermärkesbokens sidor (index, sida, kuvert, ordkort).
 * Komponentfiler får bara exportera komponenter, så de bor här.
 * Inga stores – allt tar emot det det behöver.
 */

type Owned = Record<StickerId, OwnedSticker>;

/** Språkens namn på svenska (ordkortet visar text, aldrig flaggor – de blir rutor på Windows). */
export const LANG_NAMES_SV: Record<LangCode, string> = {
  sv: "Svenska",
  en: "Engelska",
  el: "Grekiska",
  ru: "Ryska",
  ar: "Arabiska",
};

export const capitalize = (s: string): string => (s ? s[0].toLocaleUpperCase("sv-SE") + s.slice(1) : s);

/** "Ellas klistermärkesbok", "Lukas klistermärkesbok" (s/x/z får inget extra s), annars "Min …". */
export function bookTitle(name: string): string {
  const n = name.trim();
  if (!n) return "Min klistermärkesbok";
  return /[sxz]$/i.test(n) ? `${n} klistermärkesbok` : `${n}s klistermärkesbok`;
}

// ── Uppläsning och etiketter ────────────────────────────────────────────

/** Det som ska sägas: text + språk, och koncept-id när det finns en mp3. */
export type Voice = { text: string; lang: LangCode; conceptId?: string };

/** Sifferordet för ett tal 1–20 (har mp3 på alla språk). */
export function numberConcept(n: number): Concept | undefined {
  return CONCEPTS.find((c) => c.category === "numbers" && numberOf(c.id) === n);
}

/** Vagnens etikett som ord för talsyntesen: "− från 8" → "minus från 8". */
export function spokenMath(label: string): string {
  return label
    .replace(/\+/g, " plus ")
    .replace(/−/g, " minus ")
    .replace(/×/g, " gånger ")
    .replace(/÷/g, " delat med ")
    .replace(/–/g, " till ")
    .replace(/&/g, " och ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Vad ett klistermärke säger när man trycker på det:
 * ord och sifferord = ordets mp3 på inlärningsspråket, bokstav = tecknet på
 * affischens språk (talsyntes, kan vara tyst offline), siffra = talets mp3,
 * vagn = etiketten på svenska, pärla = talet {hi}, spelmärke = spelets namn.
 */
export function stickerVoice(id: StickerId, learn: LangCode): Voice | null {
  if (id.startsWith("s:")) {
    const game = GAMES.find((g) => `s:${g.id}` === id);
    return game ? { text: game.name, lang: "sv" } : null;
  }
  const p = parseStickerId(id);
  if (!p) return null;
  switch (p.family) {
    case "word":
      return { text: labelOf(p.concept, learn), lang: learn, conceptId: p.concept.id };
    case "letter":
      return { text: ALPHABETS[p.lang].upper[p.index], lang: p.lang };
    case "digit": {
      const c = numberConcept(p.digit);
      return c
        ? { text: labelOf(c, p.lang), lang: p.lang, conceptId: c.id }
        : { text: ALPHABETS[p.lang].digits[p.digit], lang: p.lang };
    }
    case "wagon":
      return { text: spokenMath(WAGON_LABELS[p.level - 1]), lang: "sv" };
    case "bead": {
      const c = numberConcept(countingMax(p.level));
      return c ? { text: labelOf(c, learn), lang: learn, conceptId: c.id } : null;
    }
  }
}

/** Texten under en plats: ordet (inlärningsspråket), vagnens räknesätt eller "till 7". Bokstäver har ingen. */
export type Caption = { text: string; lang: LangCode; dir: "ltr" | "rtl" };

export function stickerCaption(id: StickerId, learn: LangCode): Caption | null {
  const p = parseStickerId(id);
  if (!p) return null;
  switch (p.family) {
    case "word":
      return { text: labelOf(p.concept, learn), lang: learn, dir: getLanguage(learn).dir };
    case "wagon":
      return { text: WAGON_LABELS[p.level - 1], lang: "sv", dir: "ltr" };
    case "bead":
      return { text: `till ${countingMax(p.level)}`, lang: "sv", dir: "ltr" };
    default:
      return null;
  }
}

/** Det ljusa tecknet på en tom bokstavs- eller sifferplats ("Aa", "ب", "7"). */
export function slotGlyph(id: StickerId): Caption | null {
  const p = parseStickerId(id);
  if (!p) return null;
  if (p.family === "letter") {
    const a = ALPHABETS[p.lang];
    const low = a.lower?.[p.index];
    return { text: `${a.upper[p.index]}${low ?? ""}`, lang: p.lang, dir: getLanguage(p.lang).dir };
  }
  if (p.family === "digit") return { text: ALPHABETS[p.lang].digits[p.digit], lang: p.lang, dir: "ltr" };
  return null;
}

/**
 * Märkets textstorlek på sidan, i kuvertet och under flygturen (samma överallt,
 * så flygturen landar utan hopp). Vagnar och pärlor har hjul/etikett under sig
 * och ritas lite mindre så att texten under platsen får plats.
 */
export function stickerSize(id: StickerId): string {
  return id.startsWith("m:") || id.startsWith("c:") ? "text-[2.35rem]" : "text-[2.75rem]";
}

/**
 * Läggs på ett omslag runt <Sticker>: märkets ruta (inline-grid) linjeras mot
 * radens överkant i stället för baslinjen. Annars hamnar vagnar och pärlor (vars
 * baslinje ligger högt upp i rutan) en bit för långt ner och krockar med texten under.
 */
export const STICKER_ALIGN = "[&_.sticker]:align-top [&_.sticker-ghost]:align-top";

/** Ordkortet finns bara för ord. */
export const isWordSticker = (id: StickerId): boolean => id.startsWith("w:");

/** Koncept-id för ett ordklistermärke ("w:cat" → "cat"). */
export const conceptOf = (id: StickerId): string | null => (isWordSticker(id) ? id.slice(2) : null);

// ── Sidorna ─────────────────────────────────────────────────────────────

/** Affischerna som syns i indexet: inlärningsspråket + varje språk med en ägd bokstav eller siffra. */
export function posterLangs(owned: Owned, lang: LangCode): Set<LangCode> {
  const langs = new Set<LangCode>([lang]);
  for (const id of Object.keys(owned)) {
    if (!id.startsWith("l:") && !id.startsWith("d:")) continue;
    const p = parseStickerId(id);
    if (p && (p.family === "letter" || p.family === "digit")) langs.add(p.lang);
  }
  return langs;
}

/**
 * Bokens bläddringsordning: indexets ordning med de synliga affischerna
 * (`keep` = sidan man står på, även om den ligger under "Fler språk").
 * Ordningen speglas aldrig, inte heller på arabiska.
 */
export function bookOrder(owned: Owned, lang: LangCode, keep?: StickerPageId): BookPage[] {
  const langs = posterLangs(owned, lang);
  return BOOK_PAGES.filter((p) => p.group !== "bokstaver" || p.id === keep || (!!p.lang && langs.has(p.lang)));
}

export function neighbours(order: BookPage[], id: StickerPageId): { prev: BookPage | null; next: BookPage | null } {
  const i = order.findIndex((p) => p.id === id);
  if (i < 0) return { prev: null, next: null };
  return { prev: order[i - 1] ?? null, next: order[i + 1] ?? null };
}

/** Bläddringsriktning mellan två sidor (1 = framåt, −1 = bakåt) i bokens fasta ordning. */
export function turnDir(from: StickerPageId, to: StickerPageId): 1 | -1 {
  const ix = (id: StickerPageId) => BOOK_PAGES.findIndex((p) => p.id === id);
  return ix(to) >= ix(from) ? 1 : -1;
}

/** Kuvertet delat i den här sidans märken (först) och de andra sidornas, i den ordning de kom. */
export function trayFor(owned: Owned, pageId: StickerPageId): { here: StickerId[]; others: StickerId[] } {
  const here: StickerId[] = [];
  const others: StickerId[] = [];
  for (const id of trayIds(owned)) (PAGE_OF_STICKER.get(id) === pageId ? here : others).push(id);
  return { here, others };
}

/** Sidans platser i hyllornas ordning (kaskaden och vågen går i den ordningen). */
export const pageSlots = (page: BookPage): StickerId[] => (page.derived ? [] : page.shelves.flatMap((s) => s.ids));

/** En händelse på ett märke; `n` ökar varje gång så att animationen startar om. */
export type Pulse = { id: StickerId; n: number };

/** Allt en hylla behöver veta om sidans läge just nu (sidan äger tillståndet). */
export type ShelfView = {
  lifted: StickerId | null; // upplyft i kuvertet (hör till den här sidan)
  hint: StickerId | null; // rätt plats får en guldring efter 2 miss
  flying: StickerId | null; // märket flyger dit – platsen väntar osynlig
  landed: Pulse | null; // landade nyss: smack (1.15 → .94 → 1)
  wiggle: Pulse | null; // fel plats vickar
  cascade: ReadonlyMap<StickerId, number> | null; // "Sätt in alla": ordningen i kaskaden
  wave: number; // > 0: sidan är klar och alla märken vinkar
  plays: Readonly<Record<StickerId, number>>; // tricket spelas när talet ökar
  card: StickerId | null; // knappen till ordkortet visas på det här märket
};

// ── Märkeshyllan ────────────────────────────────────────────────────────

export type BadgeStatus = { game: GameDefinition; lit: boolean; bands: Band[] };

/** Varje spels märke: tänt (en vanlig avklarad nivå) och vilka band som har ram. */
export function badgeStatus(stars: Record<string, number>): BadgeStatus[] {
  return GAMES.map((game) => ({ game, lit: medallionLit(stars, game), bands: badgeBands(stars, game) }));
}

/** "{klart} av {alla}" för en sida (Märkeshyllan räknar tända spelmärken). */
export function pageCount(page: BookPage, owned: Owned, badges: BadgeStatus[]): { done: number; total: number; waiting: number } {
  if (page.derived) return { done: badges.filter((b) => b.lit).length, total: badges.length, waiting: 0 };
  const p = pageProgress(page, owned);
  return { done: p.placed, total: p.total, waiting: p.owned - p.placed };
}

// ── Gåvorna ─────────────────────────────────────────────────────────────

/** Vännens förnamn ("Pip kycklingen" → "Pip"); andra saker heter som de heter. */
export const giftName = (item: NestItem): string => (item.kind === "friend" ? item.name.split(" ")[0] : item.name);

/** Lappen på sidan: "Pip flyttar in i Nabus bo" / "Jordgloben till Nabus bo". */
export function giftTag(item: NestItem): string {
  return item.kind === "friend" ? `${giftName(item)} flyttar in i Nabus bo` : `${item.name} till Nabus bo`;
}

/** Festens gåvokort: "Pip flyttar in i Nabus bo!" / "Jordgloben finns nu i Nabus bo!" */
export function giftLine(item: NestItem): string {
  return item.kind === "friend" ? `${giftName(item)} flyttar in i Nabus bo!` : `${item.name} finns nu i Nabus bo!`;
}

// ── Övrigt ──────────────────────────────────────────────────────────────

/** "2026-11-26" → "26 november 2026". */
export function formatDateSv(at: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(at);
  if (!m) return at;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
}

// ── En sidfest som inte hann visas ──────────────────────────────────────
// Sidan blev klar (gåvan är redan given och spärren satt), men barnet lämnade
// sidan innan festen började. Festen visas då nästa gång boken öppnas – på
// sidan själv eller i indexet. Bara i minnet (aldrig sparad).
let heldPartyPage: StickerPageId | null = null;

/** Spara (eller släpp, med null) en fest som inte hann visas. */
export function holdParty(id: StickerPageId | null): void {
  heldPartyPage = id;
}

/** Sidan vars fest väntar, om någon (läser bara). */
export function heldParty(): StickerPageId | null {
  return heldPartyPage;
}

/** Vill användaren ha mindre rörelse? (För scroll – framer sköter resten via MotionConfig.) */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Mittpunkten av ett element i fönstret (för flygturen från kuvertet). */
export function centerOf(el: Element | null | undefined): { x: number; y: number } | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
