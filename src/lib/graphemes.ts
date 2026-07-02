/**
 * Grafem-hantering för stavningsspelet. Arabiska bokstäver bär vokaltecken
 * (harakat) som INTE får bli egna "bokstavsknappar" – därför delar vi ord i
 * grafem-kluster (bas-tecken + diakriter hålls ihop) och jämför normaliserat.
 */

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/** Dela ett ord i grafem (t.ex. "قِطّة" → ["قِ","طّ","ة"], "katt" → k,a,t,t). */
export function graphemes(word: string): string[] {
  if (segmenter) return [...segmenter.segment(word)].map((s) => s.segment);
  return [...word]; // fallback: code points
}

/** Normalisera för jämförelse: gemener + utan arabiska diakriter/tatweel. */
export function normChar(s: string): string {
  return s.toLowerCase().replace(/[ً-ْٰـ]/g, "");
}
