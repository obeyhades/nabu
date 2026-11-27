import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LevelPicker } from "../components/LevelPicker";
import { GameHeader } from "../components/GameHeader";
import { QuestionStage, RoundCount } from "../components/QuestionStage";
import { FitGrid } from "../components/FitGrid";
import { ChoiceButton } from "../components/ChoiceButton";
import { choiceState } from "../lib/choice";
import { Coach } from "../components/Coach";
import { useCoach } from "../hooks/useCoach";
import { VictoryScreen } from "../components/VictoryScreen";
import { LEVEL_COUNT } from "../data/levels";
import { useLesson } from "../hooks/useLesson";
import { difficulty } from "../lib/difficulty";
import { shuffle } from "../lib/shuffle";
import { cn } from "../lib/cn";
import { GAME_MAIN } from "../lib/layout";
import type { Level } from "../types";

const MATH_CAT = "all"; // matte har ingen kategori

type Op = "+" | "−" | "×" | "÷";
type Problem = { a: number; b: number; op: Op; answer: number; options: number[] };

function randint(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 20 nivåer i fyra räknesätt som blir svårare steg för steg:
 *  1–5 plus · 6–10 minus · 11–15 gånger · 16–20 delat (nivå 20 blandar allt).
 * Varje rad: [största svar / tal, vilka tabeller].
 */
const PLUS_MAX = [5, 8, 10, 15, 20]; // största summa
const MINUS_MAX = [5, 8, 10, 15, 20]; // största starttal
const TIMES_TABLES = [[1, 2], [2, 3], [2, 3, 5], [2, 3, 4, 5, 10], [2, 3, 4, 5, 6, 7, 8, 9, 10]];
const DIV_TABLES = [[2], [2, 3], [2, 3, 5], [2, 3, 4, 5, 10], [2, 3, 4, 5, 6, 7, 8, 9, 10]];

function opFor(level: Level): Op {
  if (level === LEVEL_COUNT) return (["+", "−", "×", "÷"] as const)[randint(0, 3)];
  if (level <= 5) return "+";
  if (level <= 10) return "−";
  if (level <= 15) return "×";
  return "÷";
}

function makeProblem(level: Level, optionCount: number): Problem {
  const op = opFor(level);
  // steg 0–4 inom räknesättet (nivå 20 = svåraste steget)
  const step = level === LEVEL_COUNT ? 4 : (level - 1) % 5;
  let a: number, b: number, answer: number;
  if (op === "+") {
    const max = PLUS_MAX[step];
    answer = randint(Math.max(2, Math.ceil(max / 2)), max);
    a = randint(1, answer - 1);
    b = answer - a;
  } else if (op === "−") {
    a = randint(Math.max(2, Math.ceil(MINUS_MAX[step] / 2)), MINUS_MAX[step]);
    b = randint(1, a - 1);
    answer = a - b;
  } else if (op === "×") {
    const tables = TIMES_TABLES[step];
    a = tables[randint(0, tables.length - 1)];
    b = randint(1, step < 2 ? 5 : 10);
    if (Math.random() < 0.5) [a, b] = [b, a];
    answer = a * b;
  } else {
    const tables = DIV_TABLES[step];
    b = tables[randint(0, tables.length - 1)];
    answer = randint(1, step < 2 ? 5 : 10);
    a = b * answer;
  }

  // Fel-alternativ nära rätt svar (aldrig negativa)
  const opts = new Set<number>([answer]);
  const spread = Math.max(3, Math.ceil(answer * 0.3));
  let guard = 0;
  while (opts.size < optionCount && guard++ < 200) {
    const cand = answer + randint(1, spread) * (Math.random() < 0.5 ? -1 : 1);
    if (cand >= 0) opts.add(cand);
  }
  for (let n = answer + 1; opts.size < optionCount; n++) opts.add(n);
  return { a, b, op, answer, options: shuffle([...opts]) };
}

/**
 * Bildstöd: prickar för små tal på de första stegen i varje räknesätt.
 * Större på surfplattan (md:) så att det går att räkna dem – men inte på en
 * liggande mobil (short:), där höjden behövs till svaren.
 */
function Visual({ p }: { p: Problem }) {
  const dot = (n: number, emoji: string) => (
    <span className="flex flex-wrap justify-center gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <motion.span
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.04, type: "spring", stiffness: 400 }}
        >
          {emoji}
        </motion.span>
      ))}
    </span>
  );
  if (p.op === "+" || p.op === "−") {
    return (
      <div className="flex max-w-xs items-center gap-2 text-2xl md:max-w-lg md:gap-3 md:text-4xl short:max-w-xs short:text-lg">
        {dot(p.a, "🔵")}
        <span className="font-bold text-sky-500">{p.op}</span>
        {dot(p.b, p.op === "+" ? "🟡" : "❌")}
      </div>
    );
  }
  if (p.op === "×") {
    // a grupper med b saker
    return (
      <div className="flex max-w-sm flex-wrap justify-center gap-2 text-xl md:max-w-xl md:gap-3 md:text-3xl short:max-w-sm short:text-base">
        {Array.from({ length: p.a }).map((_, i) => (
          <span key={i} className="rounded-xl bg-sky-100 px-1.5 py-1 dark:bg-sky-900/40">
            {dot(p.b, "🍎")}
          </span>
        ))}
      </div>
    );
  }
  // a saker delas i b högar
  return (
    <div className="flex max-w-sm flex-col items-center gap-1 text-xl md:max-w-xl md:text-3xl short:max-w-sm short:text-base">
      {dot(p.a, "🍬")}
      <span className="text-sm text-zinc-500 dark:text-zinc-400 md:text-xl short:text-sm">dela på {p.b} {"🧒".repeat(Math.min(p.b, 10))}</span>
    </div>
  );
}

