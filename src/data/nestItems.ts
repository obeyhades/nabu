/**
 * ETIK – läs innan du ändrar:
 * 1. Inga förhandsvisningar: nivåer, Coach och vinstskärm lovar aldrig klistermärken eller saker före spel.
 * 2. Inga lockbeten: inga pulserande "Nytt!"-märken, inget "bara 2 kvar!", inga erbjudanden när barnet vill sluta.
 * 3. Inga timers: inget tidsbegränsat, roterande, säsongsbundet eller på rea.
 * 4. Ingen slump: alla belöningar och priser är bestämda och synliga i förväg.
 * 5. Inget kopplat till streak eller dagens mål.
 * 6. Inga riktiga pengar. Inget förfaller. Nabu är aldrig ledsen, hungrig eller "saknar dig".
 */
import type { ItemId, NestItem, NestKind, NestSlot, WearSlot } from "../types";
import { CONCEPTS } from "./concepts";
import { BOOK_PAGES, PAGE_BY_ID } from "./stickers";

/**
 * Nabus bo: 57 saker – 3 startsaker, 29 i Stjärnboden (sammanlagt 691 ⭐) och
 * 25 gåvor. Allt är permanent: ingen rotation, rea, slump eller riktiga pengar.
 * Gåvor och startsaker kostar 0 och kan inte köpas.
 * Emoji-konst (`e`) får bara använda EMOJI_OK (Emoji ≤ 11, text-glyfer har U+FE0F)
 * och aldrig samma emoji som ett ord (svarsalternativ) i spelen.
 */

/** Vilka platser varje sorts sak passar på (kan ersättas per sak med `slots`). */
export const KIND_SLOTS: Record<NestKind, NestSlot[]> = {
  hat: ["hat"],
  neck: ["neck"],
  light: ["lamp", "shelf"],
  garland: ["garland"],
  wall: ["wallL", "wallR"],
  window: ["window"],
  furniture: ["floorL", "floorR"],
  floor: ["rug"],
  plant: ["sill", "shelf", "floorL", "floorR"],
  toy: ["sill", "shelf", "floorL", "floorR"],
  friend: ["friend1", "friend2", "friend3"],
};

/** Platserna som sitter på Nabu (resten finns i boet). */
export const WEAR_SLOTS: WearSlot[] = ["hat", "neck"];

/** Startvärden för hur något sitter på ugglan (em av ugglan) – trimma med DEV-hattrutnätet. */
export const DEFAULT_WEAR: Record<WearSlot, NonNullable<NestItem["wear"]>> = {
  hat: { size: 0.55, dy: -0.3, rot: -8 },
  neck: { size: 0.34, dy: 0.56, rot: 0 },
};

/** Lilla plantans tre steg (vattnas med 3 tryck per steg, vissnar aldrig). */
export const GROW_STAGES = ["🌱", "🌿", "🌳"] as const;

const SHELF_OR_FLOOR: NestSlot[] = ["shelf", "floorL", "floorR"];

