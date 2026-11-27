/**
 * Kontroll av klistermärkesbokens och boets rena logik (spec §9 "Pure checks").
 * Kör: bun run scripts/check-rewards.ts
 * Det finns ingen testlöpare i projektet – det här är vanliga node:assert-kontroller.
 */
import assert from "node:assert/strict";
import type { GameId, LangCode, Met, OwnedItem, OwnedSticker } from "../src/types";
import { GAMES } from "../src/data/gameRegistry";
import { CATEGORIES, CONCEPTS, lastLessonWords, lessonWords } from "../src/data/concepts";
import { ALPHABETS, fixedTraceItems, lastTraceItems, traceLevel } from "../src/data/alphabets";
import { LANGUAGES } from "../src/data/languages";
import { LEVEL_COUNT } from "../src/data/levels";
import { goldStarKey, migrateStarsV1, parseLessonKey, pathsFor, starKey, sumStars } from "../src/lib/progress";
import {
  BOOK_PAGES,
  OWL_STICKER,
  PAGE_BY_ID,
  PAGE_OF_STICKER,
  STICKER_IDS,
  TOTAL_SLOTS,
  WAGON_LABELS,
  assertStickerCatalog,
  countingMax,
  parseStickerId,
  stickerName,
} from "../src/data/stickers";
import { NEST_ITEMS, WELCOME_CAP, assertCatalog } from "../src/data/nestItems";
import {
  backfillStickers,
  badgeBands,
  balanceOf,
  canBuy,
  canChoose,
  conceptIdByLabel,
  firstFreeSlot,
  isBlank,
  isOwnedItem,
  medallionLit,
  pageComplete,
  pageProgress,
  planLesson,
  pouchFor,
  sanitizeNest,
  sanitizeStickers,
  seedGifts,
  spentOf,
  trayIds,
  wordCandidates,
  wornItem,
  type LessonInput,
} from "../src/lib/rewards";
import { parseBackup } from "../src/lib/backup";

const TODAY = "2026-11-26";
let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const CAT_IDS = CATEGORIES.map((c) => c.id);
const LANG_CODES = LANGUAGES.map((l) => l.code);
const game = (id: GameId) => GAMES.find((g) => g.id === id)!;
const own = (p: 0 | 1 = 0, extra: Partial<OwnedSticker> = {}): OwnedSticker => ({ at: TODAY, p, ...extra });
const ownedOf = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, own()]));
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

function lesson(over: Partial<LessonInput>): LessonInput {
  return {
    game: "flashcards",
    category: "animals",
    level: 1,
    gold: false,
    stars: 3,
    rounds: 6,
    lang: "sv",
    words: [],
    trace: null,
    ...over,
  };
}
const EMPTY = { owned: {} as Record<string, OwnedSticker>, met: {} as Record<string, Met> };

/** Stjärnor på alla nivåer i ett band på en stig. */
function bandStars(gameId: GameId, path: string, band: number, value = 1, upTo = 5): Record<string, number> {
  const out: Record<string, number> = {};
  for (let s = 1; s <= upTo; s++) out[starKey(gameId, path, (band - 1) * 5 + s)] = value;
  return out;
}
const firstPath = (gameId: GameId) => pathsFor(game(gameId), CAT_IDS, LANG_CODES)[0];

// ── DEV-kontrollerna och katalogen ──────────────────────────────────────

check("DEV-kontroller", () => {
  assertStickerCatalog();
  assertCatalog();
});

check("boken: 379 platser och rätt sidstorlekar", () => {
  assert.equal(TOTAL_SLOTS, 379);
  assert.equal(STICKER_IDS.size, 379);
  assert.equal(BOOK_PAGES.length, 24); // 16 ord + 5 affischer + 2 räkna + märken ("Fler ord" är tom i dag)
  assert.equal(PAGE_BY_ID.has("mer"), false);
  const sizes: Record<string, number[]> = {
    "djur-1": [9], "djur-2": [8], "djur-3": [8], "djur-4": [8],
    "mat-1": [6, 7], "mat-2": [6, 5], "frukt-1": [4, 5], "frukt-2": [6, 4],
    "gron-1": [4, 4], "gron-2": [4, 5], "fordon-1": [5, 5], "fordon-2": [5, 5],
    "kropp-1": [4, 4], "kropp-2": [4, 4], "siffror-1": [5, 5], "siffror-2": [5, 5],
  };
  for (const [id, want] of Object.entries(sizes))
    assert.deepEqual(PAGE_BY_ID.get(id)!.shelves.map((s) => s.ids.length), want, id);
  assert.deepEqual(PAGE_BY_ID.get("djur-1")!.shelves[0].ids.slice(0, 3), ["w:cat", "w:dog", "w:fish"]);
  assert.equal(PAGE_OF_STICKER.get(OWL_STICKER), "djur-4");
  assert.equal(PAGE_BY_ID.get("abc-sv")!.shelves[0].ids.length, 29);
  assert.equal(PAGE_BY_ID.get("abc-ar")!.shelves[0].ids.length, 28);
  assert.equal(PAGE_OF_STICKER.get("d:ru:9"), "abc-ru");
  assert.equal(PAGE_OF_STICKER.get("m:20"), "rakna-tag");
  assert.equal(PAGE_OF_STICKER.get("c:1"), "rakna-parlor");
  assert.equal(PAGE_OF_STICKER.has("s:memory"), false);
});

