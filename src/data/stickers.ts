/**
 * ETIK – läs innan du ändrar:
 * 1. Inga förhandsvisningar: nivåer, Coach och vinstskärm lovar aldrig klistermärken eller saker före spel.
 * 2. Inga lockbeten: inga pulserande "Nytt!"-märken, inget "bara 2 kvar!", inga erbjudanden när barnet vill sluta.
 * 3. Inga timers: inget tidsbegränsat, roterande, säsongsbundet eller på rea.
 * 4. Ingen slump: alla belöningar och priser är bestämda och synliga i förväg.
 * 5. Inget kopplat till streak eller dagens mål.
 * 6. Inga riktiga pengar. Inget förfaller. Nabu är aldrig ledsen, hungrig eller "saknar dig".
 */
import type {
  Band,
  Category,
  Concept,
  GameId,
  ItemId,
  LangCode,
  Level,
  SceneId,
  StickerFamily,
  StickerId,
  StickerPageId,
} from "../types";
import { CONCEPTS, REAL_CATEGORIES } from "./concepts";
import { ALPHABETS } from "./alphabets";
import { BANDS, LEVEL_COUNT, LEVELS_PER_BAND } from "./levels";
import { GAMES } from "./gameRegistry";

/**
 * Klistermärkesboken. Ordsidorna RÄKNAS FRAM ur CONCEPTS per (kategori, band) i
 * listans ordning, så ett nytt ord hamnar på sin sida av sig självt.
 * Regler: id återanvänds/byts aldrig namn på, och nya ord läggs sist i sitt
 * kategoriblock. Ord vars (kategori, band) ingen sida täcker hamnar på "Fler ord".
 */

/** Riktiga ordkategorier (utan "blandad"). */
export type WordCategory = Exclude<Category, "blandad">;

export type BookShelf = { label: string; icon: string; ids: StickerId[]; band?: Band };

export type BookPage = {
  id: StickerPageId;
  group: "ord" | "bokstaver" | "rakna" | "marken";
  title: string;
  emoji: string;
  scene: SceneId;
  lang?: LangCode;
  shelves: BookShelf[];
  gift?: ItemId;
  praise: string;
  derived?: true; // Märkeshyllan: räknas fram ur stjärnorna, inget klistras in
};

// ── Id-hjälpare ──────────────────────────────────────────────────────────

export const wordId = (conceptId: string): StickerId => `w:${conceptId}`;
/** `i` = 0-baserat index i `ALPHABETS[lang].upper`. */
export const letterId = (lang: LangCode, i: number): StickerId => `l:${lang}:${i}`;
export const digitId = (lang: LangCode, d: number): StickerId => `d:${lang}:${d}`;
export const wagonId = (level: Level): StickerId => `m:${level}`;
export const beadId = (level: Level): StickerId => `c:${level}`;
/** Märkeshyllans spelmärken är härledda – det här är bara en rendernyckel. */
export const medallionKey = (game: GameId): string => `s:${game}`;

/** Nabus eget klistermärke – ges till alla och sitter redan i boken. */
export const OWL_STICKER: StickerId = "w:owl";

export const CONCEPT_BY_ID = new Map<string, Concept>(CONCEPTS.map((c) => [c.id, c]));
/** Ordets plats i CONCEPTS (för "lättaste okända ordet först"). */
export const CONCEPT_INDEX = new Map<string, number>(CONCEPTS.map((c, i) => [c.id, i]));

export type ParsedSticker =
  | { family: "word"; conceptId: string; concept: Concept }
  | { family: "letter"; lang: LangCode; index: number }
  | { family: "digit"; lang: LangCode; digit: number }
  | { family: "wagon"; level: Level }
  | { family: "bead"; level: Level };

const isLang = (s: string): s is LangCode => Object.prototype.hasOwnProperty.call(ALPHABETS, s);
const intIn = (s: string, lo: number, hi: number): number | null => {
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= lo && n <= hi ? n : null;
};

