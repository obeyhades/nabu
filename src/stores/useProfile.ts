import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "../lib/safeStorage";

const DEFAULT_AVATAR = "🦉";

type ProfileState = {
  name: string;
  avatar: string;
  stars: Record<string, number>; // nyckel: `${gameId}:${category}` -> 0-3
  setProfile: (name: string, avatar: string) => void;
  addStars: (key: string, stars: number) => void;
  resetProgress: () => void; // nollställ bara stjärnorna (behåll namn/avatar)
  unlockAll: (keys: string[]) => void; // ge 1 stjärna till alla nivåer (test)
  reset: () => void;
};

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      name: "",
      avatar: DEFAULT_AVATAR,
      stars: {},
      setProfile: (name, avatar) => set({ name, avatar }),
      addStars: (key, stars) =>
        set((s) => ({
          // spara bästa resultatet (första försökets stjärnor kan bara höjas)
          stars: { ...s.stars, [key]: Math.max(s.stars[key] ?? 0, stars) },
        })),
      resetProgress: () => set({ stars: {} }),
      unlockAll: (keys) =>
        set((s) => {
          const stars = { ...s.stars };
          for (const k of keys) stars[k] = Math.max(stars[k] ?? 0, 1);
          return { stars };
        }),
      reset: () => set({ name: "", avatar: DEFAULT_AVATAR, stars: {} }),
    }),
    {
      name: "nabu-profile",
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<ProfileState>),
      }),
    }
  )
);
