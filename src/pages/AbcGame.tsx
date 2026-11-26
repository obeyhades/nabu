import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { CONCEPTS, lessonWords, labelOf } from "../data/concepts";
import { getLanguage } from "../data/languages";
import { LEVEL_COUNT } from "../data/levels";
import { useSettings } from "../stores/useSettings";
import { useSpeech } from "../hooks/useSpeech";
import { useLesson } from "../hooks/useLesson";
import { CategoryPicker } from "../components/CategoryPicker";
import { LevelPicker } from "../components/LevelPicker";
import { GameHeader } from "../components/GameHeader";
import { QuestionStage, BigPicture } from "../components/QuestionStage";
import { ChoiceButton } from "../components/ChoiceButton";
import { choiceState } from "../lib/choice";
import { Coach } from "../components/Coach";
import { useCoach } from "../hooks/useCoach";
import { VictoryScreen } from "../components/VictoryScreen";
import { difficulty } from "../lib/difficulty";
import { shuffle } from "../lib/shuffle";
import { cn } from "../lib/cn";
import type { Concept, Level, LangCode, PlayCategory } from "../types";

const firstLetter = (c: Concept, lang: LangCode) => labelOf(c, lang).charAt(0).toLocaleUpperCase();

/**
 * ABC-äventyr: "vilken bokstav börjar ordet på?". Högre nivåer: fler
 * bokstäver att välja bland, ordet visas inte och läses till sist inte upp.
 */
export default function AbcGame() {
  const lang = useSettings((s) => s.lang);
  const { speak } = useSpeech();
  const lesson = useLesson("abc");
  const coach = useCoach();

  const [category, setCategory] = useState<PlayCategory | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [index, setIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  const d = level ? difficulty(level, gold) : null;
  const current = concepts[index];
  const word = current ? labelOf(current, lang) : "";
  const answer = word.charAt(0).toLocaleUpperCase();

  // Nya svarsalternativ + läs upp ordet när frågan byts
  useEffect(() => {
    if (!current || !d) return;
    const others = [...new Set(CONCEPTS.map((c) => firstLetter(c, lang)).filter((l) => l && l !== answer))];
    setOptions(shuffle([answer, ...shuffle(others).slice(0, d.options - 1)]));
    setPicked(null);
    if (d.help !== "none") speak(word, lang, current.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, index, lang]);

  const choose = (opt: string) => {
    if (picked !== null || !current || !category || !level) return;
    setPicked(opt);
    if (opt === answer) {
      coach.cheer(lesson.correct());
      speak(word, lang, current.id);
      window.setTimeout(() => {
        if (index === concepts.length - 1) lesson.finish(category, level, gold, concepts.length);
        else setIndex((n) => n + 1);
      }, 800);
    } else {
      lesson.wrong();
      coach.comfort();
      window.setTimeout(() => setPicked(null), 800);
    }
  };

  const startLevel = (lvl: Level, isGold = false) => {
    if (!category) return;
    setConcepts(lessonWords(category, lvl, difficulty(lvl, isGold).rounds));
    setLevel(lvl);
    setGold(isGold);
    setIndex(0);
    setPicked(null);
    lesson.reset();
  };

  if (!category) return <CategoryPicker game="abc" title="ABC-äventyr" onPick={setCategory} />;

  if (!level || !d)
    return (
      <LevelPicker
        game="abc"
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

  if (!current) return null;

  return (
    <main dir={getLanguage(lang).dir} className="mx-auto flex min-h-screen max-w-xl flex-col p-6">
      <GameHeader
        onBack={() => setLevel(null)}
        progress={index / concepts.length}
        level={level}
        gold={gold}
        combo={lesson.combo}
      />

      <QuestionStage qkey={index}>
        <BigPicture>{current.emoji}</BigPicture>

        {d.help === "full" && <div className="text-3xl font-bold text-rose-500 dark:text-rose-300">{word}</div>}

        <button
          onClick={() => speak(word, lang, current.id)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-500 shadow active:scale-95 dark:bg-zinc-800 dark:text-rose-300"
        >
          <Volume2 size={18} /> Hör ordet
        </button>

        <p className="font-semibold text-zinc-600 dark:text-zinc-300">Vilken bokstav börjar ordet på?</p>

        <div className={cn("grid w-full gap-3", options.length <= 3 ? "grid-cols-3" : options.length === 4 ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-4")}>
          {options.map((opt, i) => (
            <ChoiceButton
              key={opt}
              index={i}
              state={choiceState(opt, picked, answer)}
              onClick={() => choose(opt)}
              className={cn("h-20 text-4xl font-black", picked === null && "text-rose-500 dark:text-rose-300")}
            >
              {opt}
            </ChoiceButton>
          ))}
        </div>

        <span dir="ltr" className="font-semibold text-zinc-500 dark:text-zinc-400">
          {index + 1} / {concepts.length}
        </span>
      </QuestionStage>
      <Coach event={coach.event} />
    </main>
  );
}
