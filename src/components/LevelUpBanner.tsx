import { cn } from "../lib/cn";
import { useStats } from "../stores/useStats";

/**
 * Visas på klar-skärmen när lektionen fick barnet att gå upp en spelar-nivå.
 * `compact`: en låg lapp i liten text (när belöningsremsan också tar plats), så att
 * "Nästa nivå" fortfarande syns på en liten mobil.
 */
export function LevelUpBanner({ compact = false }: { compact?: boolean }) {
  const justLeveled = useStats((s) => s.justLeveled);
  if (!justLeveled) return null;
  return (
    <div
      className={cn(
        "bg-gradient-to-r from-amber-400 to-orange-500 font-bold text-white shadow",
        // en rad på 375 px; på de allra smalaste skärmarna får den hellre radbryta än flöda ut
        compact ? "rounded-2xl px-3 py-1 text-sm" : "rounded-2xl px-5 py-2"
      )}
    >
      🎉 Ny nivå {justLeveled}! Du gick upp en nivå!
    </div>
  );
}
