import { useEffect, useState } from "react";
import { lessonWords, distractorPool, pickDistractors, labelOf } from "../data/concepts";
import { getLanguage } from "../data/languages";
import { LEVEL_COUNT } from "../data/levels";
import { useSettings } from "../stores/useSettings";
import { useSpeech } from "../hooks/useSpeech";
import { useLesson } from "../hooks/useLesson";
import { SpeakableText } from "../components/SpeakableText";
import { CategoryPicker } from "../components/CategoryPicker";
import { LevelPicker } from "../components/LevelPicker";
import { GameHeader } from "../components/GameHeader";
import { QuestionStage, BigPicture, RoundCount } from "../components/QuestionStage";
import { FitGrid } from "../components/FitGrid";
import { ChoiceButton } from "../components/ChoiceButton";
import { choiceState } from "../lib/choice";
import { Coach } from "../components/Coach";
import { useCoach } from "../hooks/useCoach";
import { VictoryScreen } from "../components/VictoryScreen";
import { Button } from "../components/Button";
import { difficulty } from "../lib/difficulty";
import { shuffle } from "../lib/shuffle";
import { cn } from "../lib/cn";
import { fitText } from "../lib/fit";
import { GAME_MAIN, PROMPT_TEXT } from "../lib/layout";
import type { Concept, Level, PlayCategory } from "../types";

type QuizQ = { concept: Concept; options: Concept[] };

/** Det stora ordet krymper med längden (καμηλοπάρδαλη, восемнадцать) och avstavas som sista utväg. */
const BIG_WORD = [
  [7, "text-[clamp(1.75rem,9vw,2.25rem)] md:text-5xl"],
  [10, "text-[clamp(1.5rem,7.5vw,2rem)] md:text-4xl"],
] as const;

/**
 * Ord & bilder: bläddra bland orden (lär), sen ett quiz "vilken bild är …".
 * Högre nivåer: fler ord, längre quiz, fler och mer lika bilder, mindre hjälp.
 */
