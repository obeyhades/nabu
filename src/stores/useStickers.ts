import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
// useProfile importeras först: dess sparning laddas synkront, så stjärnorna
// finns redan när seedOnce körs längst ner i filen.
import { useProfile } from "./useProfile";
import { useNest } from "./useNest";
import { todayStr } from "./useStats";
import { safeStorage } from "../lib/safeStorage";
import { backfillStickers, canChoose, pageComplete, sanitizeStickers, type LessonPlan } from "../lib/rewards";
import { OWL_STICKER, PAGE_BY_ID, PAGE_OF_STICKER } from "../data/stickers";
import type { Met, OwnedSticker, StickerId, StickerPageId } from "../types";

/**
 * Klistermärkesboken: vilka klistermärken barnet har (p: 0 = i kuvertet,
 * 1 = inklistrat), hur varje ord har övats (`met`) och vilka sidor som är klara.
 * Allt ges i useLesson.finish() via `apply` – utom sidgåvorna, som ges i
 * `place`/`placeAll` (ett tryck), aldrig under render eller i en effekt.
 */
type StickerState = {
  owned: Record<StickerId, OwnedSticker>;
  met: Record<string, Met>; // koncept-id → mastery
  donePages: StickerPageId[]; // engångsspärr: gåvan ges bara en gång per sida
  intro: { found: number; seen: boolean } | null; // null = inte sådd än (vaktpost)
  /** Engångssådd: klistermärken för det barnet redan klarat + Nabus uggla. */
  seedOnce: (stars: Record<string, number>) => void;
  /** Skriv en lektions plan (lib/rewards.planLesson) i ett enda set(). */
  apply: (plan: LessonPlan) => void;
  /** Byt det givna ordet mot ett annat bland valen. Bara medan det gamla väntar i kuvertet. */
  choose: (oldId: StickerId, newId: StickerId, options: StickerId[]) => boolean;
  /** Klistra in; returnerar sidan om den just blev klar (då flyttar gåvan in i boet). */
  place: (id: StickerId) => StickerPageId | null;
  placeAll: (pageId: StickerPageId) => StickerPageId | null;
  markIntroSeen: () => void;
  reset: () => void;
};

type StickerData = Pick<StickerState, "owned" | "met" | "donePages" | "intro">;
type Owned = StickerData["owned"];

/** Markera sidan som klar om sista platsen just fylldes (anropas inne i set). */
function completion(s: StickerData, pageId: StickerPageId, owned: Owned): StickerPageId | null {
  const page = PAGE_BY_ID.get(pageId);
  if (!page || s.donePages.includes(pageId) || !pageComplete(page, owned)) return null;
  return pageId;
}

/** Sidans gåva flyttar in i Nabus bo (ett tryck-anrop, efter set). */
function giveGift(pageId: StickerPageId | null) {
  const gift = pageId ? PAGE_BY_ID.get(pageId)?.gift : undefined;
  if (gift) useNest.getState().gift([gift]);
}

const isIntro = (v: unknown): v is NonNullable<StickerData["intro"]> =>
  !!v && typeof v === "object" && typeof (v as { found?: unknown }).found === "number";

export const useStickers = create<StickerState>()(
  persist(
    (set) => ({
      owned: {},
      met: {},
      donePages: [],
      intro: null,

      seedOnce: (stars) =>
        set((s) => {
          if (s.intro !== null) return {};
          const back = backfillStickers(stars, todayStr());
          const found = Object.keys(back).filter((id) => id !== OWL_STICKER && !s.owned[id]).length;
          return { owned: { ...back, ...s.owned }, intro: { found, seen: false } };
        }),

      apply: (plan) =>
        set((s) => {
          const owned = { ...s.owned };
          for (const g of plan.grant) {
            if (owned[g.id]) continue;
            const o: OwnedSticker = { at: plan.today, p: 0 };
            if (g.parts) o.parts = g.parts;
            if (g.tricky) o.tricky = g.tricky;
            owned[g.id] = o;
          }
          for (const p of plan.patch) if (owned[p.id]) owned[p.id] = { ...owned[p.id], ...p.set };
          return { owned, met: { ...s.met, ...plan.met } };
        }),

      choose: (oldId, newId, options) => {
        let ok = false;
        set((s) => {
          if (!canChoose(s.owned, oldId, newId, options)) return {};
          ok = true;
          const owned = { ...s.owned };
          const { at } = owned[oldId];
          delete owned[oldId];
          owned[newId] = { at, p: 0 };
          return { owned };
        });
        return ok;
      },

      place: (id) => {
        let done = null as StickerPageId | null;
        set((s) => {
          const have = s.owned[id];
          const pageId = PAGE_OF_STICKER.get(id);
          if (!have || have.p === 1 || !pageId) return {};
          const owned: Owned = { ...s.owned, [id]: { ...have, p: 1, pt: Date.now() } };
          done = completion(s, pageId, owned);
          return done ? { owned, donePages: [...s.donePages, done] } : { owned };
        });
        giveGift(done);
        return done;
      },

      // Alla sidans väntande på en gång (UI:t visar dem i en kaskad).
      // pt ökar ett steg per märke så att "senast inklistrade" behåller ordningen.
      placeAll: (pageId) => {
        let done = null as StickerPageId | null;
        set((s) => {
          const page = PAGE_BY_ID.get(pageId);
          if (!page || page.derived) return {};
          const owned: Owned = { ...s.owned };
          const now = Date.now();
          let n = 0;
          for (const shelf of page.shelves)
            for (const id of shelf.ids) {
              const have = owned[id];
              if (have?.p === 0) owned[id] = { ...have, p: 1, pt: now + n++ };
            }
          if (!n) return {};
          done = completion(s, pageId, owned);
          return done ? { owned, donePages: [...s.donePages, done] } : { owned };
        });
        giveGift(done);
        return done;
      },

      markIntroSeen: () => set((s) => ({ intro: { found: s.intro?.found ?? 0, seen: true } })),

      // Sår aldrig om (intro är inte null); Nabus uggla ges tillbaka direkt.
      reset: () =>
        set({
          owned: { [OWL_STICKER]: { at: todayStr(), p: 1, via: "gift" } },
          met: {},
          donePages: [],
          intro: { found: 0, seen: true },
        }),
    }),
    {
      name: "nabu-stickers",
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s): StickerData => ({ owned: s.owned, met: s.met, donePages: s.donePages, intro: s.intro }),
      migrate: (persisted) => persisted as StickerData,
      // Inklistrade märken försvinner aldrig (okända behålls men döljs);
      // okända ord i `met` och okända sidor i `donePages` tas bort.
      merge: (persisted, current) => {
        const s = sanitizeStickers({ ...current, ...(persisted as Partial<StickerData>) });
        return { ...s, intro: s.intro === null || isIntro(s.intro) ? s.intro : { found: 0, seen: true } };
      },
    }
  )
);

/**
 * De `n` senast inklistrade ordklistermärkena, nyast först (Ordtavlan i boet).
 * Bara märken som har en sida i boken räknas.
 */
export function recentPlacedWords(owned: Owned, n = 4): StickerId[] {
  return Object.entries(owned)
    .filter(([id, o]) => o.p === 1 && id.startsWith("w:") && PAGE_OF_STICKER.has(id))
    .sort(([, a], [, b]) => (b.pt ?? 0) - (a.pt ?? 0))
    .slice(0, n)
    .map(([id]) => id);
}

// Engångssådd för befintliga sparningar (skrivs direkt; körs aldrig om efter reset).
useStickers.getState().seedOnce(useProfile.getState().stars);
