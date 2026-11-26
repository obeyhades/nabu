import type { Band, StickerId } from "../types";

/**
 * Små hjälpare för hur klistermärken ritas (delas av Sticker, vinstskärmens
 * remsa och boken). Komponentfiler får bara exportera komponenter, så de bor här.
 */

/** Fast lutning i grader, ((h % 9) − 4), ur en hash av id:t – samma märke lutar alltid lika. */
export function tiltOf(id: StickerId): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 9) - 4;
}

// Sifferorden i talordning (koncept-id i concepts.ts)
const NUMBER_WORDS = [
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];

/** Talet för ett sifferord ("seven" → 7), annars null. Sifferord ritas som siffermärke, aldrig som keycap-emoji. */
export function numberOf(conceptId: string): number | null {
  const i = NUMBER_WORDS.indexOf(conceptId);
  return i < 0 ? null : i + 1;
}

/** Bandens färger som hex (samma som BANDS-gradienterna) för SVG, där Tailwind-klasser inte når. */
export const BAND_HEX: Record<Band, readonly [string, string]> = {
  1: ["#34d399", "#22c55e"], // emerald-400 → green-500
  2: ["#fbbf24", "#eab308"], // amber-400 → yellow-500
  3: ["#fb923c", "#ea580c"], // orange-400 → orange-600
  4: ["#f43f5e", "#dc2626"], // rose-500 → red-600
};
