import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { LevelUpBanner } from "../components/LevelUpBanner";
import { StarRating } from "../components/StarRating";
import { Button } from "../components/Button";
import { celebrate } from "../lib/celebrate";
import { playCorrect, playWrong, playLevelUp } from "../lib/sfx";
import { starKey } from "../lib/progress";
import { cn } from "../lib/cn";
import type { Category, Level, LangCode } from "../types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const firstLetter = (c: { labels: Partial<Record<LangCode, string>> }, lang: LangCode) =>
  (c.labels[lang] ?? c.labels.sv ?? "").charAt(0).toLocaleUpperCase();

export default function AbcGame() {
  const lang = useSettings((s) => s.lang);
  const addStars = useProfile((s) => s.addStars);
  const completeLesson = useStats((s) => s.completeLesson);
  const { speak } = useSpeech();

  const [category, setCategory] = useState<Category | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [index, setIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState(false);

  const concepts = category && level ? conceptsByLevel(category, level) : [];
  const current = concepts[index];
  const word = current ? current.labels[lang] ?? current.labels.sv ?? "" : "";
  const answer = word.charAt(0).toLocaleUpperCase();
  const showWord = level !== null && level <= 2; // dölj ordet på högre nivåer
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;

  // Nya svarsalternativ + läs upp ordet när frågan byts
  useEffect(() => {
    if (!current) return;
    const others = [
      ...new Set(
        CONCEPTS.map((c) => firstLetter(c, lang)).filter((l) => l && l !== answer)
      ),
    ];
    setOptions(shuffle([answer, ...shuffle(others).slice(0, 2)]));
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
          addStars(starKey("abc", category, level), stars);
          completeLesson(stars * XP_PER_STAR);
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

  const startLevel = (lvl: Level) => {
    setLevel(lvl);
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
        onPick={startLevel}
        onBack={() => setCategory(null)}
      />
    );

  // 3) Klar
  if (done) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-7xl">🎉</div>
        <h1 className="text-3xl font-bold">Bra jobbat!</h1>
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
          <Button onClick={() => startLevel(level)} className="bg-teal-500 text-white">
            Spela igen
          </Button>
          <Button
            onClick={() => setLevel(null)}
            className="bg-white text-teal-600 dark:bg-zinc-800 dark:text-teal-300"
          >
            Byt nivå
          </Button>
        </div>
      </main>
    );
  }

  // 4) Spela
  return (
    <main dir={getLanguage(lang).dir} className="mx-auto flex min-h-screen max-w-xl flex-col p-6">
      <div className="w-full pt-2">
        <ProgressBar value={index / concepts.length} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="text-8xl">{current.emoji}</div>

        {showWord && (
          <div className="text-3xl font-bold text-teal-600 dark:text-teal-300">{word}</div>
        )}

        <button
          onClick={() => speak(word, lang, current.id)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-teal-600 shadow active:scale-95 dark:bg-zinc-800 dark:text-teal-300"
        >
          <Volume2 size={18} /> Hör ordet
        </button>

        <p className="font-semibold text-zinc-600 dark:text-zinc-300">
          Vilken bokstav börjar ordet på?
        </p>

        <div className="grid w-full grid-cols-3 gap-3">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => choose(opt)}
              disabled={picked !== null}
              className={cn(
                "flex h-20 items-center justify-center rounded-3xl text-4xl font-black shadow transition active:scale-95",
                picked === null &&
                  "bg-white text-teal-600 hover:-translate-y-0.5 dark:bg-zinc-800 dark:text-teal-300",
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

        <Link to="/dashboard" className="text-zinc-400">
          ← Tillbaka
        </Link>
      </div>
    </main>
  );
}
