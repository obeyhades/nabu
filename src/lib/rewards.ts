/**
 * Ren belöningslogik för klistermärkesboken och Nabus bo.
 * Ingen React, inga stores och inget import.meta – kan köras med bun
 * (scripts/check-rewards.ts). Allt är deterministiskt: ingen slump.
 */
import type {
  Band,
  GameDefinition,
  GameId,
  ItemId,
  LangCode,
  Level,
  Met,
  NestItem,
  NestSlot,
  OwnedItem,
  OwnedSticker,
  Reveal,
  StickerId,
  StickerPageId,
  WearSlot,
} from "../types";
import { CATEGORIES, CONCEPTS, REAL_CATEGORIES } from "../data/concepts";
import { ALPHABETS, fixedTraceItems, type TraceLevel } from "../data/alphabets";
import { LANGUAGES } from "../data/languages";
import { GAMES } from "../data/gameRegistry";
import { bandOf, LEVEL_COUNT, LEVELS_PER_BAND } from "../data/levels";
import {
  BACKFILL_WORD_CAP,
  CATEGORY_PRAISE,
  CONCEPT_BY_ID,
  CONCEPT_INDEX,
  OWL_STICKER,
  PAGE_BY_ID,
  PAGE_OF_STICKER,
  STICKER_IDS,
  WORD_GAMES,
  beadId,
  digitId,
  letterId,
  wagonId,
  wordId,
  type BookPage,
  type WordCategory,
} from "../data/stickers";
import { ITEM_BY_ID, isStarter, slotsFor } from "../data/nestItems";
import { parseLessonKey, pathsFor } from "./progress";

type OwnedStickers = Record<StickerId, OwnedSticker>;

const CATEGORY_IDS = CATEGORIES.map((c) => c.id); // inkl. "blandad"
const LANG_CODES = LANGUAGES.map((l) => l.code);
const BAND_LIST: Band[] = [1, 2, 3, 4];

const unique = <T>(xs: T[]): T[] => [...new Set(xs)];

// ── Lektionen ───────────────────────────────────────────────────────────

export type LessonInput = {
  game: GameId;
  category: string;
  level: Level;
  gold: boolean;
  stars: number;
  rounds: number;
  lang: LangCode; // UI-språket, eller spårspråket för trace
  words: string[]; // koncept-id från lastLessonWords (ordspel), annars []
  trace: TraceLevel | null; // lastTraceItems (trace), annars null
};

export type LessonGrant = { id: StickerId; parts?: 1 | 2 | 3; tricky?: 1 };
export type LessonPatch = { id: StickerId; set: { parts?: 1 | 2 | 3; tricky?: 1 } };

export type LessonPlan = {
  today: string;
  grant: LessonGrant[];
  patch: LessonPatch[];
  met: Record<string, Met>; // bara de övade orden, redan sammanslagna med tidigare
  gifts: ItemId[];
  reveal: Omit<Reveal, "n" | "key" | "pouch">;
};

/** Påsen fylls bara med nya bästa stjärnor för exakt den nyckeln (guld är en egen nyckel). */
export function pouchFor(before: Record<string, number>, key: string, stars: number): number {
  return Math.max(0, stars - (before[key] ?? 0));
}

/**
 * Ordkandidater: övade ord som barnet inte har ännu och som högst är ett band
 * över nivån, lättaste först (band, sedan CONCEPTS-ordning). Returnerar koncept-id.
 */
export function wordCandidates(practised: string[], level: Level, owned: OwnedStickers): string[] {
  const band = bandOf(level);
  return unique(practised)
    .filter((id) => {
      const c = CONCEPT_BY_ID.get(id);
      return !!c && !owned[wordId(id)] && c.level <= band + 1;
    })
    .sort(
      (a, b) =>
        CONCEPT_BY_ID.get(a)!.level - CONCEPT_BY_ID.get(b)!.level ||
        CONCEPT_INDEX.get(a)! - CONCEPT_INDEX.get(b)!
    );
}

/** Antal ord att välja mellan: 2 på band 1–2, 3 på band 3–4. */
export function wordOptionCount(level: Level): number {
  return bandOf(level) <= 2 ? 2 : 3;
}

