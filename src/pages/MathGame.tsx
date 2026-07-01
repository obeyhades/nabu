import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LevelPicker } from "../components/LevelPicker";
import { ProgressBar } from "../components/ProgressBar";
import { LevelUpBanner } from "../components/LevelUpBanner";
import { StarRating } from "../components/StarRating";
import { Button } from "../components/Button";
import { celebrate } from "../lib/celebrate";
import { playCorrect, playWrong, playLevelUp } from "../lib/sfx";
import { starKey } from "../lib/progress";
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Nivå 1 plus · 2 minus · 3 plus & minus (större) · 4 gånger
function makeProblem(level: Level): Problem {
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
  while (opts.size < 3) {
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
  const [problems, setProblems] = useState<Problem[]>([]);
  const [index, setIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const current = problems[index];
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;

  const startLevel = (lvl: Level) => {
    setLevel(lvl);
    setProblems(Array.from({ length: ROUNDS }, () => makeProblem(lvl)));
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
          addStars(starKey("math", MATH_CAT, level), stars);
          completeLesson(stars * XP_PER_STAR);
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
        onPick={startLevel}
        onBack={() => navigate("/dashboard")}
      />
    );

  // 2) Klar
  if (done) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-7xl">🎉</div>
        <h1 className="text-3xl font-bold">Bra räknat!</h1>
        <StarRating value={stars} size={44} />
        <p className="text-zinc-500 dark:text-zinc-400">
          +{stars * XP_PER_STAR} XP · {mistakes === 0 ? "Helt rätt!" : `${mistakes} fel`}
        </p>
        <LevelUpBanner />
        <div className="flex flex-wrap justify-center gap-3">
          {level < 4 && (
            <Button
              onClick={() => startLevel((level + 1) as Level)}
              className="bg-emerald-500 text-white"
            >
              Nästa nivå →
            </Button>
          )}
          <Button onClick={() => startLevel(level)} className="bg-indigo-500 text-white">
            Spela igen
          </Button>
          <Button
            onClick={() => setLevel(null)}
            className="bg-white text-indigo-600 dark:bg-zinc-800 dark:text-indigo-300"
          >
            Byt nivå
          </Button>
        </div>
      </main>
    );
  }

  // 3) Räkna
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col p-6">
      <div className="w-full pt-2">
        <ProgressBar value={index / ROUNDS} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        {/* Bildstöd på nivå 1 */}
        {level === 1 && (
          <div className="flex items-center gap-2 text-2xl">
            <span>{"🔵".repeat(current.a)}</span>
            <span className="font-bold text-indigo-500">+</span>
            <span>{"🟡".repeat(current.b)}</span>
          </div>
        )}

        <div className="flex items-baseline gap-3 text-6xl font-black">
          <span>{current.a}</span>
          <span className="text-indigo-500">{current.op}</span>
          <span>{current.b}</span>
          <span className="text-zinc-400">= ?</span>
        </div>

        <div className="grid w-full grid-cols-3 gap-3">
          {current.options.map((opt) => (
            <button
              key={opt}
              onClick={() => answer(opt)}
              disabled={picked !== null}
              className={cn(
                "rounded-3xl p-6 text-3xl font-black shadow transition active:scale-95",
                picked === null &&
                  "bg-white text-indigo-600 hover:-translate-y-0.5 dark:bg-zinc-800 dark:text-indigo-300",
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

        <Link to="/dashboard" className="text-zinc-400">
          ← Tillbaka
        </Link>
      </div>
    </main>
  );
}
