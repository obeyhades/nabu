import { bandOf, LEVEL_COUNT, LEVELS_PER_BAND } from "../data/levels";
import type { Band, Level } from "../types";

/**
 * Hur mycket hjälp barnet får:
 *  - "full": ordet visas och läses upp automatiskt
 *  - "some": ordet läses upp men visas inte (eller tvärtom), färre ledtrådar
 *  - "none": inga ledtrådar alls
 */
export type HelpLevel = "full" | "some" | "none";

export type Difficulty = {
  level: Level;
  band: Band; // vilka ord som används (1–4)
  step: number; // 1–5 inom bandet
  /** 0 på nivå 1 → 1 på nivå 20. Använd för mjuka kurvor (fart, avstånd …). */
  t: number;
  rounds: number; // antal uppgifter i en lektion
  options: number; // antal svarsalternativ
  help: HelpLevel;
  /** Tempo-faktor för spel med rörelse (1 = lugnt, ~2.2 = snabbt). */
  speed: number;
  gold: boolean;
};

/**
 * EN plats som bestämmer hur svårt det blir – alla spel läser härifrån så
 * att svårigheten stiger jämnt nivå för nivå. Guld = nivån en gång till,
 * lite svårare.
 */
export function difficulty(level: Level, gold = false): Difficulty {
  const lvl = Math.min(LEVEL_COUNT, Math.max(1, level));
  const band = bandOf(lvl);
  const step = ((lvl - 1) % LEVELS_PER_BAND) + 1;
  const t = (lvl - 1) / (LEVEL_COUNT - 1);

  // 5 uppgifter i början → 10 på sista nivån
  const rounds = Math.min(10, 5 + Math.floor((lvl - 1) / 4)) + (gold ? 1 : 0);
  // 3 svarsalternativ → 6 (ett extra i guld)
  const options = Math.min(7, 3 + Math.floor((lvl - 1) / 5) + (gold ? 1 : 0));

  const helpRank = lvl <= 7 ? 0 : lvl <= 14 ? 1 : 2;
  const help: HelpLevel = (["full", "some", "none"] as const)[Math.min(2, helpRank + (gold ? 1 : 0))];

  const speed = 1 + t * 1.2 + (gold ? 0.2 : 0);

  return { level: lvl, band, step, t, rounds, options, help, speed, gold };
}

/** Stjärnor efter fel: 0 fel = 3, ett fåtal = 2, annars 1. */
export function starsFor(mistakes: number, rounds: number): 1 | 2 | 3 {
  if (mistakes === 0) return 3;
  if (mistakes <= Math.max(2, Math.round(rounds * 0.3))) return 2;
  return 1;
}

/** Interpolera mellan två värden med t (0–1). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
