export type LangCode = "sv" | "en" | "ar" | "el" | "ru";

export type Language = {
  code: LangCode;
  name: string; // språkets eget namn, t.ex. "Svenska"
  flag: string; // emoji-flagga
  dir: "ltr" | "rtl";
  speechLang: string; // BCP-47 för Web Speech, t.ex. "sv-SE"
  available: boolean; // aktiverat i appen ännu?
};

export type Category =
  | "animals"
  | "food"
  | "numbers"
  | "fruit"
  | "vegetables"
  | "vehicles"
  | "body"
  | "blandad"; // dynamisk mix från alla kategorier

/**
 * Det man spelar i ett ordspel: en kategori (fri träning) eller
 * "adventure" = äventyrsstigen som går genom alla kategorier.
 */
export type PlayCategory = Category | "adventure";

/** Svårighetsband för ord: 1 Nybörjare, 2 Mellannivå, 3 Utmanare, 4 Mästare */
export type Band = 1 | 2 | 3 | 4;

/** Nivå på stigen: 1–20 (5 nivåer per band). */
export type Level = number;

export type Concept = {
  id: string;
  emoji: string;
  category: Category;
  level: Band; // hur svårt ordet är
  // Partiell: alla språk behöver inte vara ifyllda ännu.
  labels: Partial<Record<LangCode, string>>;
};

export type GameId =
  | "flashcards"
  | "memory"
  | "spelling"
  | "math"
  | "abc"
  | "listen"
  | "counting"
  | "puzzle"
  | "trace"
  | "balloon"
  | "catapult";

export type GameDefinition = {
  id: GameId;
  name: string;
  description: string;
  emoji: string;
  gradient: string; // tailwind-gradient för spelkortet
  path: string;
  solo?: boolean; // spelet har ingen kategori-väljare (t.ex. matte)
  isNew?: boolean; // visa "Ny!"-märke på startsidan
};

export type Profile = {
  name: string;
  avatar: string;
  stars: Record<string, number>; // nyckel: `${gameId}:${category}:${level}` -> 0-3 stjärnor
};

// ── Klistermärkesboken & Nabus bo ────────────────────────────────────────
// Endast strängunioner (inga enums, se erasableSyntaxOnly).

/** 'w:cat' | 'l:sv:0' | 'd:sv:7' | 'm:12' | 'c:3' – lagra bara id, aldrig emoji. */
export type StickerId = string;
export type StickerFamily = "word" | "letter" | "digit" | "wagon" | "bead";
/** 'djur-1' … 'abc-ar' | 'rakna-tag' | 'rakna-parlor' | 'marken' | 'mer' */
export type StickerPageId = string;
export type SceneId =
  | "meadow"
  | "table"
  | "orchard"
  | "garden"
  | "road"
  | "blueprint"
  | "chalk"
  | "poster"
  | "rails"
  | "string"
  | "shelf"
  | "plain";

export type ItemId = string;
export type NestKind =
  | "hat"
  | "neck"
  | "light"
  | "garland"
  | "wall"
  | "window"
  | "furniture"
  | "floor"
  | "plant"
  | "toy"
  | "friend";
export type NestSlot =
  | "hat"
  | "neck"
  | "lamp"
  | "garland"
  | "wallL"
  | "wallR"
  | "window"
  | "sill"
  | "shelf"
  | "floorL"
  | "floorR"
  | "rug"
  | "friend1"
  | "friend2"
  | "friend3";
/** Platserna som sitter på Nabu själv. */
export type WearSlot = "hat" | "neck";
export type CssArtId =
  | "moss"
  | "sky"
  | "stool"
  | "frame"
  | "sunset"
  | "aurora"
  | "stripes"
  | "rainbowRug"
  | "stringLights"
  | "bunting"
  | "numberBunting"
  | "letterBunting"
  | "beads";
export type SvgArtId = "luva" | "nightcap" | "starhat";
/** Emoji, egen CSS-konst (med ev. argument, t.ex. språk) eller egen SVG-hatt. */
export type ItemArt = { e: string } | { css: CssArtId; arg?: string } | { svg: SvgArtId };
export type TrickId =
  | "bounce"
  | "lamp"
  | "piano"
  | "globe"
  | "abacus"
  | "drum"
  | "grow"
  | "clock"
  | "telescope"
  | "frame"
  | "friend";

export type NestItem = {
  id: ItemId;
  name: string;
  kind: NestKind;
  art: ItemArt;
  price: number;
  via: "shop" | "gift" | "start";
  gift?: { page: StickerPageId } | { badge: "medal" | "crown" };
  slots?: NestSlot[]; // ersätter KIND_SLOTS för just den här saken
  wear?: { size: number; dy: number; dx?: number; rot?: number }; // i em av ugglan
  trick?: TrickId;
};

/**
 * Ett klistermärke i boken. p: 0 = väntar i kuvertet, 1 = inklistrat (pt = när).
 * parts (bokstäver): 1 versal, 2 gemen, 3 båda. tricky: 1 = "Kluring"-ram.
 */
export type OwnedSticker = {
  at: string;
  p: 0 | 1;
  pt?: number;
  via?: "gift" | "backfill";
  parts?: 1 | 2 | 3;
  tricky?: 1;
};

/** Hur ett ord har övats: i vilka spel (g), på vilka språk (l) och om i guldläge. */
export type Met = { g: GameId[]; l: LangCode[]; gold?: 1 };

/** En sak i Nabus bo som barnet äger (startsakerna är underförstådda). */
export type OwnedItem = { at: string; via: "buy" | "gift"; paid: number };

/** Det vinstskärmen visar efter en lektion (se useRewards). */
export type Reveal = {
  n: number;
  key: string;
  pouch: number;
  word: { chosen: StickerId; options: StickerId[] } | null; // options [] = ingen valrad
  rain: StickerId[]; // bokstäver/siffror/vagn/pärla som gavs nu
  upgrades: { s: StickerId; kind: "blank" | "gold" | "lower" | "tricky" }[];
  badges: { game: GameId; band: Band | 0 }[]; // 0 = spelmärket tändes för första gången
  gifts: ItemId[]; // bara medaljen/kronan
  praise: string;
  allKnown: boolean;
};
