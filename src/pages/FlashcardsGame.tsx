import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { conceptsByLevel } from "../data/concepts";
import { getLanguage } from "../data/languages";
import { useSettings } from "../stores/useSettings";
import { useProfile } from "../stores/useProfile";
import { useStats, XP_PER_STAR } from "../stores/useStats";
import { useSpeech } from "../hooks/useSpeech";
import { SpeakableText } from "../components/SpeakableText";
import { CategoryPicker } from "../components/CategoryPicker";
import { LevelPicker } from "../components/LevelPicker";
import { ProgressBar } from "../components/ProgressBar";
import { LevelUpBanner } from "../components/LevelUpBanner";
import { StarRating } from "../components/StarRating";
import { Button } from "../components/Button";
import { celebrate } from "../lib/celebrate";
import { playLevelUp } from "../lib/sfx";
import { starKey } from "../lib/progress";
import type { Category, Level } from "../types";

const XP = 3 * XP_PER_STAR; // flashcards ger alltid 3 stjärnor

export default function FlashcardsGame() {
  const lang = useSettings((s) => s.lang);
  const addStars = useProfile((s) => s.addStars);
  const completeLesson = useStats((s) => s.completeLesson);
  const { speak } = useSpeech();

  const [category, setCategory] = useState<Category | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const concepts = category && level ? conceptsByLevel(category, level) : [];
  const current = concepts[index];
  const label = current ? current.labels[lang] ?? current.labels.sv ?? "" : "";
  const autoRead = level !== null && level <= 2;

  useEffect(() => {
    if (current && autoRead) speak(label, lang, current.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, lang]);

  const startLevel = (lvl: Level) => {
    setLevel(lvl);
    setIndex(0);
    setDone(false);
  };

  const finish = () => {
    if (!category || !level) return;
    addStars(starKey("flashcards", category, level), 3);
    completeLesson(XP);
    celebrate();
    playLevelUp();
    setDone(true);
  };

  // 1) Välj kategori
  if (!category) return <CategoryPicker title="Ord & bilder" onPick={setCategory} />;

  // 2) Välj nivå
  if (!level)
    return (
      <LevelPicker
        game="flashcards"
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
        <StarRating value={3} size={44} />
        <p className="text-zinc-500 dark:text-zinc-400">+{XP} XP</p>
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
          <Button onClick={() => startLevel(level)} className="bg-purple-500 text-white">
            Spela igen
          </Button>
          <Button
            onClick={() => setLevel(null)}
            className="bg-white text-purple-600 dark:bg-zinc-800 dark:text-purple-300"
          >
            Byt nivå
          </Button>
        </div>
      </main>
    );
  }

  // 4) Spela
  const isLast = index === concepts.length - 1;
  return (
    <main dir={getLanguage(lang).dir} className="mx-auto flex min-h-screen max-w-xl flex-col p-6">
      <div className="w-full pt-2">
        <ProgressBar value={index / concepts.length} />
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
            <Button onClick={finish} className="bg-emerald-500 text-white">
              Klar! ⭐
            </Button>
          ) : (
            <Button onClick={() => setIndex((i) => i + 1)} className="bg-purple-500 text-white">
              Nästa →
            </Button>
          )}
        </div>

        <Link to="/dashboard" className="text-zinc-400">
          ← Tillbaka
        </Link>
      </div>
    </main>
  );
}