export default function MathGame() {
  const navigate = useNavigate();
  const lesson = useLesson("math");
  const coach = useCoach();

  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const current = problems[index];

  const startLevel = (lvl: Level, isGold = false) => {
    const d = difficulty(lvl, isGold);
    // inga dubbletter i samma lektion (t.ex. "2 + 1" två gånger)
    const seen = new Set<string>();
    const list: Problem[] = [];
    for (let tries = 0; list.length < d.rounds && tries < 200; tries++) {
      const p = makeProblem(lvl, Math.min(d.options, 5));
      const key = `${p.a}${p.op}${p.b}`;
      if (seen.has(key) && tries < 150) continue;
      seen.add(key);
      list.push(p);
    }
    setProblems(list);
    setLevel(lvl);
    setGold(isGold);
    setIndex(0);
    setPicked(null);
    lesson.reset();
  };

  const answer = (opt: number) => {
    if (picked !== null || !current || !level) return;
    setPicked(opt);
    if (opt === current.answer) {
      coach.cheer(lesson.correct());
      window.setTimeout(() => {
        if (index === problems.length - 1) lesson.finish(MATH_CAT, level, gold, problems.length);
        else {
          setIndex((n) => n + 1);
          setPicked(null);
        }
      }, 650);
    } else {
      lesson.wrong();
      coach.comfort();
      window.setTimeout(() => setPicked(null), 800);
    }
  };

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

  if (lesson.done && lesson.result) {
    return (
      <VictoryScreen
        title="Bra räknat!"
        stars={lesson.result.stars}
        xp={lesson.result.xp}
        detail={lesson.mistakes === 0 ? "Helt rätt!" : `${lesson.mistakes} fel`}
        gold={gold}
        bestCombo={lesson.bestCombo}
        onNext={level < LEVEL_COUNT && !gold ? () => startLevel(level + 1) : undefined}
        onReplay={() => startLevel(level, gold)}
        onChangeLevel={() => setLevel(null)}
      />
    );
  }

  if (!current) return null;
  // Bildstöd på de två första stegen i varje räknesätt (inte i guld)
  const showVisual = !gold && level < LEVEL_COUNT && (level - 1) % 5 < 2;

  return (
    <main className={GAME_MAIN}>
      <GameHeader
        onBack={() => setLevel(null)}
        progress={index / problems.length}
        level={level}
        gold={gold}
        combo={lesson.combo}
      />

      <QuestionStage qkey={index} split>
        <div className="stage-prompt">
          {showVisual && <Visual p={current} />}

          {/* Talet krymper med skärmen: "100 ÷ 10 = ?" får plats även på 320 px */}
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex items-baseline gap-2 text-[clamp(2.25rem,12vw,3.75rem)] font-black sm:gap-3 short:text-4xl"
            dir="ltr"
          >
            <span>{current.a}</span>
            <span className="text-sky-500">{current.op}</span>
            <span>{current.b}</span>
            <span className="text-zinc-400">= ?</span>
          </motion.div>
        </div>

        <FitGrid count={current.options.length} ratio={0.7} min={60} max={170}>
          {current.options.map((opt, i) => (
            <ChoiceButton
              key={opt}
              index={i}
              state={choiceState(opt, picked, current.answer)}
              onClick={() => answer(opt)}
              className={cn(
                "text-[calc(var(--tile)*0.3)] font-black",
                picked === null && "text-sky-600 dark:text-sky-300"
              )}
            >
              {opt}
            </ChoiceButton>
          ))}
        </FitGrid>

        <RoundCount n={index + 1} of={problems.length} />
      </QuestionStage>
      <Coach event={coach.event} />
    </main>
  );
}
