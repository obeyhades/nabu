import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
// useProfile importeras först: dess sparning laddas synkront, så stjärnorna
// finns redan när seedOnce körs längst ner i filen.
import { useProfile } from "./useProfile";
import { todayStr } from "./useStats";
import { safeStorage } from "../lib/safeStorage";
import { sumStars } from "../lib/progress";
import { canBuy, firstFreeSlot, isOwnedItem, sanitizeNest, seedGifts } from "../lib/rewards";
import { DEFAULT_SLOTS, ITEM_BY_ID, WELCOME_CAP, slotsFor } from "../data/nestItems";
import type { ItemId, NestSlot, OwnedItem } from "../types";

/**
 * Nabus bo och Stjärnpåsen.
 * Påsen räknas fram: saldo = intjänat − Σ betalt för köpta saker (balanceOf i
 * lib/rewards). `earned` växer bara (finish, seedOnce, Admin-test). Att lämna
 * tillbaka en sak tar bort posten och ger därmed 100 % tillbaka.
 * Profilens stjärnor läses aldrig för köp och skrivs aldrig härifrån.
 * Ingen import av useStickers här (boken anropar boet, aldrig tvärtom).
 */
type NestState = {
  earned: number; // växer bara
  welcome: number | null; // null = inte sådd än (vaktpost); reset() → 0
  introDone: boolean;
  owned: Record<ItemId, OwnedItem>; // startsakerna lagras aldrig här
  slots: Partial<Record<NestSlot, ItemId>>; // inkl. hatt/hals
  lampOn: boolean;
  wish: ItemId | null;
  grow: Record<ItemId, 0 | 1 | 2>;
  /**
   * Engångs-välkomst i påsen för en befintlig sparning: min(Σ stjärnor, 60),
   * plus Medaljen/Mästarkronan om sparningen redan uppfyller villkoret.
   */
  seedOnce: (stars: Record<string, number>) => void;
  /** Nya bästa stjärnor från en lektion. */
  earn: (n: number) => void;
  /** Bara föräldrasidan (test). */
  addTestStars: (n: number) => void;
  buy: (id: ItemId) => boolean;
  returnItem: (id: ItemId) => void;
  gift: (ids: ItemId[]) => void;
  place: (id: ItemId, slot: NestSlot) => void;
  stow: (slot: NestSlot) => void;
  toggleLamp: () => void;
  /** Ett växtsteg per anrop (UI:t räknar de tre vattendropparna). Vissnar aldrig. */
  water: (id: ItemId) => void;
  setWish: (id: ItemId | null) => void;
  finishIntro: () => void;
  reset: () => void;
};

type NestData = Pick<NestState, "earned" | "welcome" | "introDone" | "owned" | "slots" | "lampOn" | "wish" | "grow">;

const positive = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** Platserna utan saken (en sak sitter bara på ett ställe). */
function without(slots: NestData["slots"], id: ItemId): NestData["slots"] {
  const next = { ...slots };
  for (const slot of Object.keys(next) as NestSlot[]) if (next[slot] === id) delete next[slot];
  return next;
}