export const NEST_ITEMS: NestItem[] = [
  // ── Startsaker (finns alltid, kostar inget) ──
  { id: "start-moss", name: "Mossmattan", kind: "floor", art: { css: "moss" }, price: 0, via: "start", trick: "bounce" },
  { id: "start-sky", name: "Dagshimlen", kind: "window", art: { css: "sky" }, price: 0, via: "start" }, // på natten: .stars + 🌙
  { id: "hat-luva", name: "Nabus luva", kind: "hat", art: { svg: "luva" }, price: 0, via: "start", trick: "bounce", wear: { size: 0.54, dy: -0.43, rot: -6 } }, // ges i första besöket

  // ── Stjärnboden ──
  { id: "hat-nightcap", name: "Nattmössan", kind: "hat", art: { svg: "nightcap" }, price: 3, via: "shop", trick: "bounce", wear: { size: 0.58, dy: -0.47, rot: -12 } },
  { id: "hat-cap", name: "Kepsen", kind: "hat", art: { e: "🧢" }, price: 8, via: "shop", trick: "bounce", wear: { size: 0.55, dy: -0.28, rot: -10 } },
  { id: "hat-sunhat", name: "Solhatten", kind: "hat", art: { e: "👒" }, price: 20, via: "shop", trick: "bounce", wear: { size: 0.58, dy: -0.44, rot: -6 } },
  { id: "hat-tophat", name: "Cylinderhatten", kind: "hat", art: { e: "🎩" }, price: 40, via: "shop", trick: "bounce", wear: { size: 0.55, dy: -0.4, rot: -6 } },
  { id: "hat-starhat", name: "Stjärnhatten", kind: "hat", art: { svg: "starhat" }, price: 60, via: "shop", trick: "bounce", wear: { size: 0.62, dy: -0.44, rot: -4 } },
  { id: "neck-scarf", name: "Halsduken", kind: "neck", art: { e: "🧣" }, price: 10, via: "shop", wear: { size: 0.36, dy: 0.5 } },
  { id: "light-bulb", name: "Glödlampan", kind: "light", art: { e: "💡" }, price: 5, via: "shop", trick: "lamp" },
  { id: "light-lantern", name: "Papperslyktan", kind: "light", art: { e: "🏮" }, price: 15, via: "shop", trick: "lamp" },
  { id: "light-moon", name: "Månlampan", kind: "light", art: { e: "🌙" }, price: 25, via: "shop", trick: "lamp" }, // mjukt blått sken
  { id: "garland-lights", name: "Ljusslingan", kind: "garland", art: { css: "stringLights" }, price: 40, via: "shop", trick: "lamp" }, // lyser på natten
  { id: "furn-stool", name: "Pallen", kind: "furniture", art: { css: "stool" }, price: 8, via: "shop", trick: "bounce" }, // ersätter 🪑 (Emoji 12)
  { id: "furn-books", name: "Bokhögen", kind: "furniture", art: { e: "📚" }, price: 12, via: "shop", slots: SHELF_OR_FLOOR, trick: "bounce" },
  { id: "furn-sofa", name: "Soffan", kind: "furniture", art: { e: "🛋️" }, price: 30, via: "shop", trick: "bounce" },
  { id: "wall-frame", name: "Ordtavlan", kind: "wall", art: { css: "frame" }, price: 15, via: "shop", trick: "frame" }, // visar de 4 senast inklistrade orden
  { id: "wall-rainbow", name: "Regnbågen", kind: "wall", art: { e: "🌈" }, price: 25, via: "shop", trick: "bounce" },
  { id: "window-sunset", name: "Solnedgången", kind: "window", art: { css: "sunset" }, price: 12, via: "shop" },
  { id: "window-aurora", name: "Norrskenet", kind: "window", art: { css: "aurora" }, price: 80, via: "shop" }, // stilla gradient vid reducerad rörelse
  { id: "rug-stripes", name: "Randiga mattan", kind: "floor", art: { css: "stripes" }, price: 5, via: "shop", trick: "bounce" },
  { id: "rug-rainbow", name: "Regnbågsmattan", kind: "floor", art: { css: "rainbowRug" }, price: 30, via: "shop", trick: "bounce" },
  { id: "plant-cactus", name: "Kaktusen", kind: "plant", art: { e: "🌵" }, price: 3, via: "shop", trick: "bounce" },
  { id: "plant-tulip", name: "Tulpanen", kind: "plant", art: { e: "🌷" }, price: 5, via: "shop", trick: "bounce" },
  { id: "plant-sprout", name: "Lilla plantan", kind: "plant", art: { e: GROW_STAGES[0] }, price: 15, via: "shop", trick: "grow" }, // 🌱 → 🌿 → 🌳
  { id: "toy-ball", name: "Bollen", kind: "toy", art: { e: "⚽" }, price: 5, via: "shop", trick: "bounce" },
  { id: "toy-teddy", name: "Nallen", kind: "toy", art: { e: "🧸" }, price: 15, via: "shop", trick: "bounce" },
  { id: "toy-drum", name: "Trumman", kind: "toy", art: { e: "🥁" }, price: 20, via: "shop", trick: "drum" },
  { id: "toy-piano", name: "Pianot", kind: "toy", art: { e: "🎹" }, price: 50, via: "shop", trick: "piano" }, // spelar C-E-G
  { id: "friend-ladybug", name: "Prick nyckelpigan", kind: "friend", art: { e: "🐞" }, price: 10, via: "shop", trick: "friend" }, // "Bjud in"
  { id: "friend-fox", name: "Ruffa räven", kind: "friend", art: { e: "🦊" }, price: 45, via: "shop", trick: "friend" },
  { id: "friend-deer", name: "Lövis rådjuret", kind: "friend", art: { e: "🦌" }, price: 80, via: "shop", trick: "friend" },

  // ── Gåvor från fulla sidor i boken ──
  { id: "friend-chick", name: "Pip kycklingen", kind: "friend", art: { e: "🐥" }, price: 0, via: "gift", gift: { page: "djur-1" }, trick: "friend" },
  { id: "friend-hamster", name: "Hampus hamstern", kind: "friend", art: { e: "🐹" }, price: 0, via: "gift", gift: { page: "djur-2" }, trick: "friend" },
  { id: "toy-globe", name: "Jordgloben", kind: "toy", art: { e: "🌍" }, price: 0, via: "gift", gift: { page: "djur-3" }, trick: "globe" }, // säger "uggla" på 5 språk (owl.mp3)
  { id: "friend-badger", name: "Grävis grävlingen", kind: "friend", art: { e: "🦡" }, price: 0, via: "gift", gift: { page: "djur-4" }, trick: "friend" },
  { id: "furn-basket", name: "Picknickkorgen", kind: "furniture", art: { e: "🧺" }, price: 0, via: "gift", gift: { page: "mat-1" }, slots: SHELF_OR_FLOOR, trick: "bounce" },
  { id: "garland-party", name: "Kalasvimplarna", kind: "garland", art: { css: "bunting" }, price: 0, via: "gift", gift: { page: "mat-2" }, trick: "bounce" },
  { id: "friend-caterpillar", name: "Slingan larven", kind: "friend", art: { e: "🐛" }, price: 0, via: "gift", gift: { page: "frukt-1" }, trick: "friend" },
  { id: "plant-palm", name: "Palmen", kind: "plant", art: { e: "🌴" }, price: 0, via: "gift", gift: { page: "frukt-2" }, trick: "bounce" },
  { id: "plant-sunflower", name: "Solrosen", kind: "plant", art: { e: "🌻" }, price: 0, via: "gift", gift: { page: "gron-1" }, trick: "bounce" },
  { id: "friend-snail", name: "Sävlig snigeln", kind: "friend", art: { e: "🐌" }, price: 0, via: "gift", gift: { page: "gron-2" }, trick: "friend" },
  { id: "wall-map", name: "Kartan", kind: "wall", art: { e: "🗺️" }, price: 0, via: "gift", gift: { page: "fordon-1" }, trick: "bounce" },
  { id: "toy-telescope", name: "Kikaren", kind: "toy", art: { e: "🔭" }, price: 0, via: "gift", gift: { page: "fordon-2" }, trick: "telescope" }, // stjärnfall i fönstret
  { id: "neck-bow", name: "Rosetten", kind: "neck", art: { e: "🎀" }, price: 0, via: "gift", gift: { page: "kropp-1" }, wear: { size: 0.3, dy: 0.58 } },
  { id: "hat-gradcap", name: "Klokmössan", kind: "hat", art: { e: "🎓" }, price: 0, via: "gift", gift: { page: "kropp-2" }, trick: "bounce", wear: { size: 0.58, dy: -0.34, rot: -8 } },
  { id: "wall-clock", name: "Väckarklockan", kind: "wall", art: { e: "⏰" }, price: 0, via: "gift", gift: { page: "siffror-1" }, trick: "clock" }, // visar riktig tid
  { id: "garland-numbers", name: "Sifferslingan (1–20)", kind: "garland", art: { css: "numberBunting" }, price: 0, via: "gift", gift: { page: "siffror-2" }, trick: "bounce" },
  { id: "garland-abc-sv", name: "Bokstavsvimpeln – svenska", kind: "garland", art: { css: "letterBunting", arg: "sv" }, price: 0, via: "gift", gift: { page: "abc-sv" }, trick: "bounce" },
  { id: "garland-abc-en", name: "Bokstavsvimpeln – engelska", kind: "garland", art: { css: "letterBunting", arg: "en" }, price: 0, via: "gift", gift: { page: "abc-en" }, trick: "bounce" },
  { id: "garland-abc-el", name: "Bokstavsvimpeln – grekiska", kind: "garland", art: { css: "letterBunting", arg: "el" }, price: 0, via: "gift", gift: { page: "abc-el" }, trick: "bounce" },
  { id: "garland-abc-ru", name: "Bokstavsvimpeln – ryska", kind: "garland", art: { css: "letterBunting", arg: "ru" }, price: 0, via: "gift", gift: { page: "abc-ru" }, trick: "bounce" },
  { id: "garland-abc-ar", name: "Bokstavsvimpeln – arabiska", kind: "garland", art: { css: "letterBunting", arg: "ar" }, price: 0, via: "gift", gift: { page: "abc-ar" }, trick: "bounce" },
  { id: "toy-abacus", name: "Kulramen", kind: "toy", art: { e: "🧮" }, price: 0, via: "gift", gift: { page: "rakna-tag" }, trick: "abacus" }, // räknar 1–10 högt
  { id: "neck-beads", name: "Pärlhalsbandet", kind: "neck", art: { css: "beads" }, price: 0, via: "gift", gift: { page: "rakna-parlor" }, wear: { size: 0.4, dy: 0.56 } },

  // ── Gåvor från Märkeshyllan ──
  { id: "neck-medal", name: "Medaljen", kind: "neck", art: { e: "🏅" }, price: 0, via: "gift", gift: { badge: "medal" }, wear: { size: 0.3, dy: 0.6 } }, // alla 11 spelmärken har 🌱-ram
  { id: "hat-crown", name: "Mästarkronan", kind: "hat", art: { e: "👑" }, price: 0, via: "gift", gift: { badge: "crown" }, trick: "bounce", wear: { size: 0.5, dy: -0.32, rot: -6 } }, // alla 11 har 👑-ram
];

