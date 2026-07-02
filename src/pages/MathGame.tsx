import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LevelPicker } from "../components/LevelPicker";
import { ProgressBar } from "../components/ProgressBar";
import { BackButton } from "../components/BackButton";
import { VictoryScreen } from "../components/VictoryScreen";
import { celebrate } from "../lib/celebrate";
import { playCorrect, playWrong, playLevelUp } from "../lib/sfx";
import { starKey, goldStarKey } from "../lib/progress";
import { shuffle } from "../lib/shuffle";
import { useProfile } from "../stores/useProfile";
import { useStats, XP_PER_STAR } from "../stores/useStats";
import { cn } from "../lib/cn";
import type { Level } from "../types";

const ROUNDS = 5; // antal tal per nivå
const MATH_CAT = "all"; // matte har ingen kategori

type Op = "+" | "−" | "×";
type Problem = { a: number; b: number; op: Op; answer: number; options: number[] };

function randint(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Nivå 1 plus · 2 minus · 3 plus & minus (större) · 4 gånger
function makeProblem(level: Level, optionCount: number): Problem {
  let a: number, b: number, op: Op, answer: number;
  if (level === 1) {
    a = randint(1, 5);
    b = randint(1, 5);
    op = "+";
    answer = a + b;
  } else if (level === 2) {
    a = randint(2, 10);
    b = randint(1, a);
    op = "−";
    answer = a - b;
  } else if (level === 3) {
    if (Math.random() < 0.5) {
      a = randint(5, 15);
      b = randint(1, 20 - a);
      op = "+";
      answer = a + b;
    } else {
      a = randint(6, 20);
      b = randint(1, a);
      op = "−";
      answer = a - b;
    }
  } else {
    a = randint(1, 5);
    b = randint(1, 5);
    op = "×";
    answer = a * b;
  }

  const opts = new Set<number>([answer]);
  while (opts.size < optionCount) {
    const delta = randint(1, 3) * (Math.random() < 0.5 ? -1 : 1);
    const cand = answer + delta;
    if (cand >= 0) opts.add(cand);
  }
  return { a, b, op, answer, options: shuffle([...opts]) };
}

export default function MathGame() {
  const navigate = useNavigate();
  const addStars = useProfile((s) => s.addStars);
  const completeLesson = useStats((s) => s.completeLesson);

  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [index, setIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const current = problems[index];
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const xp = stars * XP_PER_STAR * (gold ? 2 : 1);

  const startLevel = (lvl: Level, isGold = false) => {
    setLevel(lvl);
    setGold(isGold);
    setProblems(Array.from({ length: ROUNDS }, () => makeProblem(lvl, isGold ? 4 : 3)));
    setIndex(0);
    setMistakes(0);
    setPicked(null);
    setDone(false);
  };

  const answer = (opt: number) => {
    if (picked !== null || !current || !level) return;
    setPicked(opt);
    if (opt === current.answer) {
      playCorrect();
      window.setTimeout(() => {
        if (index === ROUNDS - 1) {
          const finalStars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
          addStars(gold ? goldStarKey("math", MATH_CAT, level) : starKey("math", MATH_CAT, level), finalStars);
          completeLesson(finalStars * XP_PER_STAR * (gold ? 2 : 1));
          celebrate();
          playLevelUp();
          setDone(true);
        } else {
          setIndex((n) => n + 1);
          setPicked(null);
        }
      }, 650);
    } else {
      playWrong();
      setMistakes((m) => m + 1);
      window.setTimeout(() => setPicked(null), 800);
    }
  };

  // 1) Välj nivå (matte hoppar över kategori)
  if (!level)
    return (
      <LevelPicker
        game="math"
        category={MATH_CAT}
        subtitle="Matte"
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

  // 3) Räkna
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col p-6">
      <div className="flex items-center gap-3 pt-2">
        <BackButton onClick={() => setLevel(null)} />
        <ProgressBar value={(index + 1) / ROUNDS} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        {/* Bildstöd på nivå 1 */}
        {level === 1 && (
          <div className="flex items-center gap-2 text-2xl">
            <span>{"🔵".repeat(current.a)}</span>
            <span className="font-bold text-sky-500">+</span>
            <span>{"🟡".repeat(current.b)}</span>
          </div>
        )}

        <div className="flex items-baseline gap-3 text-6xl font-black">
          <span>{current.a}</span>
          <span className="text-sky-500">{current.op}</span>
          <span>{current.b}</span>
          <span className="text-zinc-400">= ?</span>
        </div>

        <div className={cn("grid w-full gap-3", gold ? "grid-cols-2" : "grid-cols-3")}>
          {current.options.map((opt) => (
            <button
              key={opt}
              onClick={() => answer(opt)}
              disabled={picked !== null}
              className={cn(
                "rounded-3xl p-6 text-3xl font-black shadow transition active:scale-95",
                picked === null &&
                  "bg-white text-sky-600 hover:-translate-y-0.5 dark:bg-zinc-800 dark:text-sky-300",
                picked !== null && opt === current.answer && "bg-emerald-500 text-white",
                picked !== null && opt !== current.answer && opt === picked && "bg-red-400 text-white",
                picked !== null &&
                  opt !== current.answer &&
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