/** Koncept-id för ett spårat ord – samma regel som TraceGame (exakt etikett på språket). */
export function conceptIdByLabel(lang: LangCode, label: string): string | undefined {
  return CONCEPTS.find((c) => c.labels[lang] === label)?.id;
}

const mergeParts = (a: 1 | 2 | 3 | undefined, b: 1 | 2 | 3): 1 | 2 | 3 => ((a ?? 0) | b) as 1 | 2 | 3;

/**
 * Bokstäver och siffror från en spårlektion.
 * Tecken → index: finns i `upper` ⇒ del 1 (3 om språket saknar gemener),
 * annars index i `lower` ⇒ del 2. Nivå 13–15 ger också Kluring-ramen (tricky).
 * Nivå 16–20 (ord) ger inget här – orden går genom ordregeln.
 */
export function traceGrants(
  lang: LangCode,
  level: Level,
  items: string[],
  owned: OwnedStickers
): Pick<LessonPlan, "grant" | "patch"> & { upgrades: Reveal["upgrades"] } {
  const out: Pick<LessonPlan, "grant" | "patch"> & { upgrades: Reveal["upgrades"] } = {
    grant: [],
    patch: [],
    upgrades: [],
  };
  const a = ALPHABETS[lang];
  if (!a || level > 15) return out;

  if (level === 11 || level === 12) {
    for (const ch of unique(items)) {
      const d = a.digits.indexOf(ch);
      if (d < 0) continue;
      const id = digitId(lang, d);
      if (!owned[id]) out.grant.push({ id });
    }
    return out;
  }

  // Samla först per bokstav – "B" och "b" i samma lektion blir en ruta "Bb"
  const traced = new Map<StickerId, 1 | 2 | 3>();
  for (const ch of items) {
    const up = a.upper.indexOf(ch);
    const low = up < 0 && a.lower ? a.lower.indexOf(ch) : -1;
    if (up < 0 && low < 0) continue;
    const id = letterId(lang, up >= 0 ? up : low);
    traced.set(id, mergeParts(traced.get(id), up >= 0 ? (a.lower ? 1 : 3) : 2));
  }

  const tricky = level >= 13;
  for (const [id, part] of traced) {
    const have = owned[id];
    if (!have) {
      out.grant.push(tricky ? { id, parts: part, tricky: 1 } : { id, parts: part });
      continue;
    }
    const set: LessonPatch["set"] = {};
    const parts = mergeParts(have.parts, part);
    if (parts !== have.parts) {
      set.parts = parts;
      if (parts === 3) out.upgrades.push({ s: id, kind: "lower" });
    }
    if (tricky && !have.tricky) {
      set.tricky = 1;
      out.upgrades.push({ s: id, kind: "tricky" });
    }
    if (set.parts || set.tricky) out.patch.push({ id, set });
  }
  return out;
}

// ── Märkeshyllan (härledd ur stjärnorna) ────────────────────────────────

/** Alla 5 nivåer i bandet har minst 1 vanlig stjärna på stigen. */
function bandDone(stars: Record<string, number>, game: GameId, path: string, band: Band): boolean {
  for (let s = 1; s <= LEVELS_PER_BAND; s++) {
    if (!((stars[`${game}:${path}:${(band - 1) * LEVELS_PER_BAND + s}`] ?? 0) > 0)) return false;
  }
  return true;
}

/** Spelets stigar: äventyr + alla kategorier (inkl. blandad), "all", eller ett per spårspråk. */
const pathsOf = (game: GameDefinition): string[] => pathsFor(game, CATEGORY_IDS, LANG_CODES);

/** Banden som är helt klara på någon stig i spelet (alla spårspråk räknas). */
export function badgeBands(stars: Record<string, number>, game: GameDefinition): Band[] {
  const paths = pathsOf(game);
  return BAND_LIST.filter((band) => paths.some((p) => bandDone(stars, game.id, p, band)));
}

/** Spelmärket lyser när spelet har minst en vanlig avklarad nivå. */
export function medallionLit(stars: Record<string, number>, game: GameDefinition): boolean {
  for (const p of pathsOf(game))
    for (let l = 1; l <= LEVEL_COUNT; l++) if ((stars[`${game.id}:${p}:${l}`] ?? 0) > 0) return true;
  return false;
}

