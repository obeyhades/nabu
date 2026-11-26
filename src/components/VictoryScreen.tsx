import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mascot } from "./Mascot";
import { Button } from "./Button";
import { LevelUpBanner } from "./LevelUpBanner";
import { RewardStrip } from "./RewardStrip";
import { cn } from "../lib/cn";
import { wornItem } from "../lib/rewards";
import { hasRevealContent, useRewards } from "../stores/useRewards";
import { useNest } from "../stores/useNest";
import { useSettings } from "../stores/useSettings";
import { useStats } from "../stores/useStats";

/**
 * Gemensam vinstskärm för alla spel: jublande uggla på solstråle-snurr,
 * stjärnor som poppar in en i taget, XP och tydliga knappar med ikoner
 * (inklusive Hem – ingen återvändsgränd).
 *
 * Belöningsremsan (RewardStrip) läser själv vad lektionen gav. Finns det något
 * att visa blir skärmen lite tätare (gap-4, mindre uggla) så att "Nästa nivå"
 * syns även på en liten mobil. Gick barnet dessutom upp en spelar-nivå blir den
 * ännu tätare (gap-3, ännu mindre uggla och stjärnor) och nivålappen låg (text-sm).
 * Det avgörs en gång vid visning – finish() har redan skrivit belöningen och
 * nivån innan skärmen visas, så inget hoppar.
 */
export function VictoryScreen({
  title = "Bra jobbat!",
  stars,
  xp,
  detail,
  gold = false,
  bestCombo = 0,
  onNext,
  onReplay,
  onChangeLevel,
}: {
  title?: string;
  stars: number; // 0–3
  xp: number;
  detail?: string; // t.ex. "Helt rätt!" eller "2 fel"
  gold?: boolean;
  bestCombo?: number; // flest rätt i rad under lektionen
  onNext?: () => void; // visas bara om satt (inte på sista nivån)
  onReplay: () => void;
  onChangeLevel: () => void;
}) {
  const navigate = useNavigate();
  const hatInGames = useSettings((s) => s.hatInGames);
  const hatOn = useNest((s) => wornItem(s, "hat") !== null) && hatInGames;
  // Samma regel som i RewardStrip: utan Stjärnboden räknas påsen inte som innehåll
  const [compact] = useState(() => {
    const last = useRewards.getState().last;
    return hasRevealContent(last && !useSettings.getState().shopOn ? { ...last, pouch: 0 } : last);
  });
  // Remsa + nivålapp samtidigt: allt måste rymmas ovanför Safaris verktygsfält (375 × 548)
  const [tight] = useState(() => compact && !!useStats.getState().justLeveled);

  return (
    <main
      className={cn(
        "flex min-h-screen flex-col items-center justify-center p-6 text-center",
        tight ? "gap-3" : compact ? "gap-4" : "gap-6"
      )}
    >
      {/* Uggla + solstråle */}
      <div
        className={cn(
          "relative flex items-center justify-center",
          tight ? "h-28 w-28" : compact ? "h-32 w-32" : "h-44 w-44"
        )}
      >
        <div
          className="absolute inset-0 rounded-full opacity-30 blur-sm motion-safe:animate-[spin_24s_linear_infinite]"
          style={{
            background: gold
              ? "repeating-conic-gradient(rgba(250,204,21,0.9) 0deg 12deg, transparent 12deg 24deg)"
              : "repeating-conic-gradient(rgba(251,191,36,0.7) 0deg 12deg, transparent 12deg 24deg)",
          }}
        />
        <Mascot
          mood="cheer"
          plain={!hatInGames}
          className={cn("relative", tight ? "text-6xl" : compact ? "text-7xl" : "text-8xl")}
        />
        {/* Märket flyttar ner när Nabu bär hatt, så att det inte krockar med hatten */}
        <span aria-hidden className={cn("absolute -right-1 text-4xl", hatOn ? "-bottom-1" : "-top-1")}>
          {gold ? "🥇" : "🎉"}
        </span>
      </div>

      <h1 className="text-3xl font-bold">{gold ? "Guld klarat!" : title}</h1>

      {/* Stjärnor som poppar in en i taget */}
      <div className={cn("flex gap-2", tight ? "text-4xl" : "text-5xl")}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("animate-pop", i >= stars && "opacity-25 grayscale")}
            style={{ animationDelay: `${i * 0.18}s` }}
          >
            ⭐
          </span>
        ))}
      </div>

      <p className="text-zinc-500 dark:text-zinc-400">
        +{xp} XP{detail ? ` · ${detail}` : ""}
        {bestCombo >= 3 ? ` · 🔥 ${bestCombo} i rad` : ""}
      </p>

      <RewardStrip />

      <LevelUpBanner compact={compact} />

      <div className="flex flex-wrap justify-center gap-3">
        {onNext && (
          <Button onClick={onNext} className="bg-emerald-500 text-lg text-white">
            ▶️ Nästa nivå
          </Button>
        )}
        <Button onClick={onReplay} className="bg-purple-500 text-white">
          🔁 Spela igen
        </Button>
        <Button
          onClick={onChangeLevel}
          className="bg-white text-purple-600 dark:bg-zinc-800 dark:text-purple-300"
        >
          🗺️ Byt nivå
        </Button>
        <Button
          onClick={() => navigate("/dashboard")}
          className="bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          🏠 Hem
        </Button>
      </div>
    </main>
  );
}
