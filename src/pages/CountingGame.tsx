import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CONCEPTS, labelOf } from "../data/concepts";
import { LEVEL_COUNT } from "../data/levels";
import { useSettings } from "../stores/useSettings";
import { useSpeech } from "../hooks/useSpeech";
import { useLesson } from "../hooks/useLesson";
import { LevelPicker } from "../components/LevelPicker";
import { GameHeader } from "../components/GameHeader";
import { QuestionStage, RoundCount } from "../components/QuestionStage";
import { FitGrid } from "../components/FitGrid";
import { ChoiceButton } from "../components/ChoiceButton";
import { choiceState } from "../lib/choice";
import { Coach } from "../components/Coach";
import { useCoach } from "../hooks/useCoach";
import { VictoryScreen } from "../components/VictoryScreen";
import { difficulty } from "../lib/difficulty";
import { shuffle } from "../lib/shuffle";
import { cn } from "../lib/cn";
import { GAME_MAIN, PROMPT_TEXT } from "../lib/layout";
import type { Level } from "../types";

const COUNT_CAT = "all"; // räkna har ingen kategori
const MAX = 20;

// Siffer-ordens id:n 1–20 (för uppläsning på valt språk – ljuden finns redan!)
const NUMBER_IDS = [
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];

/** Item = en sak på skärmen; `target` = ska räknas. */
type Round = { emoji: string; other: string | null; items: boolean[]; count: number; options: number[] };

function randint(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Hur många saker per nivå: 1–3 på nivå 1 → 10–20 på nivå 20.
 * Från nivå 13 blandas en annan sak in som inte ska räknas.
 */
function rangeFor(level: Level): [number, number] {
  const hi = Math.min(MAX, Math.round(3 + (level - 1) * (17 / 19)));
  const lo = Math.max(1, Math.round(hi * 0.5));
  return [lo, hi];
}

/** Rätt antal + de närmaste talen inom 1–20 (väljs ur en lista – kan aldrig fastna). */
function makeOptions(count: number, optionCount: number): number[] {
  const others = shuffle(Array.from({ length: MAX }, (_, i) => i + 1).filter((n) => n !== count)).sort(
    (a, b) => Math.abs(a - count) - Math.abs(b - count)
  );
  return shuffle([count, ...others.slice(0, optionCount - 1)]);
}

/** Räkna! – "hur många ser du?" Bro mellan antal och siffra för de minsta. */
export default function CountingGame() {
  const navigate = useNavigate();
  const lang = useSettings((s) => s.lang);
  const { speak } = useSpeech();
  const lesson = useLesson("counting");
  const coach = useCoach();

  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const current = rounds[index];

  const startLevel = (lvl: Level, isGold = false) => {
    const d = difficulty(lvl, isGold);
    const [lo, hi] = rangeFor(lvl);
    const emojiPool = shuffle(CONCEPTS.filter((c) => c.category !== "numbers").map((c) => c.emoji));
    const mixed = lvl >= 13 || isGold;
    let prev = 0;
    const built: Round[] = Array.from({ length: d.rounds }, (_, i) => {
      // aldrig samma antal två gånger i rad
      let count = randint(lo, hi);
      for (let t = 0; count === prev && hi > lo && t < 20; t++) count = randint(lo, hi);
      prev = count;
      const emoji = emojiPool[(i * 2) % emojiPool.length];
      const other = mixed ? emojiPool[(i * 2 + 1) % emojiPool.length] : null;
      const extra = other ? randint(2, Math.max(3, Math.round(count / 2))) : 0;
      const items = shuffle([...Array(count).fill(true), ...Array(extra).fill(false)]);
      return { emoji, other, items, count, options: makeOptions(count, Math.min(d.options, 5)) };
    });
    setRounds(built);
    setLevel(lvl);
    setGold(isGold);
    setIndex(0);
    setPicked(null);
    lesson.reset();
  };

  const answer = (opt: number) => {
    if (picked !== null || !current || !level) return;
    setPicked(opt);
    if (opt === current.count) {
      coach.cheer(lesson.correct());
      // säg talet på valt språk
      const numConcept = CONCEPTS.find((c) => c.id === NUMBER_IDS[current.count - 1]);
      if (numConcept) speak(labelOf(numConcept, lang), lang, numConcept.id);
      window.setTimeout(() => {
        if (index === rounds.length - 1) lesson.finish(COUNT_CAT, level, gold, rounds.length);
        else {
          setIndex((n) => n + 1);
          setPicked(null);
        }
      }, 1000);
    } else {
      lesson.wrong();
      coach.comfort();
      window.setTimeout(() => setPicked(null), 800);
    }
  };

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
  const big = current.items.length > 12;

  return (
    <main className={GAME_MAIN}>
      <GameHeader
        onBack={() => setLevel(null)}
        progress={index / rounds.length}
        level={level}
        gold={gold}
        combo={lesson.combo}
      />

      <QuestionStage qkey={index} split>
        <div className="stage-prompt">
          <p className={cn(PROMPT_TEXT, "text-lg")}>
            Hur många <span className="text-3xl align-middle">{current.emoji}</span> ser du?
          </p>

          <div
            className={cn(
              "grid gap-1.5 rounded-3xl bg-white p-5 shadow-xl dark:bg-zinc-800 short:p-3",
              big
                ? "grid-cols-5 text-3xl low:text-2xl md:text-4xl short:text-2xl"
                : "grid-cols-4 text-5xl sm:grid-cols-5 low:text-4xl md:text-6xl short:text-4xl"
            )}
          >
            {current.items.map((isTarget, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 14 }}
                className="flex items-center justify-center"
              >
                {isTarget ? current.emoji : current.other}
              </motion.span>
            ))}
          </div>
        </div>

        {/* 5 tal blir 3 + 2 och rutorna krymper i höjd: föremålen att räkna stannar i bild */}
        <FitGrid count={current.options.length} ratio={0.7} min={60} max={160}>
          {current.options.map((opt, i) => (
            <ChoiceButton
              key={opt}
              index={i}
              state={choiceState(opt, picked, current.count)}
              onClick={() => answer(opt)}
              className={cn(
                "text-[calc(var(--tile)*0.36)] font-black",
                picked === null && "text-rose-500 dark:text-rose-300"
              )}
            >
              {opt}
            </ChoiceButton>
          ))}
        </FitGrid>

        <RoundCount n={index + 1} of={rounds.length} />
      </QuestionStage>
      <Coach event={coach.event} />
    </main>
  );
}