check("id:n tolkas och namnges", () => {
  assert.deepEqual(parseStickerId("l:sv:28"), { family: "letter", lang: "sv", index: 28 });
  assert.equal(parseStickerId("l:sv:29"), null);
  assert.equal(parseStickerId("w:nope"), null);
  assert.equal(parseStickerId("m:21"), null);
  assert.equal(stickerName("l:sv:0"), "Bokstaven A");
  assert.equal(stickerName("d:sv:3"), "Siffran 3");
  assert.equal(stickerName("m:7"), "Vagn 7: − från 8");
  assert.equal(stickerName("w:cat"), "katt");
});

check("vagnar och pärlor", () => {
  assert.equal(WAGON_LABELS.length, 20);
  assert.equal(WAGON_LABELS[19], "Mix + − × ÷");
  assert.deepEqual(range(1, 20).map(countingMax), [3, 4, 5, 6, 7, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 16, 17, 18, 19, 20]);
});

check("boet: 57 saker, 29 i boden för 691 ⭐, 25 gåvor", () => {
  assert.equal(NEST_ITEMS.length, 57);
  const shop = NEST_ITEMS.filter((i) => i.via === "shop");
  assert.equal(NEST_ITEMS.filter((i) => i.via === "start").length, 3);
  assert.equal(NEST_ITEMS.filter((i) => i.via === "gift").length, 25);
  assert.equal(shop.length, 29);
  assert.equal(shop.reduce((s, i) => s + i.price, 0), 691);
  const ladder = new Set([3, 5, 8, 10, 12, 15, 20, 25, 30, 40, 45, 50, 60, 80]);
  for (const i of shop) assert.ok(ladder.has(i.price), `${i.id} ${i.price}`);
  const tier = (lo: number, hi: number) => shop.filter((i) => i.price >= lo && i.price <= hi);
  assert.deepEqual([tier(1, 5), tier(8, 15), tier(20, 30), tier(40, 50), tier(60, 80)].map((t) => t.length), [6, 10, 6, 4, 3]);
  assert.deepEqual([tier(1, 5), tier(8, 15), tier(20, 30), tier(40, 50), tier(60, 80)].map((t) => t.reduce((s, i) => s + i.price, 0)), [26, 120, 150, 175, 220]);
  assert.equal(WELCOME_CAP, 60);
});

check("spårnivåernas fasta bitar", () => {
  const sv = range(1, 5).map((l) => fixedTraceItems("sv", l)!.join(""));
  assert.deepEqual(sv, ["ABCDEF", "GHIJKL", "MNOPQ", "RSTUVW", "XYZÅÄÖ"]);
  assert.deepEqual(range(6, 10).map((l) => fixedTraceItems("sv", l)!.join("")), ["abcdef", "ghijkl", "mnopq", "rstuvw", "xyzåäö"]);
  assert.deepEqual(range(1, 10).map((l) => fixedTraceItems("ar", l)!.join("")), ["ابت", "ثجح", "خد", "ذرز", "سشص", "ضطظ", "عغف", "قك", "لمن", "هوي"]);
  assert.equal(fixedTraceItems("sv", 13), null);
  // alla bitar ryms i TraceGames MAX_ROUNDS = 7
  for (const lang of LANG_CODES) for (const l of range(1, 12)) assert.ok(fixedTraceItems(lang, l)!.length <= 7, `${lang} ${l}`);
});

check("senaste spårnivån och lektionsorden spelas in", () => {
  const built = traceLevel("el", 13);
  assert.deepEqual(lastTraceItems("el", 13), built);
  assert.equal(lastTraceItems("el", 14), null);
  assert.equal(lastTraceItems("sv", 13), null);
  fixedTraceItems("sv", 1); // spelas inte in
  assert.deepEqual(lastTraceItems("el", 13), built);

  const words = lessonWords("animals", 1, 5).map((c) => c.id);
  assert.deepEqual(new Set(lastLessonWords("animals")), new Set(words));
  const mix = lessonWords("adventure", 7, 6).map((c) => c.id);
  assert.deepEqual(new Set(lastLessonWords("adventure")), new Set(mix));
  assert.deepEqual(new Set(lastLessonWords("blandad")), new Set(mix));
});

// ── 1. parseLessonKey ───────────────────────────────────────────────────

