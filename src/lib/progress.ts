import type { GameId, Level } from "../types";

/**
 * Nyckel för stjärnor per spel × kategori × nivå.
 * `category` är en sträng (vanliga spel använder Category, matte använder "all").
 */
export function starKey(game: GameId, category: string, level: Level): string {
  return `${game}:${category}:${level}`;
}

export function levelStars(
  stars: Record<string, number>,
  game: GameId,
  category: string,
  level: Level
): number {
  return stars[starKey(game, category, level)] ?? 0;
}

/** Nivå 1 är alltid öppen; övriga kräver minst 1 stjärna på nivån innan. */
export function isLevelUnlocked(
  stars: Record<string, number>,
  game: GameId,
  category: string,
  level: Level
): boolean {
  if (level <= 1) return true;
  return levelStars(stars, game, category, (level - 1) as Level) > 0;
}
