import { useEffect, useState } from "react";
import { CONCEPTS, conceptsByCategory, conceptsByLevel } from "../data/concepts";
import { getLanguage } from "../data/languages";
import { useSettings } from "../stores/useSettings";
import { useProfile } from "../stores/useProfile";
import { useStats, XP_PER_STAR } from "../stores/useStats";
import { useSpeech } from "../hooks/useSpeech";
import { SpeakableText } from "../components/SpeakableText";
import { CategoryPicker } from "../components/CategoryPicker";
import { LevelPicker } from "../components/LevelPicker";
import { ProgressBar } from "../components/ProgressBar";
import { BackButton } from "../components/BackButton";
import { VictoryScreen } from "../components/VictoryScreen";
import { Button } from "../components/Button";
import { celebrate } from "../lib/celebrate";
import { playCorrect, playWrong, playLevelUp } from "../lib/sfx";
import { starKey, goldStarKey } from "../lib/progress";
import { shuffle } from "../lib/shuffle";
import { cn } from "../lib/cn";
import type { Category, Concept, Level } from "../types";

const QUIZ_ROUNDS = 3;

type QuizQ = { concept: Concept; options: Concept[] };

export default function FlashcardsGame() {
  const lang = useSettings((s) => s.lang);
  const addStars = useProfile((s) => s.addStars);
  const completeLesson = useStats((s) => s.completeLesson);
  const { speak } = useSpeech();

  const [category, setCategory] = useState<Category | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [phase, setPhase] = useState<"browse" | "quiz">("browse");
  const [index, setIndex] = useState(0);
  const [quiz, setQuiz] = useState<QuizQ[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState(false);

  const current = concepts[index];
  const label = current ? current.labels[lang] ?? current.labels.sv ?? "" : "";
  const autoRead = level !== null && level <= 2 && !gold; // mindre hjälp högre upp/guld
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const xp = stars * XP_PER_STAR * (gold ? 2 : 1);

  // Läs upp automatiskt när kortet byts (bara lägre nivåer, ej guld)
  useEffect(() => {
    if (phase === "browse" && current && autoRead) speak(label, lang, current.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, lang, phase]);

  const startLevel = (lvl: Level, isGold = false) => {
    if (!category) return;
    setLevel(lvl);
    setGold(isGold);
    setConcepts(shuffle(conceptsByLevel(category, lvl)));
    setPhase("browse");
    setIndex(0);
    setQIndex(0);
    setMistakes(0);
    setPicked(null);
    setDone(false);
  };

  // Bygg quizet: "Vilken bild?" – hör/läs ordet, välj rätt emoji
  const startQuiz = () => {
    if (!category) return;
    const pool = category === "blandad" ? CONCEPTS : conceptsByCategory(category);
    const questions = shuffle(concepts)
      .slice(0, QUIZ_ROUNDS)
      .map((c) => {
        const distractors = shuffle(pool.filter((p) => p.id !== c.id)).slice(0, gold ? 3 : 2);
        return { concept: c, options: shuffle([c, ...distractors]) };
      });
    setQuiz(questions);
    setQIndex(0);
    setMistakes(0);
    setPicked(null);
    setPhase("quiz");
  };

  const q = quiz[qIndex];
  const qLabel = q ? q.concept.labels[lang] ?? q.concept.labels.sv ?? "" : "";

  // Läs upp quiz-frågans ord
  useEffect(() => {
    if (phase === "quiz" && q) speak(qLabel, lang, q.concept.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIndex]);

  const answer = (opt: Concept) => {
    if (picked !== null || !q || !category || !level) return;
    setPicked(opt.id);
    if (opt.id === q.concept.id) {
      playCorrect();
      window.setTimeout(() => {
        if (qIndex === quiz.length - 1) {
          const finalStars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
          addStars(gold ? goldStarKey("flashcards", category, level) : starKey("flashcards", category, level), finalStars);
          completeLesson(finalStars * XP_PER_STAR * (gold ? 2 : 1));
          celebrate();
          playLevelUp();
          setDone(true);
        } else {
          setQIndex((n) => n + 1);
          setPicked(null);
        }
      }, 650);
    } else {
      playWrong();
      setMistakes((m) => m + 1);
      window.setTimeout(() => setPicked(null), 800);
    }
  };

  // 1) Välj kategori
  if (!category) return <CategoryPicker title="Ord & bilder" onPick={setCategory} />;

  // 2) Välj nivå
  if (!level)
    return (
      <LevelPicker
        game="flashcards"
        category={category}
        onPick={(l) => startLevel(l)}
        onPickGold={(l) => startLevel(l, true)}
        onBack={() => setCategory(null)}
      />
    );

  // 3) Klar
  if (done) {
    return (
      <VictoryScreen
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

  // 4a) Quiz: vilken bild?
  if (phase === "quiz" && q) {
    return (
      <main dir={getLanguage(lang).dir} className="mx-auto flex min-h-screen max-w-xl flex-col p-6">
        <div className="flex items-center gap-3 pt-2">
          <BackButton onClick={() => setLevel(null)} />
          <ProgressBar value={(qIndex + 1) / quiz.length} />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <p className="font-semibold text-zinc-600 dark:text-zinc-300">Vilken bild är …</p>
          <SpeakableText
            text={qLabel}
            conceptId={q.concept.id}
            className="text-4xl font-bold text-purple-600 dark:text-purple-300"
          />
          <div className={cn("grid w-full gap-3", gold ? "grid-cols-2" : "grid-cols-3")}>
            {q.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => answer(opt)}
                disabled={picked !== null}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-3xl text-6xl shadow transition active:scale-95",
                  picked === null && "bg-white hover:-translate-y-0.5 dark:bg-zinc-800",
                  picked !== null && opt.id === q.concept.id && "bg-emerald-500",
                  picked !== null && opt.id !== q.concept.id && opt.id === picked && "bg-red-400",
                  picked !== null &&
                    opt.id !== q.concept.id &&
                    opt.id !== picked &&
                    "bg-white opacity-40 dark:bg-zinc-800"
                )}
              >
                {opt.emoji}
              </button>
            ))}
          </div>
          <span dir="ltr" className="font-semibold text-zinc-500 dark:text-zinc-400">
            {qIndex + 1} / {quiz.length}
          </span>
        </div>
      </main>
    );
  }

  // 4b) Bläddra & lär
  const isLast = index === concepts.length - 1;
  return (
    <main dir={getLanguage(lang).dir} className="mx-auto flex min-h-screen max-w-xl flex-col p-6">
      <div className="flex items-center gap-3 pt-2">
        <BackButton onClick={() => setLevel(null)} />
        <ProgressBar value={(index + 1) / concepts.length} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="w-full rounded-3xl bg-white p-10 text-center shadow-xl dark:bg-zinc-800">
          <div className="text-8xl">{current.emoji}</div>
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
            ←
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
              Nästa →
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