check("parseLessonKey", () => {
  assert.deepEqual(parseLessonKey("trace:trace-ar:13:gold"), { game: "trace", category: "trace-ar", level: 13, gold: true });
  assert.deepEqual(parseLessonKey("math:all:20"), { game: "math", category: "all", level: 20, gold: false });
  assert.equal(parseLessonKey("memory:animals:21"), null);
  assert.equal(parseLessonKey("x:y"), null);
  assert.equal(parseLessonKey("memory:animals:0"), null);
  assert.equal(parseLessonKey("memory:animals:2.5"), null);
  assert.equal(parseLessonKey("memory:animals:3:silver"), null);
  assert.equal(parseLessonKey("chess:all:3"), null);
  assert.equal(parseLessonKey("memory:animals:3:gold:x"), null);
  assert.equal(sumStars({ a: 3, b: 2, c: Number.NaN, d: -1 }), 5);
});

// ── 2. Ordregeln ────────────────────────────────────────────────────────

check("wordCandidates: lättaste okända först", () => {
  const owned = ownedOf("w:cat");
  assert.deepEqual(wordCandidates(["cat", "mouse", "horse"], 1, owned), ["mouse", "horse"]);
  assert.deepEqual(wordCandidates(["horse", "mouse", "mouse"], 1, {}), ["mouse", "horse"]);
  assert.deepEqual(wordCandidates(["hen", "cat"], 1, {}), ["cat", "hen"]); // samma band → CONCEPTS-ordning

  const plan = planLesson(lesson({ words: ["cat", "mouse", "horse"] }), { owned, met: {} }, {}, {}, TODAY);
  assert.deepEqual(plan.reveal.word, { chosen: "w:mouse", options: ["w:mouse", "w:horse"] });
  assert.deepEqual(plan.grant, [{ id: "w:mouse" }]);
  assert.equal(plan.reveal.allKnown, false);
});

check("band 1 erbjuder aldrig L3-ord; band 3 ger 3 val", () => {
  const all = CONCEPTS.map((c) => c.id);
  for (const level of range(1, 5)) {
    const cands = wordCandidates(all, level, {});
    assert.ok(cands.every((id) => CONCEPTS.find((c) => c.id === id)!.level <= 2), `nivå ${level}`);
    assert.equal(planLesson(lesson({ level, words: all }), EMPTY, {}, {}, TODAY).reveal.word!.options.length, 2);
  }
  const plan = planLesson(lesson({ level: 11, words: ["elephant", "giraffe", "penguin", "dolphin"] }), EMPTY, {}, {}, TODAY);
  assert.deepEqual(plan.reveal.word!.options, ["w:elephant", "w:giraffe", "w:penguin"]);
});

check("alla ord ägda → inget nytt, allKnown; en kandidat → inget val", () => {
  const plan = planLesson(lesson({ words: ["cat", "dog"] }), { owned: ownedOf("w:cat", "w:dog"), met: {} }, {}, {}, TODAY);
  assert.equal(plan.reveal.word, null);
  assert.equal(plan.reveal.allKnown, true);
  assert.deepEqual(plan.grant, []);
  assert.equal(planLesson(lesson({ words: [] }), EMPTY, {}, {}, TODAY).reveal.allKnown, false);
  const one = planLesson(lesson({ words: ["cat", "dog"] }), { owned: ownedOf("w:cat"), met: {} }, {}, {}, TODAY);
  assert.deepEqual(one.reveal.word, { chosen: "w:dog", options: [] });
});

// ── 3. Valet på vinstskärmen ────────────────────────────────────────────

check("choose: byte bara när det gamla väntar och det nya är ett val", () => {
  const options = ["w:mouse", "w:horse"];
  assert.equal(canChoose({ "w:mouse": own(0) }, "w:mouse", "w:horse", options), true);
  assert.equal(canChoose({ "w:mouse": own(1) }, "w:mouse", "w:horse", options), false);
  assert.equal(canChoose({ "w:mouse": own(0) }, "w:mouse", "w:dog", options), false);
  assert.equal(canChoose({ "w:mouse": own(0), "w:horse": own(0) }, "w:mouse", "w:horse", options), false);
  assert.equal(canChoose({}, "w:mouse", "w:horse", options), false);
});

// ── Mastery och beröm ───────────────────────────────────────────────────

check("mastery: Blank efter 3 spel, Guldkant efter guld", () => {
  const met: Record<string, Met> = { cat: { g: ["flashcards", "memory"], l: ["sv"] } };
  const owned = ownedOf("w:cat");
  const plan = planLesson(lesson({ game: "listen", words: ["cat", "dog"], gold: true, lang: "en" }), { owned, met }, {}, {}, TODAY);
  assert.deepEqual(plan.met.cat, { g: ["flashcards", "memory", "listen"], l: ["sv", "en"], gold: 1 });
  assert.deepEqual(plan.met.dog, { g: ["listen"], l: ["en"], gold: 1 });
  assert.deepEqual(plan.reveal.upgrades, [
    { s: "w:cat", kind: "blank" },
    { s: "w:cat", kind: "gold" },
  ]);
  assert.ok(isBlank(plan.met.cat) && !isBlank(plan.met.dog) && !isBlank(undefined));
  // samma spel igen: inget nytt chip
  const again = planLesson(lesson({ game: "listen", words: ["cat"] }), { owned, met: plan.met }, {}, {}, TODAY);
  assert.deepEqual(again.reveal.upgrades, []);
});

