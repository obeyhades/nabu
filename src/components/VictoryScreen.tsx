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
 * Tätast (remsa + nivålapp) på en låg skärm (320 × 568): ett steg till – mindre
 * uggla, stjärnor och luft – så att knappraden ryms ovanför kanten.
 * Höjden styr också: på en låg skärm (low:) krymper ugglan, och på en liggande
 * mobil (short:) står ugglan och stjärnorna till vänster och belöningen och
 * knapparna till höger. "Nästa nivå" står först, de tre andra valen alltid på en rad.
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
    // Liggande mobil: ugglan och stjärnorna till vänster, belöningen och knapparna
    // till höger – "Nästa nivå" syns utan att scrolla. Låg skärm: mindre uggla och luft.
    <main
      className={cn(
        "flex min-h-dvh select-none flex-col items-center justify-center p-6 text-center low:p-4",
        "short:grid short:grid-cols-2 short:content-center short:gap-x-6 short:gap-y-0 short:px-6 short:py-3",
        tight ? "gap-3 low:gap-2 low:py-3" : compact ? "gap-4 low:gap-3" : "gap-6 low:gap-4"
      )}
    >
      <div className="contents short:flex short:flex-col short:items-center short:gap-2">
        {/* Uggla + solstråle */}
        <div
          className={cn(
            "relative flex items-center justify-center short:h-24 short:w-24",
            tight ? "h-28 w-28 low:h-24 low:w-24" : compact ? "h-32 w-32 low:h-28 low:w-28" : "h-44 w-44 low:h-32 low:w-32"
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
            className={cn(
              "relative short:text-6xl",
              tight ? "text-6xl low:text-5xl" : compact ? "text-7xl low:text-6xl" : "text-8xl low:text-7xl"
            )}
          />
          {/* Märket flyttar ner när Nabu bär hatt, så att det inte krockar med hatten */}
          <span aria-hidden className={cn("absolute -right-1 text-4xl short:text-3xl", hatOn ? "-bottom-1" : "-top-1")}>
            {gold ? "🥇" : "🎉"}
          </span>
        </div>

        <h1 className="text-3xl font-bold low:text-2xl">{gold ? "Guld klarat!" : title}</h1>

        {/* Stjärnor som poppar in en i taget */}
        <div className={cn("flex gap-2", tight ? "text-4xl low:text-3xl" : "text-5xl low:text-4xl")}>
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
      </div>

      <div className="contents short:flex short:flex-col short:items-center short:gap-3">
        <RewardStrip />

        <LevelUpBanner compact={compact} />

        {/* Nästa nivå är det stora valet; de andra tre ryms alltid på en rad (även 320 px).
            Surfplatta: bredare kolumn (samma som belöningsremsan). Nästa nivå är lika bred som
            raden under, så att kanterna linjerar */}
        <div className="flex w-full max-w-sm flex-col items-center gap-3 md:max-w-md">
          {onNext && (
            <Button onClick={onNext} className="w-full bg-emerald-500 text-lg text-white md:text-xl short:py-2.5 short:text-lg">
              ▶️ Nästa nivå
            </Button>
          )}
          <div className="grid w-full grid-cols-3 gap-2">
            <SmallAction icon="🔁" label="Spela igen" onClick={onReplay} className="bg-purple-500 text-white" />
            <SmallAction
              icon="🗺️"
              label="Byt nivå"
              onClick={onChangeLevel}
              className="bg-white text-purple-600 dark:bg-zinc-800 dark:text-purple-300"
            />
            <SmallAction
              icon="🏠"
              label="Hem"
              onClick={() => navigate("/dashboard")}
              className="bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

/** En av de tre små knapparna: ikon över text, minst 56 px hög. */
function SmallAction({
  icon,
  label,
  onClick,
  className,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-3xl px-1 py-2 text-sm font-semibold leading-tight shadow-lg transition-transform active:scale-95 md:text-base short:min-h-12 short:py-1",
        className
      )}
    >
      <span aria-hidden className="text-2xl leading-none short:text-xl">
        {icon}
      </span>
      {label}
    </button>
  );
}
