/**
 * Gemensamma layoutklasser för mobil och surfplatta (samma mönster överallt).
 *
 * GAME_MAIN – spelens <main> under spelet:
 *  - fyller skärmen med dvh (aldrig 100vh: den ligger under Safaris verktygsfält)
 *  - växer på surfplattor (md:max-w-3xl) – svarsrutorna mäter själva höjden
 *    (FitGrid) så att inget hamnar under kanten
 *  - använder hela bredden på en liggande mobil (short:) där frågan och svaren
 *    står bredvid varandra
 *  - nederkanten håller sig ovanför hemindikatorn (pb-safe)
 *  - ingen textmarkering/förstoringslupp när barnet håller kvar fingret
 */
export const GAME_MAIN =
  "mx-auto flex min-h-dvh w-full max-w-xl select-none flex-col px-4 pb-safe pt-2 sm:px-6 sm:pt-4 md:max-w-3xl short:max-w-none short:px-4 short:pt-1";

/**
 * Som GAME_MAIN men hela bredden på en liggande surfplatta (side:): spel med en
 * spelplan som ska bli så stor som möjligt (Para ihop, Spåra) – annars står
 * brädet i en smal mittkolumn med tomma kanter på en iPad på tvären.
 */
export const GAME_WIDE = `${GAME_MAIN} side:max-w-6xl`;

/** Som GAME_MAIN men exakt en skärm hög (spel med en spelplan som fyller resten: Ballong, Katapult, Spåra). */
export const GAME_SCREEN = `${GAME_MAIN} h-dvh overflow-hidden`;

/** Frågetexten i spelen: lite större på surfplattan. */
export const PROMPT_TEXT = "font-semibold text-zinc-600 dark:text-zinc-300 md:text-xl";
