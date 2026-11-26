import type { Band, Level } from "../types";

/** Antal nivåer på varje stig och hur många nivåer som ryms i ett band. */
export const LEVEL_COUNT = 20;
export const LEVELS_PER_BAND = 5;

export type BandInfo = {
  band: Band;
  name: string; // svårighetsgrad, t.ex. "Nybörjare"
  title: string; // roligt namn på bandet
  icon: string;
  desc: string;
  gradient: string; // tailwind-gradient
  border: string; // matchande kantfärg
};

/** De fyra svårighetsbanden – varje band är fem nivåer på stigen. */
export const BANDS: BandInfo[] = [
  {
    band: 1,
    name: "Nybörjare",
    title: "Första stegen",
    icon: "🌱",
    desc: "Lätta ord och full hjälp",
    gradient: "from-emerald-400 to-green-500",
    border: "border-emerald-400",
  },
  {
    band: 2,
    name: "Mellannivå",
    title: "På äventyr",
    icon: "🚀",
    desc: "Fler ord, lite mindre hjälp",
    gradient: "from-amber-400 to-yellow-500",
    border: "border-amber-400",
  },
  {
    band: 3,
    name: "Utmanare",
    title: "Utmaningen",
    icon: "🔥",
    desc: "Längre ord, fler val",
    gradient: "from-orange-400 to-orange-600",
    border: "border-orange-400",
  },
  {
    band: 4,
    name: "Mästare",
    title: "Mästaren",
    icon: "👑",
    desc: "Inga ledtrådar",
    gradient: "from-rose-500 to-red-600",
    border: "border-rose-400",
  },
];

export type LevelInfo = {
  level: Level;
  band: Band;
  step: number; // 1–5 inom bandet
  icon: string; // emoji på nivåbrickan
};

// En egen ikon per nivå så stigen känns som en resa
const LEVEL_ICONS = [
  "🌱", "🐣", "🌼", "🍀", "🌳",
  "🚲", "⛺", "🧭", "🎈", "🚀",
  "🏔️", "⚡", "🌋", "🐉", "💎",
  "🏰", "🌟", "🦄", "🏆", "👑",
];

export const LEVELS: LevelInfo[] = LEVEL_ICONS.map((icon, i) => ({
  level: i + 1,
  band: bandOf(i + 1),
  step: (i % LEVELS_PER_BAND) + 1,
  icon,
}));

export function bandOf(level: Level): Band {
  return Math.min(4, Math.max(1, Math.ceil(level / LEVELS_PER_BAND))) as Band;
}

export function getBand(band: Band): BandInfo {
  return BANDS[band - 1] ?? BANDS[0];
}

export function getLevel(level: Level): LevelInfo {
  return LEVELS[level - 1] ?? LEVELS[0];
}

/** Nivåerna i ett band (för gruppering på stigen). */
export function levelsInBand(band: Band): LevelInfo[] {
  return LEVELS.filter((l) => l.band === band);
}