/** Tolka ett klistermärkes-id. Okända ord, språk eller index ger null. */
export function parseStickerId(id: StickerId): ParsedSticker | null {
  const parts = id.split(":");
  const [kind] = parts;
  if (kind === "w" && parts.length === 2) {
    const concept = CONCEPT_BY_ID.get(parts[1]);
    return concept ? { family: "word", conceptId: concept.id, concept } : null;
  }
  if ((kind === "l" || kind === "d") && parts.length === 3 && isLang(parts[1])) {
    const lang = parts[1];
    if (kind === "l") {
      const index = intIn(parts[2], 0, ALPHABETS[lang].upper.length - 1);
      return index === null ? null : { family: "letter", lang, index };
    }
    const digit = intIn(parts[2], 0, 9);
    return digit === null ? null : { family: "digit", lang, digit };
  }
  if ((kind === "m" || kind === "c") && parts.length === 2) {
    const level = intIn(parts[1], 1, LEVEL_COUNT);
    if (level === null) return null;
    return kind === "m" ? { family: "wagon", level } : { family: "bead", level };
  }
  return null;
}

// ── Ordboken: 16 ordsidor ────────────────────────────────────────────────

export type WordPageDef = {
  id: StickerPageId;
  title: string;
  emoji: string;
  scene: SceneId;
  category: WordCategory;
  bands: Band[];
  gift: ItemId;
  praise: string;
};

export const WORD_PAGE_DEFS: WordPageDef[] = [
  { id: "djur-1", title: "Gården", emoji: "🐮", scene: "meadow", category: "animals", bands: [1], gift: "friend-chick", praise: "Du har övat alla gårdsdjuren!" },
  { id: "djur-2", title: "Djurparken", emoji: "🦁", scene: "meadow", category: "animals", bands: [2], gift: "friend-hamster", praise: "Du har övat alla djuren i djurparken!" },
  { id: "djur-3", title: "Jorden runt", emoji: "🐘", scene: "meadow", category: "animals", bands: [3], gift: "toy-globe", praise: "Du har övat djur från hela jorden!" },
  { id: "djur-4", title: "Djurens hemligheter", emoji: "🦔", scene: "meadow", category: "animals", bands: [4], gift: "friend-badger", praise: "Du har övat de svåraste djurorden!" },
  { id: "mat-1", title: "Frukostbordet", emoji: "🥛", scene: "table", category: "food", bands: [1, 2], gift: "furn-basket", praise: "Du har övat alla frukostorden!" },
  { id: "mat-2", title: "Kalaset", emoji: "🍰", scene: "table", category: "food", bands: [3, 4], gift: "garland-party", praise: "Du har övat alla kalasorden!" },
  { id: "frukt-1", title: "Fruktskålen", emoji: "🍎", scene: "orchard", category: "fruit", bands: [1, 2], gift: "friend-caterpillar", praise: "Du har övat alla frukterna i skålen!" },
  { id: "frukt-2", title: "Djungelfrukter", emoji: "🍍", scene: "orchard", category: "fruit", bands: [3, 4], gift: "plant-palm", praise: "Du har övat alla djungelfrukterna!" },
  { id: "gron-1", title: "Köksträdgården", emoji: "🥕", scene: "garden", category: "vegetables", bands: [1, 2], gift: "plant-sunflower", praise: "Du har övat alla grönsakerna i landet!" },
  { id: "gron-2", title: "Växthuset", emoji: "🍆", scene: "garden", category: "vegetables", bands: [3, 4], gift: "friend-snail", praise: "Du har övat alla grönsakerna i växthuset!" },
  { id: "fordon-1", title: "Ut och åka", emoji: "🚗", scene: "road", category: "vehicles", bands: [1, 2], gift: "wall-map", praise: "Du har övat alla fordonsorden!" },
  { id: "fordon-2", title: "Fart och fläkt", emoji: "🚁", scene: "road", category: "vehicles", bands: [3, 4], gift: "toy-telescope", praise: "Du har övat alla snabba fordon!" },
  { id: "kropp-1", title: "Huvud och fötter", emoji: "👂", scene: "blueprint", category: "body", bands: [1, 2], gift: "neck-bow", praise: "Du har övat kroppens delar!" },
  { id: "kropp-2", title: "Kroppens hemligheter", emoji: "🧠", scene: "blueprint", category: "body", bands: [3, 4], gift: "hat-gradcap", praise: "Du har övat hela kroppen – inuti också!" },
  { id: "siffror-1", title: "Ett till tio", emoji: "🔟", scene: "chalk", category: "numbers", bands: [1, 2], gift: "wall-clock", praise: "Du har övat talen ett till tio!" },
  { id: "siffror-2", title: "Elva till tjugo", emoji: "🔢", scene: "chalk", category: "numbers", bands: [3, 4], gift: "garland-numbers", praise: "Du har övat talen elva till tjugo!" },
];

