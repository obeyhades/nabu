import type { GameDefinition } from "../types";

/**
 * Single source of truth för alla spel. Dashboard och andra vyer läser härifrån.
 * Nytt spel = lägg till en post här + en sida + en route.
 */
export const GAMES: GameDefinition[] = [
  {
    id: "flashcards",
    name: "Ord & bilder",
    description: "Lyssna och lär dig nya ord",
    emoji: "🖼️",
    gradient: "from-pink-400 to-purple-500",
    path: "/game/flashcards",
  },
  {
    id: "memory",
    name: "Para ihop",
    description: "Hitta paren som hör ihop",
    emoji: "🃏",
    gradient: "from-sky-400 to-emerald-500",
    path: "/game/memory",
  },
  {
    id: "spelling",
    name: "Stava ordet",
    description: "Bygg ordet bokstav för bokstav",
    emoji: "🔤",
    gradient: "from-amber-400 to-orange-500",
    path: "/game/spelling",
  },
  {
    id: "math",
    name: "Matte",
    description: "Räkna ut svaret",
    emoji: "🧮",
    gradient: "from-indigo-400 to-sky-500",
    path: "/game/math",
  },
  {
    id: "abc",
    name: "ABC-äventyr",
    description: "Lär dig bokstäverna",
    emoji: "🅰️",
    gradient: "from-teal-400 to-cyan-500",
    path: "/game/abc",
  },
];