check("beröm handlar om processen", () => {
  const p = (i: Partial<LessonInput>, words: string[] = []) =>
    planLesson(lesson({ ...i, words }), EMPTY, {}, {}, TODAY).reveal.praise;
  assert.equal(p({}, ["cat", "dog", "fish", "bird", "cow"]), "Du övade 5 djurord!");
  assert.equal(p({ stars: 1 }, ["cat", "dog"]), "Du gav inte upp! Du övade 2 djurord!");
  assert.equal(p({ category: "adventure" }, ["cat", "bread", "car"]), "Du övade 3 ord på äventyret!");
  assert.equal(p({ category: "blandad" }, ["cat", "bread"]), "Du övade 2 ord på äventyret!");
  assert.equal(p({ game: "math", category: "all", rounds: 10 }), "Du löste 10 tal!");
  assert.equal(p({ game: "counting", category: "all", rounds: 8 }), "Du räknade 8 gånger!");
  assert.equal(p({ game: "trace", category: "trace-sv", level: 1 }), "Du spårade A, B, C, D, E och F!");
  assert.equal(p({ game: "trace", category: "trace-sv", level: 16, trace: { items: ["katt", "hund"], kind: "word" } }), "Du spårade 2 ord!");
});

// ── 4. Spåra ────────────────────────────────────────────────────────────

check("spåra sv nivå 1 → versaler, nivå 6 → Aa med 'lower'-chip", () => {
  traceLevel("sv", 1);
  const p1 = planLesson(lesson({ game: "trace", category: "trace-sv", level: 1, trace: lastTraceItems("sv", 1) }), EMPTY, {}, {}, TODAY);
  assert.deepEqual(p1.grant, range(0, 5).map((i) => ({ id: `l:sv:${i}`, parts: 1 })));
  assert.deepEqual(p1.reveal.rain, range(0, 5).map((i) => `l:sv:${i}`));
  assert.equal(p1.reveal.word, null);

  const owned = Object.fromEntries(p1.grant.map((g) => [g.id, own(0, { parts: g.parts })]));
  const p6 = planLesson(lesson({ game: "trace", category: "trace-sv", level: 6 }), { owned, met: {} }, {}, {}, TODAY);
  assert.deepEqual(p6.grant, []);
  assert.deepEqual(p6.patch, range(0, 5).map((i) => ({ id: `l:sv:${i}`, set: { parts: 3 } })));
  assert.deepEqual(p6.reveal.upgrades, range(0, 5).map((i) => ({ s: `l:sv:${i}`, kind: "lower" })));
  assert.deepEqual(p6.reveal.rain, []);
});

check("spåra ar nivå 6 → ضطظ (index 14–16) direkt kompletta", () => {
  const p = planLesson(lesson({ game: "trace", category: "trace-ar", level: 6, lang: "ar" }), EMPTY, {}, {}, TODAY);
  assert.deepEqual(p.grant, [14, 15, 16].map((i) => ({ id: `l:ar:${i}`, parts: 3 })));
});

check("spåra nivå 11–12 → siffror en gång", () => {
  const p = planLesson(lesson({ game: "trace", category: "trace-en", level: 12, lang: "en" }), { owned: ownedOf("d:en:5"), met: {} }, {}, {}, TODAY);
  assert.deepEqual(p.grant.map((g) => g.id), ["d:en:6", "d:en:7", "d:en:8", "d:en:9"]);
  assert.equal(p.reveal.praise, "Du spårade 5, 6, 7, 8 och 9!");
});

check("spåra nivå 15: blandat stor/liten efter tillhörighet + Kluring", () => {
  const trace = { items: ["B", "b", "D", "a"], kind: "lower" as const };
  const owned = { "l:sv:3": own(1, { parts: 2 }) };
  const p = planLesson(lesson({ game: "trace", category: "trace-sv", level: 15, trace }), { owned, met: {} }, {}, {}, TODAY);
  assert.deepEqual(p.grant, [
    { id: "l:sv:1", parts: 3, tricky: 1 },
    { id: "l:sv:0", parts: 2, tricky: 1 },
  ]);
  assert.deepEqual(p.patch, [{ id: "l:sv:3", set: { parts: 3, tricky: 1 } }]);
  assert.deepEqual(p.reveal.upgrades, [
    { s: "l:sv:3", kind: "lower" },
    { s: "l:sv:3", kind: "tricky" },
  ]);
  // utan inspelning ger nivå 13–15 ingenting
  const none = planLesson(lesson({ game: "trace", category: "trace-sv", level: 14 }), EMPTY, {}, {}, TODAY);
  assert.deepEqual(none.grant, []);
});

