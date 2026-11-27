import { create } from "zustand";
import type { Reveal, StickerId } from "../types";

export type { Reveal } from "../types";

/**
 * Det vinstskärmen visar efter den senaste lektionen (RewardStrip läser `last`).
 * SPARAS INTE: en omladdning tömmer den, så en gammal belöning kan aldrig visas.
 * `useLesson.finish()` skriver alltid över `last` (även med en tom reveal) och
 * `useLesson.reset()` tömmer den.
 */
type RewardsState = {
  last: Reveal | null;
  show: (r: Omit<Reveal, "n">) => void;
  /** Barnet valde ett annat ord i valraden (efter ett lyckat `useStickers.choose`). */
  setChosen: (id: StickerId) => void;
  clear: () => void;
};

// Löpnummer per visning – blir React-nyckel så att remsan animeras på nytt
let seq = 0;

export const useRewards = create<RewardsState>()((set) => ({
  last: null,
  show: (r) => set({ last: { ...r, n: ++seq } }),
  setChosen: (id) =>
    set((s) => {
      const word = s.last?.word;
      if (!s.last || !word || word.chosen === id || !word.options.includes(id)) return {};
      return { last: { ...s.last, word: { ...word, chosen: id } } };
    }),
  clear: () => set({ last: null }),
}));

/** Har reveal något att visa? (Annars ritas ingen remsa och vinstskärmen behåller sin vanliga storlek.) */
export const hasRevealContent = (r: Reveal | null): boolean =>
  !!r &&
  (r.pouch > 0 ||
    !!r.word ||
    r.rain.length > 0 ||
    r.upgrades.length > 0 ||
    r.badges.length > 0 ||
    r.gifts.length > 0 ||
    r.allKnown);
