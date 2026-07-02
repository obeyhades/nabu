import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CONCEPTS } from "../data/concepts";
import { useSettings } from "../stores/useSettings";
import { useProfile } from "../stores/useProfile";
import { useStats, XP_PER_STAR } from "../stores/useStats";
import { useSpeech } from "../hooks/useSpeech";
import { LevelPicker } from "../components/LevelPicker";
import { ProgressBar } from "../components/ProgressBar";
import { BackButton } from "../components/BackButton";
import { VictoryScreen } from "../components/VictoryScreen";
import { celebrate } from "../lib/celebrate";
import { playCorrect, playWrong, playLevelUp } from "../lib/sfx";
import { starKey, goldStarKey } from "../lib/progress";
import { shuffle } from "../lib/shuffle";
import { cn } from "../lib/cn";
import type { Level } from "../types";

const ROUNDS = 5;
const COUNT_CAT = "all"; // räkna har ingen kategori

// Antal saker att räkna per nivå
const RANGE_BY_LEVEL: Record<Level, [number, number]> = {
  1: [1, 3],
  2: [2, 5],
  3: [4, 7],
  4: [6, 9],
};

// Siffer-ordens id:n (för uppläsning på valt språk – ljuden finns redan!)
const NUMBER_IDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

type Round = { emoji: string; count: number; options: number[] };

function randint(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Räkna! – "hur många ser du?" Bro mellan antal och siffra för de minsta. */
export default function CountingGame() {
  const navigate = useNavigate();
  const lang = useSettings((s) => s.lang);
  const addStars = useProfile((s) => s.addStars);
  const completeLesson = useStats((s) => s.completeLesson);
  const { speak } = useSpeech();

  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState(false);

  const current = rounds[index];
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const xp = stars * XP_PER_STAR * (gold ? 2 : 1);

  const startLevel = (lvl: Level, isGold = false) => {
    const [lo, hi] = RANGE_BY_LEVEL[lvl];
    const emojiPool = shuffle(
      CONCEPTS.filter((c) => c.category !== "numbers").map((c) => c.emoji)
    );
    const optionCount = isGold ? 4 : 3;
    const built: Round[] = Array.from({ length: ROUNDS }, (_, i) => {
      const count = randint(lo, hi);
      const opts = new Set<number>([count]);
      while (opts.size < optionCount) {
        const cand = count + randint(1, 2) * (Math.random() < 0.5 ? -1 : 1);
        if (cand >= 1 && cand <= 9) opts.add(cand);
      }
      return { emoji: emojiPool[i % emojiPool.length], count, options: shuffle([...opts]) };
    });
    setLevel(lvl);
    setGold(isGold);
    setRounds(built);
    setIndex(0);
    setMistakes(0);
    setPicked(null);
    setDone(false);
  };

  const answer = (opt: number) => {
    if (picked !== null || !current || !level) return;
    setPicked(opt);
    if (opt === current.count) {
      playCorrect();
      // säg siffran på valt språk (ljudklipp finns för 1–9)
      const numConcept = CONCEPTS.find((c) => c.id === NUMBER_IDS[current.count - 1]);
      if (numConcept) {
        speak(numConcept.labels[lang] ?? numConcept.labels.sv ?? "", lang, numConcept.id);
      }
      window.setTimeout(() => {
        if (index === ROUNDS - 1) {
          const finalStars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
          addStars(gold ? goldStarKey("counting", COUNT_CAT, level) : starKey("counting", COUNT_CAT, level), finalStars);
          completeLesson(finalStars * XP_PER_STAR * (gold ? 2 : 1));
          celebrate();
          playLevelUp();
          setDone(true);
        } else {
          setIndex((n) => n + 1);
          setPicked(null);
        }
      }, 900);
    } else {
      playWrong();
      setMistakes((m) => m + 1);
      window.setTimeout(() => setPicked(null), 800);
    }
  };

  // 1) Välj nivå (räkna hoppar över kategori)
  if (!level)
    return (
      <LevelPicker
        game="counting"
        category={COUNT_CAT}
        subtitle="Räkna!"
        onPick={(l) => startLevel(l)}
        onPickGold={(l) => startLevel(l, true)}
        onBack={() => navigate("/dashboard")}
      />
    );

  // 2) Klar
  if (done) {
    return (
      <VictoryScreen
        title="Bra räknat!"
        stars={stars}
        xp={xp}
        detail={mistakes === 0 ? "Helt rätt!" : `${mistakes} fel`}
        gold={gold}
        onNext={level < 4 && !gold ? () => startLevel((level + 1) as Level) : undefined}
        onReplay={() => startLevel(level, gold)}
        onChangeLevel={() => setLevel(null)}
      />
    );
  }

  // 3) Räkna sakerna
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col p-6">
      <div className="flex items-center gap-3 pt-2">
        <BackButton onClick={() => setLevel(null)} />
        <ProgressBar value={(index + 1) / ROUNDS} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <p className="font-semibold text-zinc-600 dark:text-zinc-300">Hur många ser du?</p>

        <div className="flex max-w-xs flex-wrap items-center justify-center gap-2 rounded-3xl bg-white p-6 text-5xl shadow-xl dark:bg-zinc-800">
          {Array.from({ length: current.count }).map((_, i) => (
            <span key={i} className="animate-pop" style={{ animationDelay: `${i * 0.08}s` }}>
              {current.emoji}
            </span>
          ))}
        </div>

        <div className={cn("grid w-full gap-3", gold ? "grid-cols-2" : "grid-cols-3")}>
          {current.options.map((opt) => (
            <button
              key={opt}
              onClick={() => answer(opt)}
              disabled={picked !== null}
              className={cn(
                "rounded-3xl p-6 text-4xl font-black shadow transition active:scale-95",
                picked === null &&
                  "bg-white text-rose-500 hover:-translate-y-0.5 dark:bg-zinc-800 dark:text-rose-300",
                picked !== null && opt === current.count && "bg-emerald-500 text-white",
                picked !== null && opt !== current.count && opt === picked && "bg-red-400 text-white",
                picked !== null &&
                  opt !== current.count &&
                  opt !== picked &&
                  "bg-white text-zinc-300 dark:bg-zinc-800 dark:text-zinc-600"
              )}
            >
              {opt}
            </button>
          ))}
        </div>

        <span dir="ltr" className="font-semibold text-zinc-500 dark:text-zinc-400">
          {index + 1} / {ROUNDS}
        </span>
      </div>
    </main>
  );
}