check("spåra nivå 16–20: orden går genom conceptIdByLabel", () => {
  assert.equal(conceptIdByLabel("ar", "قِطّة"), "cat");
  assert.equal(conceptIdByLabel("sv", "katt"), "cat");
  assert.equal(conceptIdByLabel("sv", "nope"), undefined);
  for (const lang of LANG_CODES as LangCode[])
    for (const level of range(16, 20)) {
      const t = traceLevel(lang, level);
      for (const label of t.items) assert.ok(conceptIdByLabel(lang, label), `${lang} ${level} ${label}`);
      const p = planLesson(lesson({ game: "trace", category: `trace-${lang}`, level, lang, trace: lastTraceItems(lang, level) }), EMPTY, {}, {}, TODAY);
      const ids = t.items.map((l) => `w:${conceptIdByLabel(lang, l)}`);
      assert.ok(p.reveal.word && ids.includes(p.reveal.word.chosen), `${lang} ${level}`);
      assert.ok(Object.keys(p.met).every((id) => p.met[id].l.includes(lang)));
    }
});

// ── 5. Påsen ────────────────────────────────────────────────────────────

check("påsen fylls bara med nya bästa stjärnor", () => {
  const k = starKey("memory", "animals", 3);
  assert.equal(pouchFor({}, k, 3), 3);
  assert.equal(pouchFor({ [k]: 2 }, k, 3), 1);
  assert.equal(pouchFor({ [k]: 3 }, k, 2), 0);
  assert.equal(pouchFor({ [k]: 3 }, k, 3), 0);
  assert.equal(pouchFor({ [k]: 3 }, goldStarKey("memory", "animals", 3), 3), 3);
});

// ── 6. Märkeshyllan ─────────────────────────────────────────────────────

check("band 1 korsas på valfri stig; första klaringen tänder märket", () => {
  for (const path of ["animals", "adventure", "blandad"]) {
    const before = bandStars("memory", path, 1, 2, 4);
    const after = { ...before, [starKey("memory", path, 5)]: 1 };
    const p = planLesson(lesson({ game: "memory", category: path, level: 5 }), EMPTY, before, after, TODAY);
    assert.deepEqual(p.reveal.badges, [{ game: "memory", band: 1 }], path);
    assert.deepEqual(p.gifts, []);
  }
  const lit = planLesson(lesson({ game: "memory" }), EMPTY, {}, { [starKey("memory", "animals", 1)]: 2 }, TODAY);
  assert.deepEqual(lit.reveal.badges, [{ game: "memory", band: 0 }]);
  assert.ok(medallionLit({ [starKey("trace", "trace-ar", 3)]: 1 }, game("trace")));
  assert.ok(!medallionLit({ [goldStarKey("trace", "trace-ar", 3)]: 1 }, game("trace")));
  assert.deepEqual(badgeBands(bandStars("trace", "trace-ru", 3), game("trace")), [3]);
});

check("medaljen bara när det 11:e spelets band 1 blir klart, kronan likadant", () => {
  for (const [band, gift] of [[1, "neck-medal"], [4, "hat-crown"]] as const) {
    const rest = GAMES.filter((g) => g.id !== "trace");
    let before: Record<string, number> = {};
    for (const g of rest) before = { ...before, ...bandStars(g.id, firstPath(g.id), band) };
    before = { ...before, ...bandStars("trace", "trace-ar", band, 1, 4) };
    const lvl = (band - 1) * 5 + 5;
    const after = { ...before, [starKey("trace", "trace-ar", lvl)]: 3 };
    const input = lesson({ game: "trace", category: "trace-ar", level: lvl, lang: "ar" });
    const p = planLesson(input, EMPTY, before, after, TODAY);
    assert.deepEqual(p.gifts, [gift]);
    assert.deepEqual(p.reveal.gifts, [gift]);
    // nästa lektion: redan uppfyllt före → ingen gåva igen
    assert.deepEqual(planLesson(input, EMPTY, after, after, TODAY).gifts, []);
    // bara 10 spel klara: ingen gåva
    const fewer = Object.fromEntries(Object.entries(before).filter(([k]) => !k.startsWith("memory:")));
    assert.deepEqual(planLesson(input, EMPTY, fewer, { ...fewer, [starKey("trace", "trace-ar", lvl)]: 3 }, TODAY).gifts, []);
  }
});