export const useNest = create<NestState>()(
  persist(
    (set) => ({
      earned: 0,
      welcome: null,
      introDone: false,
      owned: {},
      slots: { ...DEFAULT_SLOTS },
      lampOn: false,
      wish: null,
      grow: {},

      // Medaljen/Mästarkronan om villkoret redan är uppfyllt (kan annars aldrig korsas).
      // Bärsaker sätts aldrig på Nabu automatiskt – de väntar i Förrådet.
      seedOnce: (stars) =>
        set((s) => {
          if (s.welcome !== null) return {};
          const w = Math.min(sumStars(stars), WELCOME_CAP);
          let owned = s.owned;
          for (const id of seedGifts(stars))
            if (ITEM_BY_ID.has(id) && !owned[id]) owned = { ...owned, [id]: { at: todayStr(), via: "gift", paid: 0 } };
          return { welcome: w, earned: s.earned + w, owned };
        }),

      earn: (n) => set((s) => (positive(n) ? { earned: s.earned + positive(n) } : {})),

      addTestStars: (n) => set((s) => (positive(n) ? { earned: s.earned + positive(n) } : {})),

      // Avgörs inne i set() så att två snabba tryck aldrig kan köpa på samma stjärnor.
      // Placeringen gör UI:t efteråt (första lediga giltiga platsen, annars den första).
      buy: (id) => {
        let ok = false;
        set((s) => {
          const item = ITEM_BY_ID.get(id);
          if (!item || !canBuy(s, id)) return {};
          ok = true;
          return {
            owned: { ...s.owned, [id]: { at: todayStr(), via: "buy", paid: item.price } },
            wish: s.wish === id ? null : s.wish,
          };
        });
        return ok;
      },

      // Bara köpta saker kan lämnas tillbaka; återbetalningen är underförstådd.
      returnItem: (id) =>
        set((s) => {
          if (s.owned[id]?.via !== "buy") return {};
          const owned = { ...s.owned };
          delete owned[id];
          return { owned, slots: without(s.slots, id) };
        }),

      // Idempotent. Nya saker flyttar in på första lediga plats – men hatt och
      // hals sätts aldrig på Nabu automatiskt.
      gift: (ids) =>
        set((s) => {
          let owned = s.owned;
          let slots = s.slots;
          for (const id of ids) {
            const item = ITEM_BY_ID.get(id);
            if (!item || isOwnedItem({ owned }, id)) continue;
            owned = { ...owned, [id]: { at: todayStr(), via: "gift", paid: 0 } };
            if (item.kind === "hat" || item.kind === "neck") continue;
            const slot = firstFreeSlot(item, slots);
            if (slot) slots = { ...slots, [slot]: id };
          }
          return owned === s.owned ? {} : { owned, slots };
        }),

      // En undanträngd sak finns kvar i Förrådet (den ägs fortfarande).
      place: (id, slot) =>
        set((s) => {
          const item = ITEM_BY_ID.get(id);
          if (!item || !isOwnedItem(s, id) || !slotsFor(item).includes(slot)) return {};
          if (s.slots[slot] === id) return {};
          return { slots: { ...without(s.slots, id), [slot]: id } };
        }),

      stow: (slot) =>
        set((s) => {
          if (!s.slots[slot]) return {};
          const slots = { ...s.slots };
          delete slots[slot];
          return { slots };
        }),

      toggleLamp: () => set((s) => ({ lampOn: !s.lampOn })),

      water: (id) =>
        set((s) => {
          const item = ITEM_BY_ID.get(id);
          if (!item || item.trick !== "grow" || !isOwnedItem(s, id)) return {};
          const stage = s.grow[id] ?? 0;
          if (stage >= 2) return {};
          return { grow: { ...s.grow, [id]: (stage + 1) as 1 | 2 } };
        }),

      setWish: (id) =>
        set((s) => {
          if (id === null) return { wish: null };
          const item = ITEM_BY_ID.get(id);
          if (!item || item.via !== "shop" || isOwnedItem(s, id)) return {};
          return { wish: id };
        }),

      finishIntro: () => set({ introDone: true }),

      // welcome: 0 (inte null) så att en återställning aldrig sår påsen igen
      reset: () =>
        set({
          earned: 0,
          welcome: 0,
          introDone: false,
          owned: {},
          slots: { ...DEFAULT_SLOTS },
          lampOn: false,
          wish: null,
          grow: {},
        }),
    }),
    {
      name: "nabu-nest",
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s): NestData => ({
        earned: s.earned,
        welcome: s.welcome,
        introDone: s.introDone,
        owned: s.owned,
        slots: s.slots,
        lampOn: s.lampOn,
        wish: s.wish,
        grow: s.grow,
      }),
      migrate: (persisted) => persisted as NestData,
      // Okända saker försvinner (= återbetalas), felaktiga platser töms.
      merge: (persisted, current) => {
        const s = sanitizeNest({ ...current, ...(persisted as Partial<NestData>) });
        return {
          ...s,
          earned: Number.isFinite(s.earned) && s.earned > 0 ? s.earned : 0,
          welcome: s.welcome === null || typeof s.welcome === "number" ? s.welcome : 0,
          introDone: s.introDone === true,
          lampOn: s.lampOn === true,
        };
      },
    }
  )
);

// Engångssådd för befintliga sparningar (skrivs direkt; körs aldrig om efter reset).
useNest.getState().seedOnce(useProfile.getState().stars);