const allGamesHave = (stars: Record<string, number>, band: Band) =>
  GAMES.every((g) => pathsOf(g).some((p) => bandDone(stars, g.id, p, band)));

/** Medaljen: alla 11 spelmärken har 🌱-ram. */
export function medalOk(stars: Record<string, number>): boolean {
  return allGamesHave(stars, 1);
}

/** Mästarkronan: alla 11 spelmärken har 👑-ram. */
export function crownOk(stars: Record<string, number>): boolean {
  return allGamesHave(stars, 4);
}

/**
 * Märkeshyllans gåvor för en befintlig sparning (engångssådden). En sparning
 * som redan uppfyller villkoret när uppdateringen kommer kan aldrig "korsa" det
 * i en lektion – utan det här skulle gåvan aldrig gå att få.
 */
export function seedGifts(stars: Record<string, number>): ItemId[] {
  const gifts: ItemId[] = [];
  if (medalOk(stars)) gifts.push("neck-medal");
  if (crownOk(stars)) gifts.push("hat-crown");
  return gifts;
}

// ── Beröm (process, aldrig förmåga) ─────────────────────────────────────

/** "A, B och C" */
function listSv(xs: string[]): string {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} och ${xs[xs.length - 1]}`;
}

export function praiseFor(i: LessonInput, nWords: number, traced: string[]): string {
  let line: string;
  if (i.game === "math") line = `Du löste ${i.rounds} tal!`;
  else if (i.game === "counting") line = `Du räknade ${i.rounds} gånger!`;
  else if (i.game === "trace") {
    if (i.level >= 16) line = `Du spårade ${traced.length || i.rounds} ord!`;
    else line = traced.length ? `Du spårade ${listSv(traced)}!` : `Du spårade ${i.rounds} bokstäver!`;
  } else if (nWords <= 0) line = "Bra övat!";
  else if (i.category === "adventure" || i.category === "blandad") line = `Du övade ${nWords} ord på äventyret!`;
  else {
    const kind = CATEGORY_PRAISE[i.category as WordCategory];
    line = kind ? `Du övade ${nWords} ${kind}!` : `Du övade ${nWords} ord!`;
  }
  return i.stars === 1 ? `Du gav inte upp! ${line}` : line;
}

// ── Planen för en avklarad lektion ──────────────────────────────────────

/** Mastery: lägg till spel, språk och guld för ett övat ord. */
function nextMet(prev: Met | undefined, game: GameId, lang: LangCode, gold: boolean): Met {
  const g = prev?.g ?? [];
  const l = prev?.l ?? [];
  const m: Met = { g: g.includes(game) ? g : [...g, game], l: l.includes(lang) ? l : [...l, lang] };
  if (prev?.gold || gold) m.gold = 1;
  return m;
}

/**
 * Allt som en avklarad lektion ger, räknat i förväg (inget skrivs här).
 * `before`/`after` = profilens stjärnor före och efter addStars.
 */
export function planLesson(
  i: LessonInput,
  st: { owned: OwnedStickers; met: Record<string, Met> },
  before: Record<string, number>,
  after: Record<string, number>,
  today: string
): LessonPlan {
  const grant: LessonGrant[] = [];
  const patch: LessonPatch[] = [];
  const upgrades: Reveal["upgrades"] = [];
  const rain: StickerId[] = [];
  const met: Record<string, Met> = {};
  let word: Reveal["word"] = null;
  let practised: string[] = [];
  let traced: string[] = [];

  if (WORD_GAMES.has(i.game)) {
    practised = unique(i.words).filter((id) => CONCEPT_BY_ID.has(id));
  } else if (i.game === "trace") {
    if (i.level >= 16) {
      traced = i.trace?.items ?? [];
      practised = unique(traced.map((l) => conceptIdByLabel(i.lang, l)).filter((id): id is string => !!id));
    } else {
      // nivå 1–12 är fasta; 13–15 slumpas och ger inget utan inspelning
      traced = i.trace?.items ?? (i.level <= 12 ? fixedTraceItems(i.lang, i.level) : null) ?? [];
      const t = traceGrants(i.lang, i.level, traced, st.owned);
      grant.push(...t.grant);
      patch.push(...t.patch);
      upgrades.push(...t.upgrades);
      rain.push(...t.grant.map((g) => g.id));
    }
  } else if (i.game === "math" || i.game === "counting") {
    const id = i.game === "math" ? wagonId(i.level) : beadId(i.level);
    if (!st.owned[id]) {
      grant.push({ id });
      rain.push(id);
    }
  }

  // Ordregeln: högst ett nytt ord, lättaste först, valbart bland 2–3
  const candidates = wordCandidates(practised, i.level, st.owned);
  if (candidates.length) {
    const chosen = wordId(candidates[0]);
    grant.push({ id: chosen });
    word = {
      chosen,
      options: candidates.length >= 2 ? candidates.slice(0, wordOptionCount(i.level)).map(wordId) : [],
    };
  }
  const allKnown = WORD_GAMES.has(i.game) && practised.length > 0 && candidates.length === 0;

  // Mastery för alla övade ord; uppgraderingschips bara för ord som redan fanns
  for (const id of practised) {
    const prev = st.met[id];
    const next = nextMet(prev, i.game, i.lang, i.gold);
    met[id] = next;
    const sid = wordId(id);
    if (!st.owned[sid]) continue;
    if (!isBlank(prev) && isBlank(next)) upgrades.push({ s: sid, kind: "blank" });
    if (!prev?.gold && next.gold) upgrades.push({ s: sid, kind: "gold" });
  }

  // Märkeshyllan: jämför före/efter för just det här spelet
  const badges: Reveal["badges"] = [];
  const gifts: ItemId[] = [];
  const game = GAMES.find((g) => g.id === i.game);
  if (game) {
    if (!medallionLit(before, game) && medallionLit(after, game)) badges.push({ game: game.id, band: 0 });
    const had = badgeBands(before, game);
    const crossed = badgeBands(after, game).filter((b) => !had.includes(b));
    for (const band of crossed) badges.push({ game: game.id, band });
    // spelets band korsades nu ⇒ före var det inte uppfyllt för alla spel
    if (crossed.includes(1) && medalOk(after)) gifts.push("neck-medal");
    if (crossed.includes(4) && crownOk(after)) gifts.push("hat-crown");
  }

  return {
    today,
    grant,
    patch,
    met,
    gifts,
    reveal: {
      word,
      rain,
      upgrades,
      badges,
      gifts,
      praise: praiseFor(i, practised.length, traced),
      allKnown,
    },
  };
}

// ── Efterhandsgåvor till en befintlig sparning ──────────────────────────

/**
 * Klistermärken för det barnet redan klarat (körs en gång per enhet).
 * Läser bara vanliga nycklar med värde > 0. Allt utom Nabus uggla väntar i kuvertet.
 */
export function backfillStickers(stars: Record<string, number>, today: string): OwnedStickers {
  const wagons = new Set<Level>();
  const beads = new Set<Level>();
  const traces: { lang: LangCode; level: Level }[] = [];
  const cleared = new Map<string, Set<string>>(); // "kategori:band" → avklarade "spel:nivå"
  const mixed = new Map<Band, number>(); // äventyr/blandad-nycklar per band

  for (const [key, value] of Object.entries(stars)) {
    if (!(value > 0)) continue;
    const k = parseLessonKey(key);
    if (!k || k.gold) continue;
    if (k.game === "math" && k.category === "all") wagons.add(k.level);
    else if (k.game === "counting" && k.category === "all") beads.add(k.level);
    else if (k.game === "trace" && k.level <= 12) {
      const lang = k.category.slice("trace-".length);
      if (k.category.startsWith("trace-") && (LANG_CODES as string[]).includes(lang))
        traces.push({ lang: lang as LangCode, level: k.level });
    } else if (WORD_GAMES.has(k.game)) {
      const band = bandOf(k.level);
      if (k.category === "adventure" || k.category === "blandad") mixed.set(band, (mixed.get(band) ?? 0) + 1);
      else if ((REAL_CATEGORIES as string[]).includes(k.category)) {
        const ck = `${k.category}:${band}`;
        const set = cleared.get(ck) ?? new Set<string>();
        set.add(`${k.game}:${k.level}`);
        cleared.set(ck, set);
      }
    }
  }

  // Ord: per band, först varje kategoris egna nivåer, sedan äventyr/blandad
  // ett ord i taget runt kategorierna (fulla hyllor hoppas över).
  const words: string[] = [];
  for (const band of BAND_LIST) {
    const shelves = REAL_CATEGORIES.map((cat) => CONCEPTS.filter((c) => c.category === cat && c.level === band));
    const take = REAL_CATEGORIES.map((cat, ci) =>
      Math.min(cleared.get(`${cat}:${band}`)?.size ?? 0, shelves[ci].length)
    );
    let extra = mixed.get(band) ?? 0;
    while (extra > 0) {
      let moved = false;
      for (let ci = 0; ci < shelves.length && extra > 0; ci++) {
        if (take[ci] >= shelves[ci].length) continue;
        take[ci]++;
        extra--;
        moved = true;
      }
      if (!moved) break;
    }
    // slå ihop runt kategorierna: första ordet i varje, sedan andra …
    const most = Math.max(0, ...take);
    for (let n = 0; n < most; n++)
      for (let ci = 0; ci < shelves.length; ci++) if (n < take[ci]) words.push(shelves[ci][n].id);
  }

  const owned: OwnedStickers = { [OWL_STICKER]: { at: today, p: 1, via: "gift" } };
  const add = (g: LessonGrant) => {
    if (owned[g.id]) return;
    owned[g.id] = { at: today, p: 0, via: "backfill" };
    if (g.parts) owned[g.id].parts = g.parts;
    if (g.tricky) owned[g.id].tricky = g.tricky;
  };

  for (const id of words.filter((w) => wordId(w) !== OWL_STICKER).slice(0, BACKFILL_WORD_CAP)) add({ id: wordId(id) });
  for (const l of [...wagons].sort((a, b) => a - b)) add({ id: wagonId(l) });
  for (const l of [...beads].sort((a, b) => a - b)) add({ id: beadId(l) });

  traces.sort((a, b) => LANG_CODES.indexOf(a.lang) - LANG_CODES.indexOf(b.lang) || a.level - b.level);
  for (const t of traces) {
    const r = traceGrants(t.lang, t.level, fixedTraceItems(t.lang, t.level) ?? [], owned);
    r.grant.forEach(add);
    for (const p of r.patch) owned[p.id] = { ...owned[p.id], ...p.set };
  }
  return owned;
}

// ── Boken ───────────────────────────────────────────────────────────────

/** Platserna på sidan som går att klistra in (härledda sidor har inga). */
const slotsOf = (page: BookPage): StickerId[] =>
  page.derived ? [] : page.shelves.flatMap((s) => s.ids).filter((id) => STICKER_IDS.has(id));

export function pageProgress(page: BookPage, owned: OwnedStickers): { placed: number; owned: number; total: number } {
  const ids = slotsOf(page);
  let have = 0;
  let placed = 0;
  for (const id of ids) {
    if (!owned[id]) continue;
    have++;
    if (owned[id].p === 1) placed++;
  }
  return { placed, owned: have, total: ids.length };
}

/** Sidan är klar när varje plats är inklistrad (en tom sida är aldrig klar). */
export function pageComplete(page: BookPage, owned: OwnedStickers): boolean {
  const ids = slotsOf(page);
  return ids.length > 0 && ids.every((id) => owned[id]?.p === 1);
}

/** Kuvertet: väntande klistermärken som har en sida, i den ordning de kom. */
export function trayIds(owned: OwnedStickers): StickerId[] {
  return Object.keys(owned).filter((id) => owned[id].p === 0 && PAGE_OF_STICKER.has(id));
}

/** Blank = ordet har övats i minst 3 olika spel. */
export function isBlank(m?: Met): boolean {
  return (m?.g.length ?? 0) >= 3;
}

/** Bytet i vinstskärmens valrad: bara medan det gamla väntar och det nya fanns bland valen. */
export function canChoose(owned: OwnedStickers, oldId: StickerId, newId: StickerId, options: StickerId[]): boolean {
  return owned[oldId]?.p === 0 && options.includes(newId) && !owned[newId];
}

/** Rensa en sparad bok: placerade märken försvinner aldrig (okända behålls men döljs). */
export function sanitizeStickers<
  T extends { owned: OwnedStickers; met: Record<string, Met>; donePages: StickerPageId[] },
>(s: T): T {
  const owned: OwnedStickers = {};
  for (const [id, o] of Object.entries(s.owned ?? {}))
    if (o && (STICKER_IDS.has(id) || o.p === 1)) owned[id] = o;
  const met: Record<string, Met> = {};
  for (const [id, m] of Object.entries(s.met ?? {})) if (CONCEPT_BY_ID.has(id) && m) met[id] = m;
  const donePages = (s.donePages ?? []).filter((p) => PAGE_BY_ID.has(p));
  return { ...s, owned, met, donePages };
}

// ── Boet och påsen ──────────────────────────────────────────────────────

type NestCore = { earned: number; owned: Record<ItemId, OwnedItem> };

/** Det som lagts i saker (bara köp – gåvor kostar 0). Härlett, så det kan aldrig glida isär. */
export function spentOf(s: Pick<NestCore, "owned">): number {
  let sum = 0;
  for (const o of Object.values(s.owned)) if (o?.via === "buy" && o.paid > 0) sum += o.paid;
  return sum;
}

/** Stjärnor i påsen = intjänat − köpt. Lämna tillbaka = ta bort posten = full återbetalning. */
export function balanceOf(s: NestCore): number {
  return Math.max(0, s.earned - spentOf(s));
}

export function isOwnedItem(s: Pick<NestCore, "owned">, id: ItemId): boolean {
  return isStarter(id) || !!s.owned[id];
}

/** Får saken köpas nu? Känd, i Stjärnboden, inte redan ägd och påsen räcker. */
export function canBuy(s: NestCore, id: ItemId): boolean {
  const item = ITEM_BY_ID.get(id);
  return !!item && item.via === "shop" && !isOwnedItem(s, id) && balanceOf(s) >= item.price;
}

/** Saken som Nabu bär på `slot` – null om den är okänd, inte ägd eller av fel sort. */
export function wornItem(
  s: Pick<NestCore, "owned"> & { slots: Partial<Record<NestSlot, ItemId>> },
  slot: WearSlot
): NestItem | null {
  const id = s.slots[slot];
  const item = id ? ITEM_BY_ID.get(id) : undefined;
  if (!item || item.kind !== slot || !isOwnedItem(s, item.id)) return null;
  return item;
}

/** Första lediga platsen för saken (för gåvor och köp), annars null. */
export function firstFreeSlot(item: NestItem, slots: Partial<Record<NestSlot, ItemId>>): NestSlot | null {
  return slotsFor(item).find((slot) => !slots[slot]) ?? null;
}

/**
 * Rensa ett sparat bo: okända saker tas bort (= återbetalas), platser med
 * okänd, inte ägd eller felplacerad sak töms, önskan måste vara en känd och
 * inte ägd butikssak, och växtsteg finns bara för kända saker.
 */
export function sanitizeNest<
  T extends NestCore & {
    slots: Partial<Record<NestSlot, ItemId>>;
    wish: ItemId | null;
    grow: Record<ItemId, 0 | 1 | 2>;
  },
>(s: T): T {
  const owned: Record<ItemId, OwnedItem> = {};
  for (const [id, o] of Object.entries(s.owned ?? {})) if (o && ITEM_BY_ID.has(id)) owned[id] = o;
  const core = { owned };

  const slots: Partial<Record<NestSlot, ItemId>> = {};
  for (const [slot, id] of Object.entries(s.slots ?? {}) as [NestSlot, ItemId | undefined][]) {
    const item = id ? ITEM_BY_ID.get(id) : undefined;
    if (item && isOwnedItem(core, item.id) && slotsFor(item).includes(slot)) slots[slot] = item.id;
  }

  const wishItem = s.wish ? ITEM_BY_ID.get(s.wish) : undefined;
  const wish = wishItem && wishItem.via === "shop" && !isOwnedItem(core, wishItem.id) ? wishItem.id : null;

  const grow: Record<ItemId, 0 | 1 | 2> = {};
  for (const [id, g] of Object.entries(s.grow ?? {})) if (ITEM_BY_ID.has(id) && (g === 0 || g === 1 || g === 2)) grow[id] = g;

  return { ...s, owned, slots, wish, grow };
}