check("engångssådden ger medalj/krona om sparningen redan uppfyller villkoret", () => {
  // v1-sparning: varje spel spelat en gång på gamla nivå 1 → nya nivå 1–5 (band 1)
  const v1: Record<string, number> = {};
  for (const g of GAMES) v1[`${g.id}:${firstPath(g.id)}:1`] = 2;
  const stars = migrateStarsV1(v1);
  assert.deepEqual(seedGifts(stars), ["neck-medal"]);
  // ingen lektion kan längre korsa band 1 – utan sådden vore medaljen omöjlig
  for (const g of GAMES) {
    const lvl = 6;
    const after = { ...stars, [starKey(g.id, firstPath(g.id), lvl)]: 3 };
    assert.deepEqual(planLesson(lesson({ game: g.id, category: firstPath(g.id), level: lvl }), EMPTY, stars, after, TODAY).gifts, []);
  }
  let crown: Record<string, number> = {};
  for (const g of GAMES) crown = { ...crown, ...bandStars(g.id, firstPath(g.id), 1), ...bandStars(g.id, firstPath(g.id), 4) };
  assert.deepEqual(seedGifts(crown), ["neck-medal", "hat-crown"]);
  const fewer = Object.fromEntries(Object.entries(stars).filter(([k]) => !k.startsWith("memory:")));
  assert.deepEqual(seedGifts(fewer), []);
  assert.deepEqual(seedGifts({}), []);
});

check("efter unlockAll: inga märken och ingen medalj/krona", () => {
  const all: Record<string, number> = {};
  for (const g of GAMES)
    for (const path of pathsFor(g, CAT_IDS, LANG_CODES)) for (const l of range(1, LEVEL_COUNT)) all[starKey(g.id, path, l)] = 1;
  const after = { ...all, [starKey("memory", "animals", 5)]: 3 };
  const p = planLesson(lesson({ game: "memory", level: 5 }), EMPTY, all, after, TODAY);
  assert.deepEqual(p.reveal.badges, []);
  assert.deepEqual(p.gifts, []);
  assert.deepEqual(badgeBands(all, game("catapult")), [1, 2, 3, 4]); // ramarna visas som klara

  // prestanda: en sparning med alla nycklar, vanliga + guld (3 160 st), ska planeras snabbt
  const full = { ...after, ...Object.fromEntries(Object.keys(all).map((k) => [`${k}:gold`, 3])) };
  assert.equal(Object.keys(full).length, 3160);
  const t0 = performance.now();
  for (let n = 0; n < 50; n++) planLesson(lesson({ game: "memory", level: 5, words: ["cat", "dog"] }), EMPTY, full, full, TODAY);
  const ms = (performance.now() - t0) / 50;
  assert.ok(ms < 5, `planLesson tog ${ms.toFixed(2)} ms`);
});

check("Matte och Räkna! ger vagn och pärla om de saknas", () => {
  const m = planLesson(lesson({ game: "math", category: "all", level: 7 }), EMPTY, {}, {}, TODAY);
  assert.deepEqual(m.grant, [{ id: "m:7" }]);
  assert.deepEqual(m.reveal.rain, ["m:7"]);
  const c = planLesson(lesson({ game: "counting", category: "all", level: 3 }), { owned: ownedOf("c:3"), met: {} }, {}, {}, TODAY);
  assert.deepEqual(c.grant, []);
  assert.deepEqual(c.reveal.rain, []);
});

// ── 7. Efterhandsgåvor ──────────────────────────────────────────────────

check("backfill: tomma stjärnor → bara ugglan (inklistrad)", () => {
  assert.deepEqual(backfillStickers({}, TODAY), { [OWL_STICKER]: { at: TODAY, p: 1, via: "gift" } });
});

check("backfill: guldnycklar och trasiga nycklar ignoreras", () => {
  const stars = { "math:all:3:gold": 3, "memory:animals:1:gold": 3, "trace:trace-sv:1:gold": 2, "x:y": 3, "memory:animals:2": 0 };
  assert.deepEqual(Object.keys(backfillStickers(stars, TODAY)), [OWL_STICKER]);
});

check("backfill: kategorinivåer + äventyr runt kategorierna", () => {
  const stars = {
    "memory:animals:1": 1,
    "flashcards:animals:2": 2,
    "memory:adventure:1": 1,
    "listen:blandad:2": 1,
  };
  const owned = backfillStickers(stars, TODAY);
  // djur: 2 egna + 1 från äventyret; mat: 1 från blandad; ihopslaget runt kategorierna
  assert.deepEqual(Object.keys(owned), [OWL_STICKER, "w:cat", "w:bread", "w:dog", "w:fish"]);
  assert.ok(Object.entries(owned).every(([id, o]) => (id === OWL_STICKER ? o.p === 1 : o.p === 0 && o.via === "backfill")));
});

check("backfill: spårade bokstäver får sina delar, nivå 13+ hoppas över", () => {
  const owned = backfillStickers({ "trace:trace-sv:1": 2, "trace:trace-sv:6": 1, "trace:trace-sv:13": 3, "trace:trace-sv:11": 1 }, TODAY);
  for (const i of range(0, 5)) assert.equal(owned[`l:sv:${i}`].parts, 3);
  for (const d of range(0, 4)) assert.ok(owned[`d:sv:${d}`]);
  assert.equal(Object.keys(owned).length, 1 + 6 + 5);
});