export const ITEM_BY_ID = new Map<ItemId, NestItem>(NEST_ITEMS.map((i) => [i.id, i]));

/** Platserna en sak passar på. */
export function slotsFor(item: NestItem): NestSlot[] {
  return item.slots ?? KIND_SLOTS[item.kind];
}

const STARTER_IDS = new Set(NEST_ITEMS.filter((i) => i.via === "start").map((i) => i.id));

/** Startsakerna ägs alltid (de lagras aldrig i `owned`). */
export function isStarter(id: ItemId): boolean {
  return STARTER_IDS.has(id);
}

/** Villkoret som visas på en gåva i Stjärnboden (aldrig ett pris). */
export function giftCondition(item: NestItem): string {
  if (!item.gift) return "";
  if ("badge" in item.gift)
    return item.gift.badge === "medal"
      ? "Gåva när alla 11 spelmärken har en 🌱-ram"
      : "Gåva när alla 11 spelmärken har en 👑-ram";
  const page = PAGE_BY_ID.get(item.gift.page);
  return page ? `Gåva när sidan ${page.title} är full` : "";
}

// ── Scenen (logiska koordinater 400 × 300, speglas aldrig) ──────────────

/** Platser i boet (hatt och hals sitter på Nabu och finns inte här). */
export type SceneSlot = Exclude<NestSlot, WearSlot>;

