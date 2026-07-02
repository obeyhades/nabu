import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { CONCEPTS, conceptsByLevel } from "../data/concepts";
import { getLanguage } from "../data/languages";
import { useSettings } from "../stores/useSettings";
import { useProfile } from "../stores/useProfile";
import { useStats, XP_PER_STAR } from "../stores/useStats";
import { useSpeech } from "../hooks/useSpeech";
import { CategoryPicker } from "../components/CategoryPicker";
import { LevelPicker } from "../components/LevelPicker";
import { ProgressBar } from "../components/ProgressBar";
import { BackButton } from "../components/BackButton";
import { VictoryScreen } from "../components/VictoryScreen";
import { celebrate } from "../lib/celebrate";
import { playCorrect, playWrong, playLevelUp } from "../lib/sfx";
import { starKey, goldStarKey } from "../lib/progress";
import { shuffle } from "../lib/shuffle";
import { cn } from "../lib/cn";
import type { Category, Concept, Level, LangCode } from "../types";

const firstLetter = (c: { labels: Partial<Record<LangCode, string>> }, lang: LangCode) =>
  (c.labels[lang] ?? c.labels.sv ?? "").charAt(0).toLocaleUpperCase();

export default function AbcGame() {
  const lang = useSettings((s) => s.lang);
  const addStars = useProfile((s) => s.addStars);
  const completeLesson = useStats((s) => s.completeLesson);
  const { speak } = useSpeech();

  const [category, setCategory] = useState<Category | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [index, setIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState(false);

  const current = concepts[index];
  const word = current ? current.labels[lang] ?? current.labels.sv ?? "" : "";
  const answer = word.charAt(0).toLocaleUpperCase();
  const showWord = level !== null && level <= 2 && !gold; // dölj ordet på högre nivåer/guld
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const xp = stars * XP_PER_STAR * (gold ? 2 : 1);

  // Nya svarsalternativ + läs upp ordet när frågan byts
  useEffect(() => {
    if (!current) return;
    const others = [
      ...new Set(CONCEPTS.map((c) => firstLetter(c, lang)).filter((l) => l && l !== answer)),
    ];
    setOptions(shuffle([answer, ...shuffle(others).slice(0, gold ? 4 : 2)]));
    setPicked(null);
    speak(word, lang, current.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, lang]);

  const choose = (opt: string) => {
    if (picked !== null || !current || !category || !level) return;
    setPicked(opt);
    if (opt === answer) {
      playCorrect();
      window.setTimeout(() => {
        if (index === concepts.length - 1) {
          const finalStars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
          addStars(gold ? goldStarKey("abc", category, level) : starKey("abc", category, level), finalStars);
          completeLesson(finalStars * XP_PER_STAR * (gold ? 2 : 1));
          celebrate();
          playLevelUp();
          setDone(true);
        } else {
          setIndex((n) => n + 1);
        }
      }, 700);
    } else {
      playWrong();
      setMistakes((m) => m + 1);
      window.setTimeout(() => setPicked(null), 800);
    }
  };

  const startLevel = (lvl: Level, isGold = false) => {
    if (!category) return;
    setLevel(lvl);
    setGold(isGold);
    setConcepts(shuffle(conceptsByLevel(category, lvl)));
    setIndex(0);
    setMistakes(0);
    setPicked(null);
    setDone(false);
  };

  // 1) Välj kategori
  if (!category) return <CategoryPicker title="ABC-äventyr" onPick={setCategory} />;

  // 2) Välj nivå
  if (!level)
    return (
      <LevelPicker
        game="abc"
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

  // 4) Spela
  return (
    <main dir={getLanguage(lang).dir} className="mx-auto flex min-h-screen max-w-xl flex-col p-6">
      <div className="flex items-center gap-3 pt-2">
        <BackButton onClick={() => setLevel(null)} />
        <ProgressBar value={(index + 1) / concepts.length} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="text-8xl">{current.emoji}</div>

        {showWord && (
          <div className="text-3xl font-bold text-rose-500 dark:text-rose-300">{word}</div>
        )}

        <button
          onClick={() => speak(word, lang, current.id)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-500 shadow active:scale-95 dark:bg-zinc-800 dark:text-rose-300"
        >
          <Volume2 size={18} /> Hör ordet
        </button>

        <p className="font-semibold text-zinc-600 dark:text-zinc-300">
          Vilken bokstav börjar ordet på?
        </p>

        <div className={cn("grid w-full gap-3", gold ? "grid-cols-5" : "grid-cols-3")}>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => choose(opt)}
              disabled={picked !== null}
              className={cn(
                "flex h-20 items-center justify-center rounded-3xl text-4xl font-black shadow transition active:scale-95",
                picked === null &&
                  "bg-white text-rose-500 hover:-translate-y-0.5 dark:bg-zinc-800 dark:text-rose-300",
                picked !== null && opt === answer && "bg-emerald-500 text-white",
                picked !== null && opt !== answer && opt === picked && "bg-red-400 text-white",
                picked !== null &&
                  opt !== answer &&
                  opt !== picked &&
                  "bg-white text-zinc-300 dark:bg-zinc-800 dark:text-zinc-600"
              )}
            >
              {opt}
            </button>
          ))}
        </div>

        <span dir="ltr" className="font-semibold text-zinc-500 dark:text-zinc-400">
          {index + 1} / {concepts.length}
        </span>
      </div>
    </main>
  );
}