check("backfill: v1-migrerad sparning → 24 ord men allt annat komplett", () => {
  const v1: Record<string, number> = {};
  for (const g of GAMES) for (const path of pathsFor(g, CAT_IDS, LANG_CODES)) for (const l of [1, 2, 3, 4]) v1[`${g.id}:${path}:${l}`] = 3;
  const stars = migrateStarsV1(v1);
  const owned = backfillStickers(stars, TODAY);
  const words = Object.keys(owned).filter((id) => id.startsWith("w:") && id !== OWL_STICKER);
  assert.equal(words.length, 24);
  assert.ok(words.every((id) => CONCEPTS.find((c) => `w:${c.id}` === id)!.level === 1)); // band 1 först
  assert.deepEqual(words.slice(0, 8), ["w:cat", "w:bread", "w:apple", "w:carrot", "w:car", "w:hand", "w:one", "w:dog"]);
  for (const l of range(1, 20)) assert.ok(owned[`m:${l}`] && owned[`c:${l}`], `vagn/pärla ${l}`);
  for (const lang of LANG_CODES as LangCode[]) {
    ALPHABETS[lang].upper.forEach((_, i) => assert.equal(owned[`l:${lang}:${i}`]?.parts, 3, `l:${lang}:${i}`));
    for (const d of range(0, 9)) assert.ok(owned[`d:${lang}:${d}`], `d:${lang}:${d}`);
  }
  assert.equal(Object.keys(owned).length, 1 + 24 + 40 + 140 + 50);
  // välkomstgåvan i påsen är taket, inte Σ
  assert.equal(Math.min(sumStars(stars), WELCOME_CAP), 60);
});

// ── Boken ───────────────────────────────────────────────────────────────

check("sidans framsteg, klar sida och kuvertet", () => {
  const page = PAGE_BY_ID.get("djur-1")!;
  const ids = page.shelves.flatMap((s) => s.ids);
  const owned: Record<string, OwnedSticker> = Object.fromEntries(ids.map((id) => [id, own(1)]));
  assert.ok(pageComplete(page, owned));
  owned["w:hen"] = own(0);
  assert.ok(!pageComplete(page, owned));
  assert.deepEqual(pageProgress(page, owned), { placed: 8, owned: 9, total: 9 });
  assert.deepEqual(pageProgress(page, {}), { placed: 0, owned: 0, total: 9 });

  const marken = PAGE_BY_ID.get("marken")!;
  assert.equal(pageProgress(marken, owned).total, 0);
  assert.ok(!pageComplete(marken, owned));

  const tray = { "w:dog": own(0), "l:sv:0": own(1), "x:unknown": own(0), "m:3": own(0), "w:hen": own(0) };
  assert.deepEqual(trayIds(tray), ["w:dog", "m:3", "w:hen"]);
});

check("sparad bok rensas men inklistrade märken finns kvar", () => {
  const s = sanitizeStickers({
    owned: { "w:cat": own(0), "w:gone": own(1), "w:old": own(0) },
    met: { cat: { g: ["memory"], l: ["sv"] }, gone: { g: [], l: [] } },
    donePages: ["djur-1", "nope"],
    intro: null,
  });
  assert.deepEqual(Object.keys(s.owned), ["w:cat", "w:gone"]);
  assert.deepEqual(Object.keys(s.met), ["cat"]);
  assert.deepEqual(s.donePages, ["djur-1"]);
  assert.equal(s.intro, null);
});

// ── 8. Påsens saldo ─────────────────────────────────────────────────────

type Nest = { earned: number; owned: Record<string, OwnedItem>; slots: Record<string, string>; wish: string | null; grow: Record<string, 0 | 1 | 2> };
/** Samma regel som useNest.buy: avgör först, ändra bara om det går. */
function buy(s: Nest, id: string): boolean {
  if (!canBuy(s, id)) return false;
  s.owned[id] = { at: TODAY, via: "buy", paid: NEST_ITEMS.find((i) => i.id === id)!.price };
  if (s.wish === id) s.wish = null;
  return true;
}

check("köp, lämna tillbaka och köp igen håller saldot rätt", () => {
  const s: Nest = { earned: 20, owned: {}, slots: {}, wish: "hat-cap", grow: {} };
  assert.equal(balanceOf(s), 20);
  assert.ok(buy(s, "hat-cap"));
  assert.equal(s.wish, null);
  assert.equal(balanceOf(s), 12);
  assert.equal(spentOf(s), 8);
  assert.ok(!buy(s, "hat-cap")); // redan ägd
  delete s.owned["hat-cap"]; // lämna tillbaka = 100 % tillbaka
  assert.equal(balanceOf(s), 20);
  assert.ok(buy(s, "hat-cap"));
  assert.equal(balanceOf(s), 12);
  s.earned += 3; // en ny bästa stjärna
  assert.equal(balanceOf(s), 15);
});