/** Hyllan för ett band: "🌱 Första stegen" osv. */
function bandShelf(band: Band, ids: StickerId[]): BookShelf {
  const b = BANDS[band - 1];
  return { label: b.title, icon: b.icon, ids, band };
}

/** Orden i (kategori, band) i CONCEPTS-ordning. */
function wordsIn(category: Category, band: Band): StickerId[] {
  return CONCEPTS.filter((c) => c.category === category && c.level === band).map((c) => wordId(c.id));
}

const coveredWords = new Set(WORD_PAGE_DEFS.flatMap((d) => d.bands.map((b) => `${d.category}:${b}`)));

const WORD_PAGES: BookPage[] = WORD_PAGE_DEFS.map((d) => ({
  id: d.id,
  group: "ord",
  title: d.title,
  emoji: d.emoji,
  scene: d.scene,
  shelves: d.bands.map((b) => bandShelf(b, wordsIn(d.category, b))),
  gift: d.gift,
  praise: d.praise,
}));

/** "Fler ord": ord som ingen sida täcker (finns bara när den inte är tom). */
const MORE_WORDS: BookPage[] = (() => {
  const shelves = BANDS.map((b) =>
    bandShelf(
      b.band,
      CONCEPTS.filter((c) => !coveredWords.has(`${c.category}:${c.level}`) && c.level === b.band).map((c) =>
        wordId(c.id)
      )
    )
  ).filter((s) => s.ids.length > 0);
  if (!shelves.length) return [];
  return [{ id: "mer", group: "ord", title: "Fler ord", emoji: "🌟", scene: "plain", shelves, praise: "Du har övat alla orden här!" }];
})();

// ── Bokstavsboken: 5 affischer ──────────────────────────────────────────

const POSTER_DEFS: { lang: LangCode; title: string; langName: string }[] = [
  { lang: "sv", title: "ABC på svenska", langName: "svenska" },
  { lang: "en", title: "ABC på engelska", langName: "engelska" },
  { lang: "el", title: "ΑΒΓ på grekiska", langName: "grekiska" },
  { lang: "ru", title: "АБВ på ryska", langName: "ryska" },
  { lang: "ar", title: "ابت på arabiska", langName: "arabiska" },
];

const POSTER_PAGES: BookPage[] = POSTER_DEFS.map(({ lang, title, langName }) => ({
  id: `abc-${lang}`,
  group: "bokstaver",
  title,
  emoji: "✏️",
  scene: "poster",
  lang,
  shelves: [
    { label: "Bokstäver", icon: "✏️", ids: ALPHABETS[lang].upper.map((_, i) => letterId(lang, i)) },
    { label: "Siffror", icon: "🔢", ids: ALPHABETS[lang].digits.map((_, d) => digitId(lang, d)) },
  ],
  gift: `garland-abc-${lang}`,
  praise: `Du har spårat alla bokstäver och siffror på ${langName}!`,
}));

// ── Räknetåget och Pärlbandet ───────────────────────────────────────────

/**
 * Vagnarnas etiketter. SPEGLAR konstanterna i MathGame.tsx (PLUS_MAX, MINUS_MAX,
 * TIMES_TABLES, DIV_TABLES och opFor) – håll dem i synk om matten ändras.
 */
export const WAGON_LABELS: string[] = [
  "+ upp till 5", "+ upp till 8", "+ upp till 10", "+ upp till 15", "+ upp till 20",
  "− från 5", "− från 8", "− från 10", "− från 15", "− från 20",
  "× 1, 2", "× 2, 3", "× 2, 3, 5", "× 2–5, 10", "× 2–10",
  "÷ 2", "÷ 2, 3", "÷ 2, 3, 5", "÷ 2–5, 10", "Mix + − × ÷",
];

/**
 * Största antalet på Räkna!-nivå L. SPEGLAR `rangeFor` i CountingGame.tsx
 * (hi = min(20, round(3 + (L−1)·17/19))) – håll dem i synk.
 */
export function countingMax(level: Level): number {
  return Math.min(20, Math.round(3 + (level - 1) * (17 / 19)));
}