export type SlotDef = {
  x: number;
  y: number; // ankarpunkten
  anchor: "top" | "center" | "bottom"; // bottom ritas med translate(-50%,-100%)
  size?: number; // emoji-storlek i u (= bredd/400 px)
  w?: number; // ram/ellips (fönster, matta)
  h?: number;
  span?: [number, number]; // girlangen hänger mellan x = 60 och 340
  aria: string;
};

/** Startvärden – trimmas visuellt. */
export const NEST_SLOTS: Record<SceneSlot, SlotDef> = {
  garland: { x: 200, y: 18, anchor: "top", span: [60, 340], aria: "Girlangen" },
  lamp: { x: 92, y: 10, anchor: "top", size: 34, aria: "Lampkroken" },
  window: { x: 200, y: 84, anchor: "center", w: 110, h: 80, aria: "Fönstret" },
  sill: { x: 200, y: 128, anchor: "bottom", size: 30, aria: "Fönsterbrädan" },
  friend3: { x: 318, y: 92, anchor: "bottom", size: 32, aria: "Grenen" },
  wallL: { x: 64, y: 128, anchor: "center", size: 48, aria: "Vänstra väggen" },
  wallR: { x: 336, y: 140, anchor: "center", size: 48, aria: "Högra väggen" },
  shelf: { x: 330, y: 200, anchor: "bottom", size: 32, aria: "Hyllan" }, // hyllplanet ligger på y = 200
  friend1: { x: 130, y: 284, anchor: "bottom", size: 38, aria: "Vänplatsen till vänster" },
  friend2: { x: 270, y: 284, anchor: "bottom", size: 38, aria: "Vänplatsen till höger" },
  floorL: { x: 52, y: 282, anchor: "bottom", size: 54, aria: "Golvet till vänster" },
  floorR: { x: 348, y: 282, anchor: "bottom", size: 54, aria: "Golvet till höger" },
  rug: { x: 200, y: 288, anchor: "center", w: 170, h: 24, aria: "Mattan" },
};