check("köp utan tillräckligt i påsen ändrar ingenting", () => {
  const s: Nest = { earned: 5, owned: {}, slots: {}, wish: null, grow: {} };
  const before = JSON.stringify(s);
  assert.equal(buy(s, "hat-cap"), false);
  assert.equal(JSON.stringify(s), before);
  assert.equal(buy(s, "friend-chick"), false); // gåvor kan inte köpas
  assert.equal(buy(s, "hat-luva"), false); // startsaker inte heller
  assert.equal(buy(s, "nope"), false);
  assert.ok(buy(s, "light-bulb")); // 5 ⭐ räcker precis
  assert.equal(balanceOf(s), 0);
  assert.equal(balanceOf({ earned: 3, owned: { x: { at: TODAY, via: "buy", paid: 8 } } }), 0); // aldrig minus
});

check("okänd sak försvinner vid inläsning = återbetalning", () => {
  const s = sanitizeNest({
    earned: 30,
    owned: { "hat-cap": { at: TODAY, via: "buy", paid: 8 }, "gone-item": { at: TODAY, via: "buy", paid: 10 } },
    slots: { hat: "gone-item", floorL: "hat-cap", rug: "start-moss", window: "start-sky", friend1: "friend-fox" },
    wish: "hat-cap",
    grow: { "gone-item": 1, "plant-sprout": 2 },
  });
  assert.equal(balanceOf({ earned: 30, owned: { "hat-cap": { at: TODAY, via: "buy", paid: 8 }, "gone-item": { at: TODAY, via: "buy", paid: 10 } } }), 12);
  assert.equal(balanceOf(s), 22);
  assert.deepEqual(Object.keys(s.owned), ["hat-cap"]);
  assert.deepEqual(s.slots, { rug: "start-moss", window: "start-sky" }); // okänd, felplacerad och inte ägd töms
  assert.equal(s.wish, null); // redan ägd
  assert.deepEqual(s.grow, { "plant-sprout": 2 });
  assert.equal(sanitizeNest({ ...s, wish: "friend-chick" }).wish, null); // gåvor kan inte önskas
  assert.equal(sanitizeNest({ ...s, wish: "toy-piano" }).wish, "toy-piano");
});

check("det Nabu bär och lediga platser", () => {
  const owned = { "hat-cap": { at: TODAY, via: "buy" as const, paid: 8 } };
  assert.equal(wornItem({ owned, slots: { hat: "hat-cap" } }, "hat")?.id, "hat-cap");
  assert.equal(wornItem({ owned: {}, slots: { hat: "hat-cap" } }, "hat"), null); // inte ägd
  assert.equal(wornItem({ owned, slots: { neck: "hat-cap" } }, "neck"), null); // fel sort
  assert.equal(wornItem({ owned: {}, slots: { hat: "hat-luva" } }, "hat")?.id, "hat-luva"); // startsak
  assert.equal(wornItem({ owned: {}, slots: { hat: "nope" } }, "hat"), null);
  assert.ok(isOwnedItem({ owned: {} }, "start-moss"));
  const chick = NEST_ITEMS.find((i) => i.id === "friend-chick")!;
  assert.equal(firstFreeSlot(chick, { friend1: "friend-fox" }), "friend2");
  assert.equal(firstFreeSlot(chick, { friend1: "a", friend2: "b", friend3: "c" }), null);
});

// ── Säkerhetskopian ─────────────────────────────────────────────────────

check("säkerhetskopian kontrolleras före inläsning", () => {
  const entry = JSON.stringify({ state: { stars: {} }, version: 2 });
  const ok = JSON.stringify({ app: "nabu", format: 1, exportedAt: "x", data: { "nabu-profile": entry } });
  assert.deepEqual(parseBackup(ok)?.data, { "nabu-profile": entry });
  assert.equal(parseBackup("inte json"), null);
  assert.equal(parseBackup(JSON.stringify({ app: "annan", format: 1, data: { "nabu-profile": entry } })), null);
  assert.equal(parseBackup(JSON.stringify({ app: "nabu", format: 2, data: { "nabu-profile": entry } })), null);
  assert.equal(parseBackup(JSON.stringify({ app: "nabu", format: 1, data: {} })), null);
  assert.equal(parseBackup(JSON.stringify({ app: "nabu", format: 1, data: { "other-key": entry } })), null);
  assert.equal(parseBackup(JSON.stringify({ app: "nabu", format: 1, data: { "nabu-profile": "{}" } })), null);
  assert.equal(parseBackup(JSON.stringify({ app: "nabu", format: 1, data: { "nabu-profile": { state: {}, version: 1 } } })), null);
});

console.log(`✓ check-rewards: ${passed} kontroller OK`);