export default function FlashcardsGame() {
  const lang = useSettings((s) => s.lang);
  const { speak } = useSpeech();
  const lesson = useLesson("flashcards");
  const coach = useCoach();

  const [category, setCategory] = useState<PlayCategory | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [phase, setPhase] = useState<"browse" | "quiz">("browse");
  const [index, setIndex] = useState(0);
  const [quiz, setQuiz] = useState<QuizQ[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const d = level ? difficulty(level, gold) : null;
  const current = concepts[index];
  const label = current ? labelOf(current, lang) : "";

  // Läs upp automatiskt när kortet byts (inte på mästarnivåerna)
  useEffect(() => {
    if (phase === "browse" && current && d && d.help !== "none") speak(label, lang, current.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, index, lang, phase]);

  const startLevel = (lvl: Level, isGold = false) => {
    if (!category) return;
    const dd = difficulty(lvl, isGold);
    // Antal ord att lära: 4 → 8
    setConcepts(lessonWords(category, lvl, Math.min(8, 3 + dd.band + (dd.step > 3 ? 1 : 0))));
    setLevel(lvl);
    setGold(isGold);
    setPhase("browse");
    setIndex(0);
    setQIndex(0);
    setPicked(null);
    lesson.reset();
  };

  // Quiz: varje inlärt ord frågas (minst 3, fler på högre nivåer)
  const startQuiz = () => {
    if (!category || !level || !d) return;
    const pool = distractorPool(category, level);
    // varje inlärt ord frågas exakt en gång, i ny ordning (inga upprepningar)
    setQuiz(
      shuffle(concepts).map((c) => ({
        concept: c,
        options: shuffle([c, ...pickDistractors(c, pool, d.options - 1, d.t)]),
      }))
    );
    setQIndex(0);
    setPicked(null);
    lesson.reset();
    setPhase("quiz");
  };

  const q = quiz[qIndex];
  const qLabel = q ? labelOf(q.concept, lang) : "";

  useEffect(() => {
    if (phase === "quiz" && q) speak(qLabel, lang, q.concept.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIndex]);

  const answer = (opt: Concept) => {
    if (picked !== null || !q || !category || !level) return;
    setPicked(opt.id);
    if (opt.id === q.concept.id) {
      coach.cheer(lesson.correct());
      window.setTimeout(() => {
        if (qIndex === quiz.length - 1) lesson.finish(category, level, gold, quiz.length);
        else {
          setQIndex((n) => n + 1);
          setPicked(null);
        }
      }, 700);
    } else {
      lesson.wrong();
      coach.comfort();
      window.setTimeout(() => setPicked(null), 800);
    }
  };

  if (!category) return <CategoryPicker game="flashcards" title="Ord & bilder" onPick={setCategory} />;

  if (!level || !d)
    return (
      <LevelPicker
        game="flashcards"
        category={category}
        onPick={(l) => startLevel(l)}
        onPickGold={(l) => startLevel(l, true)}
        onBack={() => setCategory(null)}
      />
    );

  if (lesson.done && lesson.result) {
    return (
      <VictoryScreen
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

  // Quiz: vilken bild?
  if (phase === "quiz" && q) {
    return (
      <main dir={getLanguage(lang).dir} className={GAME_MAIN}>
        <GameHeader
          onBack={() => setLevel(null)}
          progress={qIndex / quiz.length}
          level={level}
          gold={gold}
          combo={lesson.combo}
        />
        <QuestionStage qkey={`q${qIndex}`} split>
          <div className="stage-prompt">
            <p className={PROMPT_TEXT}>Vilken bild är …</p>
            {d.help === "none" ? (
              <SpeakableText
                text="🔊"
                conceptId={q.concept.id}
                className="rounded-full bg-white px-5 py-3 text-3xl shadow dark:bg-zinc-800"
              />
            ) : (
              <SpeakableText
                text={qLabel}
                lang={lang}
                conceptId={q.concept.id}
                className={cn(
                  "max-w-full font-bold text-purple-600 dark:text-purple-300",
                  fitText(qLabel, BIG_WORD, "text-2xl")
                )}
              />
            )}
          </div>
          {/* 5 bilder blir 3 + 2 (aldrig en ensam femte under skärmkanten) */}
          <FitGrid count={q.options.length}>
            {q.options.map((opt, i) => (
              <ChoiceButton
                key={opt.id}
                index={i}
                state={choiceState(opt.id, picked, q.concept.id)}
                onClick={() => answer(opt)}
                className="text-[calc(var(--tile)*0.5)]"
              >
                {opt.emoji}
              </ChoiceButton>
            ))}
          </FitGrid>
          <RoundCount n={qIndex + 1} of={quiz.length} />
        </QuestionStage>
        <Coach event={coach.event} />
      </main>
    );
  }

  // Bläddra & lär (skydd som i de andra spelen: inget kort → tillbaka till nivåerna)
  if (!current) {
    return (
      <main className={GAME_MAIN}>
        <GameHeader onBack={() => setLevel(null)} progress={0} level={level} gold={gold} />
      </main>
    );
  }
  const isLast = index === concepts.length - 1;
  const last = concepts.length - 1;
  return (
    <main dir={getLanguage(lang).dir} className={GAME_MAIN}>
      <GameHeader onBack={() => setLevel(null)} progress={(index + 1) / concepts.length / 2} level={level} gold={gold} />

      {/* Liggande mobil: kortet till vänster, bläddringen till höger */}
      <QuestionStage qkey={`b${index}`} className="short:flex-row short:gap-6">
        <div className="w-full rounded-3xl bg-white p-6 text-center shadow-xl sm:p-10 dark:bg-zinc-800 short:w-auto short:min-w-64 short:max-w-[55%] short:p-4">
          <BigPicture className="text-8xl short:text-7xl md:text-9xl">{current.emoji}</BigPicture>
          <SpeakableText
            text={label}
            lang={lang}
            conceptId={current.id}
            className={cn("mt-4 max-w-full font-bold text-purple-600 dark:text-purple-300 short:mt-2", fitText(label, BIG_WORD, "text-2xl"))}
          />
        </div>

        <div className="flex items-center gap-4 short:flex-col short:gap-3">
          <Button
            disabled={index === 0}
            onClick={() => setIndex(Math.max(0, index - 1))}
            aria-label="Förra kortet"
            className="bg-white text-purple-600 dark:bg-zinc-800 dark:text-purple-300"
          >
            <span className="inline-block rtl:rotate-180">←</span>
          </Button>
          <span dir="ltr" className="font-semibold text-zinc-500 dark:text-zinc-400">
            {index + 1} / {concepts.length}
          </span>
          {isLast ? (
            <Button onClick={startQuiz} className="bg-emerald-500 text-white">
              Visa vad du kan! ⭐
            </Button>
          ) : (
            // Steget räknas från kortet som syns (inte i => i + 1): ett dubbeltryck hoppar aldrig förbi sista kortet
            <Button onClick={() => setIndex(Math.min(last, index + 1))} className="bg-purple-500 text-white">
              Nästa <span className="inline-block rtl:rotate-180">→</span>
            </Button>
          )}
        </div>
      </QuestionStage>
    </main>
  );
}