const levelRange = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const TRAIN_SHELVES: { label: string; icon: string }[] = [
  { label: "Plus", icon: "➕" },
  { label: "Minus", icon: "➖" },
  { label: "Gånger", icon: "✖️" },
  { label: "Delat & Mix", icon: "➗" },
];

const COUNT_PAGES: BookPage[] = [
  {
    id: "rakna-tag",
    group: "rakna",
    title: "Räknetåget",
    emoji: "🚂",
    scene: "rails",
    shelves: TRAIN_SHELVES.map((s, i) => ({
      ...s,
      ids: levelRange(i * LEVELS_PER_BAND + 1, (i + 1) * LEVELS_PER_BAND).map(wagonId),
    })),
    gift: "toy-abacus",
    praise: "Du har övat plus, minus, gånger och delat!",
  },
  {
    id: "rakna-parlor",
    group: "rakna",
    title: "Pärlbandet",
    emoji: "🔵",
    scene: "string",
    shelves: BANDS.map((b) =>
      bandShelf(b.band, levelRange((b.band - 1) * LEVELS_PER_BAND + 1, b.band * LEVELS_PER_BAND).map(beadId))
    ),
    gift: "neck-beads",
    praise: "Du har räknat ända upp till tjugo!",
  },
];

// ── Märkeshyllan (härledd) ──────────────────────────────────────────────

const BADGE_PAGE: BookPage = {
  id: "marken",
  group: "marken",
  title: "Märkeshyllan",
  emoji: "🏅",
  scene: "shelf",
  shelves: [{ label: "Spelmärken", icon: "🏅", ids: GAMES.map((g) => medallionKey(g.id)) }],
  praise: "Du har spelat alla spelen!",
  derived: true,
};

// ── Hela boken ──────────────────────────────────────────────────────────

/** Alla sidor i indexordning (bläddringen följer den här ordningen). */
export const BOOK_PAGES: BookPage[] = [...WORD_PAGES, ...MORE_WORDS, ...POSTER_PAGES, ...COUNT_PAGES, BADGE_PAGE];

export const PAGE_BY_ID = new Map<StickerPageId, BookPage>(BOOK_PAGES.map((p) => [p.id, p]));

/** Varje inklistringsbart klistermärke → sin sida (härledda sidor räknas inte). */
export const PAGE_OF_STICKER = new Map<StickerId, StickerPageId>(
  BOOK_PAGES.filter((p) => !p.derived).flatMap((p) => p.shelves.flatMap((s) => s.ids.map((id) => [id, p.id] as const)))
);

export const STICKER_IDS: Set<StickerId> = new Set(PAGE_OF_STICKER.keys());

/** Antal platser i boken (379 i dag: 149 ord + 140 bokstäver + 50 siffror + 20 vagnar + 20 pärlor). */
export const TOTAL_SLOTS = STICKER_IDS.size;

// ── Övrigt ──────────────────────────────────────────────────────────────

/**
 * Emoji som saknas på äldre system (Emoji 12: 🧃🧅🧄🧈 – faller även på
 * Android 9 / Fire OS 7; Emoji 13–15: resten). De ritas som WordBlob om
 * `supportsEmoji()` säger nej.
 */
export const TOFU_RISK: Set<string> = new Set(["🧃", "🧅", "🧄", "🧈", "🫐", "🫒", "🫑", "🫀", "🫁", "🫘", "🫛", "🫚"]);

/** Max antal ordklistermärken som ges i efterhand till en befintlig sparning. */
export const BACKFILL_WORD_CAP = 24;

/** Spelen där orden kommer från `lessonWords` (alla stigar, även äventyr/blandad). */
export const WORD_GAMES: Set<GameId> = new Set<GameId>([
  "flashcards",
  "listen",
  "memory",
  "spelling",
  "abc",
  "puzzle",
  "balloon",
  "catapult",
]);

/** "Du övade 5 djurord!" – beröm för processen, aldrig för förmåga. */
export const CATEGORY_PRAISE: Record<WordCategory, string> = {
  animals: "djurord",
  food: "matord",
  fruit: "fruktord",
  vegetables: "grönsaksord",
  vehicles: "fordonsord",
  body: "kroppsord",
  numbers: "sifferord",
};

/** Levande klistermärken: tricket när man trycker på ett inklistrat märke. */
export type StickerTrick = "hop" | "drive" | "roll" | "wobble" | "wiggle" | "bounce" | "flip" | "chug" | "spin" | "sheen";

