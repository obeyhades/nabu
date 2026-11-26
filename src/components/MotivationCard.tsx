import { Link } from "react-router-dom";
import { useStats, todayStr, xpLevelInfo, currentStreak } from "../stores/useStats";
import { ProgressBar } from "./ProgressBar";
import { LevelRing } from "./LevelRing";
import { Mascot } from "./Mascot";

/**
 * Nabu-maskoten peppar + visar nivå, streak, XP och dagligt mål (Duolingo-stil).
 * Ugglan (med det den bär i boet) är en länk hem till Nabus bo.
 * XP skrivs som text utan ikon: ✨ är Blank-nivån och ⭐ är stjärnorna.
 */
export function MotivationCard() {
  const xp = useStats((s) => s.xp);
  const streak = useStats((s) => currentStreak(s.streak, s.lastPlayDate));
  const todayXp = useStats((s) => s.todayXp);
  const todayDate = useStats((s) => s.todayDate);
  const dailyGoal = useStats((s) => s.dailyGoal);

  const dayXp = todayDate === todayStr() ? todayXp : 0;
  const goalMet = dayXp >= dailyGoal;
  const { level, frac, into, span } = xpLevelInfo(xp);

  const msg = goalMet
    ? "Dagens mål klart – grymt jobbat! 🎉"
    : streak > 0
      ? `${streak} dagars streak! Fortsätt så. 🔥`
      : "Dags att lära dig något nytt!";

  return (
    <div className="rounded-3xl bg-white p-4 shadow dark:bg-zinc-800">
      <div className="flex items-center gap-3">
        <Link
          to="/nest"
          aria-label="Besök Nabus bo"
          className="shrink-0 rounded-full p-1 outline-none transition active:scale-95 focus-visible:ring-4 focus-visible:ring-purple-400"
        >
          <Mascot mood="idle" className="text-5xl" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{msg}</p>
          <div className="mt-0.5 flex gap-4 text-sm text-zinc-600 dark:text-zinc-300">
            <span title="Streak">🔥 {streak}</span>
            <span title="Total XP">
              <span dir="ltr">{xp}</span> XP
            </span>
          </div>
        </div>
        <div
          className="flex flex-col items-center"
          title={`Nivå ${level} · ${into}/${span} XP till nästa`}
        >
          <LevelRing level={level} frac={frac} />
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Nivå
          </span>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Dagens mål</span>
          <span>
            {dayXp} / {dailyGoal} XP
          </span>
        </div>
        <ProgressBar value={dailyGoal ? dayXp / dailyGoal : 0} />
      </div>
    </div>
  );
}
