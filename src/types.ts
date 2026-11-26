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
