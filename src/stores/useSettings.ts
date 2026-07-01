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
  setLang: (lang: LangCode) => void;
  toggleSound: () => void;
  setSpeechRate: (rate: number) => void;
  setAdminPin: (pin: string) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      lang: DEFAULT_LANG,
      soundOn: true,
      speechRate: 1,
      adminPin: "1234",
      setLang: (lang) => set({ lang }),
      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
      setSpeechRate: (speechRate) => set({ speechRate }),
      setAdminPin: (adminPin) => set({ adminPin }),
    }),
    {
      name: "nabu-settings",
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      // Saknade fält (t.ex. efter en app-uppdatering) får defaultvärden
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<SettingsState>),
      }),
    }
  )
);
