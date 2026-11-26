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
import { QuestionStage, BigPicture } from "../components/QuestionStage";
import { ChoiceButton } from "../components/ChoiceButton";
import { choiceState } from "../lib/choice";
import { Coach } from "../components/Coach";
import { useCoach } from "../hooks/useCoach";
import { VictoryScreen } from "../components/VictoryScreen";
import { Button } from "../components/Button";
import { difficulty } from "../lib/difficulty";
import { shuffle } from "../lib/shuffle";
import { cn } from "../lib/cn";
import type { Concept, Level, PlayCategory } from "../types";

type QuizQ = { concept: Concept; options: Concept[] };

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
      <main dir={getLanguage(lang).dir} className="mx-auto flex min-h-screen max-w-xl flex-col p-6">
        <GameHeader
          onBack={() => setLevel(null)}
          progress={qIndex / quiz.length}
          level={level}
          gold={gold}
          combo={lesson.combo}
        />
        <QuestionStage qkey={`q${qIndex}`}>
          <p className="font-semibold text-zinc-600 dark:text-zinc-300">Vilken bild är …</p>
          {d.help === "none" ? (
            <SpeakableText
              text="🔊"
              conceptId={q.concept.id}
              className="rounded-full bg-white px-5 py-3 text-3xl shadow dark:bg-zinc-800"
            />
          ) : (
            <SpeakableText
              text={qLabel}
              conceptId={q.concept.id}
              className="text-4xl font-bold text-purple-600 dark:text-purple-300"
            />
          )}
          <div className={cn("grid w-full gap-3", q.options.length <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3")}>
            {q.options.map((opt, i) => (
              <ChoiceButton
                key={opt.id}
                index={i}
                state={choiceState(opt.id, picked, q.concept.id)}
                onClick={() => answer(opt)}
                className="aspect-square text-6xl"
              >
                {opt.emoji}
              </ChoiceButton>
            ))}
          </div>
          <span dir="ltr" className="font-semibold text-zinc-500 dark:text-zinc-400">
            {qIndex + 1} / {quiz.length}
          </span>
        </QuestionStage>
        <Coach event={coach.event} />
      </main>
    );
  }

  // Bläddra & lär (skydd som i de andra spelen: inget kort → tillbaka till nivåerna)
  if (!current) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <GameHeader onBack={() => setLevel(null)} progress={0} level={level} gold={gold} />
      </main>
    );
  }
  const isLast = index === concepts.length - 1;
  return (
    <main dir={getLanguage(lang).dir} className="mx-auto flex min-h-screen max-w-xl flex-col p-6">
      <GameHeader onBack={() => setLevel(null)} progress={(index + 1) / concepts.length / 2} level={level} gold={gold} />

      <QuestionStage qkey={`b${index}`}>
        <div className="w-full rounded-3xl bg-white p-10 text-center shadow-xl dark:bg-zinc-800">
          <BigPicture>{current.emoji}</BigPicture>
          <SpeakableText
            text={label}
            conceptId={current.id}
            className="mt-4 text-4xl font-bold text-purple-600 dark:text-purple-300"
          />
        </div>

        <div className="flex items-center gap-4">
          <Button
            disabled={index === 0}
            onClick={() => setIndex((i) => i - 1)}
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
            <Button onClick={() => setIndex((i) => i + 1)} className="bg-purple-500 text-white">
              Nästa <span className="inline-block rtl:rotate-180">→</span>
            </Button>
          )}
        </div>
      </QuestionStage>
    </main>
  );
}
