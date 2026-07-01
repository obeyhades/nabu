import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "../lib/safeStorage";

/** Lokalt datum som YYYY-MM-DD (inte UTC – streaken följer barnets dygn). */
export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  return Math.round((db - da) / 86_400_000);
}

// Spelar-nivå från total XP. Tröskel för att NÅ nivå L = 25·L·(L-1).
// L1:0  L2:50  L3:150  L4:300  L5:500 … (snabbt i början, långsammare sen)
export function levelForXp(xp: number): number {
  let L = 1;
  while (25 * (L + 1) * L <= xp) L++;
  return L;
}

export function xpLevelInfo(xp: number): {
  level: number;
  into: number;
  span: number;
  frac: number;
  next: number;
} {
  const level = levelForXp(xp);
  const cur = 25 * level * (level - 1);
  const next = 25 * (level + 1) * level;
  const into = xp - cur;
  const span = next - cur;
  return { level, into, span, frac: span > 0 ? into / span : 0, next };
}

const DAILY_GOAL = 30; // XP per dag (≈ 1–2 lektioner)

type StatsState = {
  xp: number;
  streak: number;
  bestStreak: number;
  lastPlayDate: string; // "" om aldrig spelat
  todayXp: number;
  todayDate: string;
  dailyGoal: number;
  justLeveled: number | null; // ny nivå att fira (visas på klar-skärmen)
  completeLesson: (earned: number) => void;
  setDailyGoal: (n: number) => void;
  reset: () => void;
};

export const useStats = create<StatsState>()(
  persist(
    (set) => ({
      xp: 0,
      streak: 0,
      bestStreak: 0,
      lastPlayDate: "",
      todayXp: 0,
      todayDate: "",
      dailyGoal: DAILY_GOAL,
      justLeveled: null,

      completeLesson: (earned) =>
        set((s) => {
          const today = todayStr();
          let streak = s.streak;
          if (s.lastPlayDate === today) {
            // redan spelat idag – streaken är oförändrad
          } else if (s.lastPlayDate && daysBetween(s.lastPlayDate, today) === 1) {
            streak = s.streak + 1; // spelade igår → förläng
          } else {
            streak = 1; // ny eller bruten streak
          }
          const newXp = s.xp + earned;
          const leveledUp = levelForXp(newXp) > levelForXp(s.xp);
          const todayXp = s.todayDate === today ? s.todayXp + earned : earned;
          return {
            xp: newXp,
            streak,
            bestStreak: Math.max(s.bestStreak, streak),
            lastPlayDate: today,
            todayXp,
            todayDate: today,
            justLeveled: leveledUp ? levelForXp(newXp) : null,
          };
        }),

      setDailyGoal: (dailyGoal) => set({ dailyGoal: Math.max(10, dailyGoal) }),

      reset: () =>
        set({
          xp: 0,
          streak: 0,
          bestStreak: 0,
          lastPlayDate: "",
          todayXp: 0,
          todayDate: "",
          dailyGoal: DAILY_GOAL,
          justLeveled: null,
        }),
    }),
    {
      name: "nabu-stats",
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      // Behåll gammalt läge vid versionsbyte; merge fyller i nya fält med defaults.
      migrate: (persisted) => persisted as StatsState,
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<StatsState>) }),
    }
  )
);

/** XP per avklarad lektion, skalat med stjärnor (1–3 → 10/20/30). */
export const XP_PER_STAR = 10;