export const TRICK_BY_FAMILY: Record<WordCategory | Exclude<StickerFamily, "word"> | "medallion", StickerTrick> = {
  animals: "hop",
  vehicles: "drive",
  fruit: "roll",
  vegetables: "roll",
  food: "wobble",
  body: "wiggle",
  numbers: "bounce",
  letter: "flip",
  digit: "bounce",
  wagon: "chug",
  bead: "spin",
  medallion: "sheen",
};

/** Tricket för ett klistermärke (ord efter kategori, övriga efter familj). */
export function stickerTrick(id: StickerId): StickerTrick | null {
  if (id.startsWith("s:")) return TRICK_BY_FAMILY.medallion;
  const p = parseStickerId(id);
  if (!p) return null;
  if (p.family !== "word") return TRICK_BY_FAMILY[p.family];
  return p.concept.category === "blandad" ? "bounce" : TRICK_BY_FAMILY[p.concept.category];
}

/** Svenskt namn: "katt", "Bokstaven A", "Siffran 3", "Vagn 7: − från 8", "Pärla 5: till 7". */
export function stickerName(id: StickerId): string {
  const p = parseStickerId(id);
  if (!p) return "";
  switch (p.family) {
    case "word":
      return p.concept.labels.sv ?? p.conceptId;
    case "letter":
      return `Bokstaven ${ALPHABETS[p.lang].upper[p.index]}`;
    case "digit":
      return `Siffran ${p.digit}`;
    case "wagon":
      return `Vagn ${p.level}: ${WAGON_LABELS[p.level - 1]}`;
    case "bead":
      return `Pärla ${p.level}: till ${countingMax(p.level)}`;
  }
}

// ── DEV-kontroll ────────────────────────────────────────────────────────

/**
 * Kastar om boken är inkonsekvent. Körs automatiskt i DEV (längst ner) och
 * från scripts/check-rewards.ts.
 */
export function assertStickerCatalog(): void {
  const errors: string[] = [];

  const pageIds = new Set<string>();
  for (const p of BOOK_PAGES) {
    if (pageIds.has(p.id)) errors.push(`sidan ${p.id} finns två gånger`);
    pageIds.add(p.id);
  }

  // varje (kategori, band) täcks av högst en ordsida
  const seenCover = new Set<string>();
  for (const d of WORD_PAGE_DEFS)
    for (const b of d.bands) {
      const k = `${d.category}:${b}`;
      if (seenCover.has(k)) errors.push(`${k} täcks av flera sidor`);
      seenCover.add(k);
    }
  for (const c of REAL_CATEGORIES)
    if (!WORD_PAGE_DEFS.some((d) => d.category === c)) errors.push(`kategorin ${c} har ingen ordsida`);

  // varje inklistringsbart klistermärke finns på exakt en sida och är giltigt
  const count = new Map<StickerId, number>();
  for (const p of BOOK_PAGES) {
    if (p.derived) continue;
    for (const s of p.shelves)
      for (const id of s.ids) {
        count.set(id, (count.get(id) ?? 0) + 1);
        if (!parseStickerId(id)) errors.push(`ogiltigt id ${id} på ${p.id}`);
      }
  }
  for (const [id, n] of count) if (n !== 1) errors.push(`${id} finns på ${n} sidor`);

  // varje ord finns på exakt en sida (eller "Fler ord")
  for (const c of CONCEPTS) if (count.get(wordId(c.id)) !== 1) errors.push(`ordet ${c.id} saknar sida`);

  // en gåva per sida, och samma gåva aldrig på två sidor
  const gifts = new Set<ItemId>();
  for (const p of BOOK_PAGES) {
    if (!p.gift) continue;
    if (gifts.has(p.gift)) errors.push(`gåvan ${p.gift} finns på flera sidor`);
    gifts.add(p.gift);
  }

  if (WAGON_LABELS.length !== LEVEL_COUNT) errors.push("WAGON_LABELS ska ha 20 etiketter");
  if (!STICKER_IDS.has(OWL_STICKER)) errors.push("Nabus klistermärke w:owl saknas i boken");

  if (errors.length) throw new Error(`[stickers] ${errors.join("; ")}`);
}

if (import.meta.env.DEV) assertStickerCatalog();