/** Där Nabu sitter (del av scenkonsten, ingen plats för saker). */
export const NABU_PERCH = { x: 200, y: 262, anchor: "bottom", size: 80 } as const;

export const DEFAULT_SLOTS: Partial<Record<NestSlot, ItemId>> = { rug: "start-moss", window: "start-sky" };

/** Flikarna i Pynta och Stjärnboden. */
export const DRAWER_TABS: { id: "nabu" | "ljus" | "saker" | "vanner"; label: string; kinds: NestKind[] }[] = [
  { id: "nabu", label: "På Nabu", kinds: ["hat", "neck"] },
  { id: "ljus", label: "Ljus & väggar", kinds: ["light", "garland", "wall", "window"] },
  { id: "saker", label: "Möbler & saker", kinds: ["furniture", "floor", "plant", "toy"] },
  { id: "vanner", label: "Vänner", kinds: ["friend"] },
];

/** Högsta välkomstgåvan i påsen för en befintlig sparning (Σ stjärnor, max 60). */
export const WELCOME_CAP = 60;

/** Emoji som fungerar överallt (Emoji ≤ 11). */
export const EMOJI_OK: Set<string> = new Set([
  "🧢", "👒", "🎩", "🧣", "💡", "🏮", "🌙", "📚", "🛋️", "🌈", "🌵", "🌷", "🌱", "🌿", "🌳", "⚽", "🧸", "🥁", "🎹",
  "🐞", "🦊", "🦌", "🐥", "🐹", "🌍", "🦡", "🧺", "🐛", "🌴", "🌻", "🐌", "🗺️", "🔭", "🎀", "🎓", "⏰", "🧮", "🏅", "👑",
]);

/** Emoji som INTE får användas (Emoji 12+ – blir rutor på äldre enheter). */
export const EMOJI_DENY: Set<string> = new Set(["🪑", "🪴", "🪺", "🪹", "🪟", "🪞", "🪶", "🪵", "🫙", "🪿", "🪁", "🪀"]);

// ── DEV-kontroll ────────────────────────────────────────────────────────

