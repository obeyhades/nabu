import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { CONCEPTS, conceptsByCategory, conceptsByLevel } from "../data/concepts";
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
import type { Category, Concept, Level } from "../types";

const MAX_ROUNDS = 5;

type Round = { concept: Concept; options: Concept[] };

/**
 * Hör & hitta – ren hörförståelse: ordet spelas upp (ingen text, ingen bild-
 * ledtråd) och barnet väljer rätt bild. Högre nivåer = närmare distraktorer.
 */
export default function ListeningGame() {
  const lang = useSettings((s) => s.lang);
  const addStars = useProfile((s) => s.addStars);
  const completeLesson = useStats((s) => s.completeLesson);
  const { speak } = useSpeech();

  const [category, setCategory] = useState<Category | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState(false);

  const current = rounds[index];
  const word = current ? current.concept.labels[lang] ?? current.concept.labels.sv ?? "" : "";
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const xp = stars * XP_PER_STAR * (gold ? 2 : 1);

  const startLevel = (lvl: Level, isGold = false) => {
    if (!category) return;
    const levelConcepts = shuffle(conceptsByLevel(category, lvl)).slice(0, MAX_ROUNDS);
    const catPool = category === "blandad" ? CONCEPTS : conceptsByCategory(category);
    const optionCount = isGold ? 6 : 4;
    const built: Round[] = levelConcepts.map((c) => {
      // Högre nivåer: distraktorer från samma nivå (närmare varandra)
      const near = lvl >= 3 ? catPool.filter((p) => p.level === lvl && p.id !== c.id) : [];
      const far = catPool.filter((p) => p.id !== c.id && !near.includes(p));
      const distractors = shuffle([...shuffle(near), ...shuffle(far)].slice(0, optionCount - 1));
      return { concept: c, options: shuffle([c, ...distractors]) };
    });
    setLevel(lvl);
    setGold(isGold);
    setRounds(built);
    setIndex(0);
    setMistakes(0);
    setPicked(null);
    setDone(false);
  };

  // Spela upp ordet automatiskt vid varje ny fråga
  useEffect(() => {
    if (current) speak(word, lang, current.concept.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.concept.id, lang]);

  const choose = (opt: Concept) => {
    if (picked !== null || !current || !category || !level) return;
    setPicked(opt.id);
    if (opt.id === current.concept.id) {
      playCorrect();
      window.setTimeout(() => {
        if (index === rounds.length - 1) {
          const finalStars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
          addStars(gold ? goldStarKey("listen", category, level) : starKey("listen", category, level), finalStars);
          completeLesson(finalStars * XP_PER_STAR * (gold ? 2 : 1));
          celebrate();
          playLevelUp();
          setDone(true);
        } else {
          setIndex((n) => n + 1);
          setPicked(null);
        }
      }, 700);
    } else {
      playWrong();
      setMistakes((m) => m + 1);
      window.setTimeout(() => setPicked(null), 800);
    }
  };

  // 1) Välj kategori
  if (!category) return <CategoryPicker title="Hör & hitta" onPick={setCategory} />;

  // 2) Välj nivå
  if (!level)
    return (
      <LevelPicker
        game="listen"
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
        title="Bra lyssnat!"
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

  // 4) Lyssna & välj
  return (
    <main dir={getLanguage(lang).dir} className="mx-auto flex min-h-screen max-w-xl flex-col p-6">
      <div className="flex items-center gap-3 pt-2">
        <BackButton onClick={() => setLevel(null)} />
        <ProgressBar value={(index + 1) / rounds.length} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {/* Stor lyssna-knapp – ordet är hemligheten! */}
        <button
          onClick={() => speak(word, lang, current.concept.id)}
          aria-label="Hör ordet igen"
          className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow-xl transition hover:scale-105 active:scale-95"
        >
          <Volume2 size={52} />
        </button>
        <p className="font-semibold text-zinc-600 dark:text-zinc-300">
          Lyssna! Vilken bild hör du?
        </p>

        <div className={cn("grid w-full gap-3", gold ? "grid-cols-3" : "grid-cols-2")}>
          {current.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => choose(opt)}
              disabled={picked !== null}
              className={cn(
                "flex aspect-square items-center justify-center rounded-3xl text-6xl shadow transition active:scale-95",
                picked === null && "bg-white hover:-translate-y-0.5 dark:bg-zinc-800",
                picked !== null && opt.id === current.concept.id && "bg-emerald-500",
                picked !== null && opt.id !== current.concept.id && opt.id === picked && "bg-red-400",
                picked !== null &&
                  opt.id !== current.concept.id &&
                  opt.id !== picked &&
                  "bg-white opacity-40 dark:bg-zinc-800"
              )}
            >
              {opt.emoji}
            </button>
          ))}
        </div>

        <span dir="ltr" className="font-semibold text-zinc-500 dark:text-zinc-400">
          {index + 1} / {rounds.length}
        </span>
      </div>
    </main>
  );
}
