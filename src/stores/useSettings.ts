import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "../lib/safeStorage";
import { DEFAULT_LANG } from "../data/languages";
import type { LangCode } from "../types";

type SettingsState = {
  lang: LangCode;
  soundOn: boolean;
  speechRate: number; // uppläsnings-hastighet (0.8 = långsam, 1.2 = snabb)
  adminPin: string; // barnspärr till föräldrasidan (standard 1234)
  shopOn: boolean; // Stjärnboden i Nabus bo (köpa saker för stjärnor i påsen)
  hatInGames: boolean; // visa Nabus hatt i spelen (Coach och vinstskärmen)
  setLang: (lang: LangCode) => void;
  toggleSound: () => void;
  setSpeechRate: (rate: number) => void;
  setAdminPin: (pin: string) => void;
  setShopOn: (on: boolean) => void;
  setHatInGames: (on: boolean) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      lang: DEFAULT_LANG,
      soundOn: true,
      speechRate: 1,
      adminPin: "1234",
      shopOn: true,
      hatInGames: true,
      setLang: (lang) => set({ lang }),
      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
      setSpeechRate: (speechRate) => set({ speechRate }),
      setAdminPin: (adminPin) => set({ adminPin }),
      setShopOn: (shopOn) => set({ shopOn }),
      setHatInGames: (hatInGames) => set({ hatInGames }),
    }),
    {
      name: "nabu-settings",
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      // Saknade fält (t.ex. efter en app-uppdatering) får defaultvärden –
      // därför behövs ingen versionshöjning för shopOn/hatInGames.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<SettingsState>),
      }),
    }
  )
);