/**
 * Kastar om katalogen är inkonsekvent. Körs automatiskt i DEV (längst ner) och
 * från scripts/check-rewards.ts.
 * "Giltiga platser" betyder: varje plats i `slots` finns, och bara hatt/hals
 * passar på Nabu (hatt → ["hat"], hals → ["neck"]) – övriga saker aldrig där.
 */
export function assertCatalog(): void {
  const errors: string[] = [];
  const known = new Set<string>([...WEAR_SLOTS, ...Object.keys(NEST_SLOTS)]);
  const conceptEmoji = new Set(CONCEPTS.map((c) => c.emoji));

  const ids = new Set<ItemId>();
  for (const item of NEST_ITEMS) {
    const at = item.id;
    if (ids.has(at)) errors.push(`${at} finns två gånger`);
    ids.add(at);

    if (!(item.kind in KIND_SLOTS)) errors.push(`${at}: okänd sort ${item.kind}`);
    const slots = slotsFor(item) ?? [];
    if (!slots.length) errors.push(`${at}: inga platser`);
    for (const s of slots) if (!known.has(s)) errors.push(`${at}: okänd plats ${s}`);
    const isWear = item.kind === "hat" || item.kind === "neck";
    if (isWear && (slots.length !== 1 || slots[0] !== item.kind)) errors.push(`${at}: ska bara sitta på ${item.kind}`);
    if (!isWear && slots.some((s) => s === "hat" || s === "neck")) errors.push(`${at}: får inte sitta på Nabu`);
    if (isWear && !item.wear) errors.push(`${at}: saknar wear`);

    if (item.via === "shop" ? !(item.price > 0) : item.price !== 0) errors.push(`${at}: fel pris ${item.price}`);
    if ((item.via === "gift") !== !!item.gift) errors.push(`${at}: gåva utan villkor eller villkor utan gåva`);
    if (item.gift && "page" in item.gift) {
      const page = PAGE_BY_ID.get(item.gift.page);
      if (!page) errors.push(`${at}: sidan ${item.gift.page} finns inte`);
      else if (page.gift !== item.id) errors.push(`${at}: sidan ${page.id} ger ${page.gift ?? "inget"}`);
    }

    const emojis = "e" in item.art ? [item.art.e] : [];
    if (item.trick === "grow") emojis.push(...GROW_STAGES);
    for (const e of emojis) {
      if (!EMOJI_OK.has(e) || EMOJI_DENY.has(e)) errors.push(`${at}: emoji ${e} är inte tillåten`);
      if (conceptEmoji.has(e)) errors.push(`${at}: emoji ${e} används redan av ett ord`);
    }
  }

  // varje sidgåva motsvarar exakt en sak (1:1)
  for (const page of BOOK_PAGES) {
    if (!page.gift) continue;
    const matches = NEST_ITEMS.filter((i) => i.gift && "page" in i.gift && i.gift.page === page.id);
    if (matches.length !== 1 || matches[0].id !== page.gift)
      errors.push(`sidan ${page.id}: gåvan ${page.gift} matchar ${matches.length} saker`);
  }
  for (const badge of ["medal", "crown"] as const) {
    const n = NEST_ITEMS.filter((i) => i.gift && "badge" in i.gift && i.gift.badge === badge).length;
    if (n !== 1) errors.push(`märkesgåvan ${badge} finns ${n} gånger`);
  }

  for (const id of Object.values(DEFAULT_SLOTS)) if (id && !isStarter(id)) errors.push(`DEFAULT_SLOTS: ${id} är ingen startsak`);
  const tabKinds = DRAWER_TABS.flatMap((t) => t.kinds);
  for (const k of Object.keys(KIND_SLOTS))
    if (tabKinds.filter((t) => t === k).length !== 1) errors.push(`sorten ${k} ska finnas i exakt en flik`);

  if (errors.length) throw new Error(`[nestItems] ${errors.join("; ")}`);
}

if (import.meta.env.DEV) assertCatalog();
