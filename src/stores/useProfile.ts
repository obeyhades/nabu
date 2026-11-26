import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "../lib/safeStorage";
import { migrateStarsV1 } from "../lib/progress";

const DEFAULT_AVATAR = "🦉";

type ProfileState = {
  name: string;
  avatar: string;
  stars: Record<string, number>; // nyckel: `${gameId}:${category}:${level}` -> 0-3
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
      // v2: 20 nivåer per stig i stället för 4
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<ProfileState>;
        if (version < 2 && p.stars) return { ...p, stars: migrateStarsV1(p.stars) } as ProfileState;
        return p as ProfileState;
      },
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<ProfileState>),
      }),
    }
  )
);
