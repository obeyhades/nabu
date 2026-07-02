import type { GameDefinition } from "../types";

/**
 * Single source of truth för alla spel. Dashboard och andra vyer läser härifrån.
 * Nytt spel = lägg till en post här + en sida + en route.
 * Färgerna är medvetet tydligt olika – barn navigerar per färg ("den gröna").
 */
export const GAMES: GameDefinition[] = [
  {
    id: "flashcards",
    name: "Ord & bilder",
    description: "Lyssna, lär och visa vad du kan",
    emoji: "🖼️",
    gradient: "from-violet-500 to-purple-600",
    path: "/game/flashcards",
  },
  {
    id: "listen",
    name: "Hör & hitta",
    description: "Lyssna och hitta rätt bild",
    emoji: "👂",
    gradient: "from-teal-400 to-cyan-600",
    path: "/game/listen",
  },
  {
    id: "memory",
    name: "Para ihop",
    description: "Hitta paren som hör ihop",
    emoji: "🃏",
    gradient: "from-emerald-400 to-green-600",
    path: "/game/memory",
  },
  {
    id: "spelling",
    name: "Stava ordet",
    description: "Bygg ordet bokstav för bokstav",
    emoji: "🔤",
    gradient: "from-amber-500 to-orange-600",
    path: "/game/spelling",
  },
  {
    id: "abc",
    name: "ABC-äventyr",
    description: "Lär dig bokstäverna",
    emoji: "🅰️",
    gradient: "from-rose-400 to-pink-600",
    path: "/game/abc",
  },
  {
    id: "math",
    name: "Matte",
    description: "Räkna ut svaret",
    emoji: "🧮",
    gradient: "from-sky-500 to-blue-600",
    path: "/game/math",
    solo: true,
  },
  {
    id: "counting",
    name: "Räkna!",
    description: "Hur många ser du?",
    emoji: "🎈",
    gradient: "from-red-400 to-rose-600",
    path: "/game/counting",
    solo: true,
  },
];
