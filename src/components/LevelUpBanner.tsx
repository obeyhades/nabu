import { useStats } from "../stores/useStats";

/** Visas på klar-skärmen när lektionen fick barnet att gå upp en spelar-nivå. */
export function LevelUpBanner() {
  const justLeveled = useStats((s) => s.justLeveled);
  if (!justLeveled) return null;
  return (
    <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2 font-bold text-white shadow">
      🎉 Ny nivå {justLeveled}! Du gick upp en nivå!
    </div>
  );
}
