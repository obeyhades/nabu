import { useNavigate } from "react-router-dom";
import { Mascot } from "./Mascot";
import { Button } from "./Button";
import { LevelUpBanner } from "./LevelUpBanner";
import { cn } from "../lib/cn";

/**
 * Gemensam vinstskärm för alla spel: jublande uggla på solstråle-snurr,
 * stjärnor som poppar in en i taget, XP och tydliga knappar med ikoner
 * (inklusive Hem – ingen återvändsgränd).
 */
export function VictoryScreen({
  title = "Bra jobbat!",
  stars,
  xp,
  detail,
  gold = false,
  onNext,
  onReplay,
  onChangeLevel,
}: {
  title?: string;
  stars: number; // 0–3
  xp: number;
  detail?: string; // t.ex. "Helt rätt!" eller "2 fel"
  gold?: boolean;
  onNext?: () => void; // visas bara om satt (inte på sista nivån)
  onReplay: () => void;
  onChangeLevel: () => void;
}) {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      {/* Uggla + solstråle */}
      <div className="relative flex h-44 w-44 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full opacity-30 blur-sm motion-safe:animate-[spin_24s_linear_infinite]"
          style={{
            background: gold
              ? "repeating-conic-gradient(rgba(250,204,21,0.9) 0deg 12deg, transparent 12deg 24deg)"
              : "repeating-conic-gradient(rgba(251,191,36,0.7) 0deg 12deg, transparent 12deg 24deg)",
          }}
        />
        <Mascot mood="cheer" className="relative text-8xl" />
        <span className="absolute -right-1 -top-1 text-4xl">{gold ? "🥇" : "🎉"}</span>
      </div>

      <h1 className="text-3xl font-bold">{gold ? "Guld klarat!" : title}</h1>

      {/* Stjärnor som poppar in en i taget */}
      <div className="flex gap-2 text-5xl">
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
      </p>

      <LevelUpBanner />

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
