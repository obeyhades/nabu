import type { Level } from "../types";

export type LevelInfo = {
  level: Level;
  name: string; // svårighetsgrad, t.ex. "Nybörjare"
  title: string; // roligt namn på nivån
  icon: string; // rolig emoji
  desc: string; // kort beskrivning
  gradient: string; // tailwind-gradient
  border: string; // matchande kantfärg
};

/** De fyra svårighetsgraderna – nu som roliga, namngivna nivåer (som Nadira). */
export const LEVELS: LevelInfo[] = [
  {
    level: 1,
    name: "Nybörjare",
    title: "Första stegen",
    icon: "🌱",
    desc: "Lätta ord",
    gradient: "from-emerald-400 to-green-500",
    border: "border-emerald-400",
  },
  {
    level: 2,
    name: "Mellannivå",
    title: "På äventyr",
    icon: "🚀",
    desc: "Medellånga ord",
    gradient: "from-amber-400 to-yellow-500",
    border: "border-amber-400",
  },
  {
    level: 3,
    name: "Utmanare",
    title: "Utmaningen",
    icon: "🔥",
    desc: "Längre ord",
    gradient: "from-orange-400 to-orange-600",
    border: "border-orange-400",
  },
  {
    level: 4,
    name: "Mästare",
    title: "Mästaren",
    icon: "👑",
    desc: "Inga ledtrådar",
    gradient: "from-rose-500 to-red-600",
    border: "border-rose-400",
  },
];

export function getLevel(level: Level): LevelInfo {
  return LEVELS.find((l) => l.level === level) ?? LEVELS[0];
}
