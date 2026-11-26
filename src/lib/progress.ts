import type { GameId, Level } from "../types";

/**
 * Nyckel för stjärnor per spel × kategori × nivå.
 * `category` är en sträng (vanliga spel använder Category, matte/räkna använder "all").
 */
export function starKey(game: GameId, category: string, level: Level): string {
  return `${game}:${category}:${level}`;
}

/** Guld-läge (svårare omspel av 3-stjärnig nivå) sparas separat. */
export function goldStarKey(game: GameId, category: string, level: Level): string {
  return `${starKey(game, category, level)}:gold`;
}

/** Nyckel för en avklarad lektion (vanlig eller guld). */
export function lessonKey(game: GameId, category: string, level: Level, gold: boolean): string {
  return gold ? goldStarKey(game, category, level) : starKey(game, category, level);
}

export function levelStars(
  stars: Record<string, number>,
  game: GameId,
  category: string,
  level: Level
): number {
  return stars[starKey(game, category, level)] ?? 0;
}

export function goldLevelStars(
  stars: Record<string, number>,
  game: GameId,
  category: string,
  level: Level
): number {
  return stars[goldStarKey(game, category, level)] ?? 0;
}

/** Den första olåsta nivån som inte är klar än (den som "studsar" på stigen). */
export function nextLevel(stars: Record<string, number>, game: GameId, category: string, count: number): Level | null {
  for (let l = 1; l <= count; l++) {
    if (levelStars(stars, game, category, l) === 0) return isLevelUnlocked(stars, game, category, l) ? l : null;
  }
  return null;
}

/**
 * Flytta sparade stjärnor från gamla 4-nivåssystemet (v1) till 20 nivåer:
 * gammal nivå L motsvarar nivåerna 5(L−1)+1 … 5L, som alla får stjärnorna.
 */
export function migrateStarsV1(old: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(old)) {
    const m = key.match(/^([^:]+):([^:]+):([1-4])(:gold)?$/);
    if (!m) continue;
    const [, game, cat, L, gold] = m;
    const oldLevel = Number(L);
    // guld-resultat följer bara med till bandets sista nivå
    const levels = gold ? [oldLevel * 5] : [1, 2, 3, 4, 5].map((s) => (oldLevel - 1) * 5 + s);
    for (const lvl of levels) {
      const k = `${game}:${cat}:${lvl}${gold ?? ""}`;
      out[k] = Math.max(out[k] ?? 0, value);
    }
  }
  return out;
}

/** Nivå 1 är alltid öppen; övriga kräver minst 1 stjärna på nivån innan. */
export function isLevelUnlocked(
  stars: Record<string, number>,
  game: GameId,
  category: string,
  level: Level
): boolean {
  if (level <= 1) return true;
  return levelStars(stars, game, category, level - 1) > 0;
}

/** Antal klarade nivåer och insamlade stjärnor på en stig. */
export function pathProgress(
  stars: Record<string, number>,
  game: GameId,
  category: string,
  count: number
): { cleared: number; stars: number; gold: number } {
  let cleared = 0;
  let total = 0;
  let gold = 0;
  for (let l = 1; l <= count; l++) {
    const s = levelStars(stars, game, category, l);
    if (s > 0) cleared++;
    total += s;
    if (goldLevelStars(stars, game, category, l) > 0) gold++;
  }
  return { cleared, stars: total, gold };
}

/** Vilka stigar (kategorier) ett spel har – används av samling och föräldrasida. */
export function pathsFor(game: { id: GameId; solo?: boolean }, categories: string[], langs: string[]): string[] {
  if (game.id === "trace") return langs.map((l) => `trace-${l}`);
  if (game.solo) return ["all"];
  return ["adventure", ...categories];
}
