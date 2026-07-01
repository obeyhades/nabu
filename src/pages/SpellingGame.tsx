import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { conceptsByLevel } from "../data/concepts";
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
import { playWrong, playLevelUp } from "../lib/sfx";
import { starKey } from "../lib/progress";
import { cn } from "../lib/cn";
import type { Category, Level } from "../types";

const EXTRA_BY_LEVEL: Record<Level, number> = { 1: 0, 2: 1, 3: 2, 4: 3 };
const XP = 3 * XP_PER_STAR;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "").trim();

export default function SpellingGame() {
  const lang = useSettings((s) => s.lang);
  const addStars = useProfile((s) => s.addStars);
  const completeLesson = useStats((s) => s.completeLesson);
  const { speak } = useSpeech();
  const inputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<Category | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [index, setIndex] = useState(0);
  const [bank, setBank] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [wrong, setWrong] = useState(false);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);

  const concepts = category && level ? conceptsByLevel(category, level) : [];
  const current = concepts[index];
  const word = (current ? current.labels[lang] ?? current.labels.sv ?? "" : "")
    .toLowerCase()
    .replace(/\s+/g, "");

  useEffect(() => {
    if (!current || !level) return;
    const extra = EXTRA_BY_LEVEL[level];
    const pool = concepts
      .filter((c) => c.id !== current.id)
      .flatMap((c) =>
        (c.labels[lang] ?? c.labels.sv ?? "").toLowerCase().replace(/\s+/g, "").split("")
      );
    const distractors = shuffle(pool).slice(0, extra);
    setBank(shuffle([...word.split(""), ...distractors]));
    setTyped("");
    setWrong(false);
    setLocked(false);
    if (level <= 2) speak(word, lang, current.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, lang, level]);

  const win = () => {
    if (!category || !level || !current) return;
    speak(word, lang, current.id);
    celebrate();
    window.setTimeout(() => {
      if (index === concepts.length - 1) {
        addStars(starKey("spelling", category, level), 3);
        completeLesson(XP);
        playLevelUp();
        setDone(true);
      } else {
        setIndex((n) => n + 1);
      }
    }, 900);
  };

  // Gemensamt svarsfält – fylls av både tangentbord och bokstavsknappar
  const applyAnswer = (val: string) => {
    if (locked) return;
    setTyped(val);
    if (norm(val).length >= word.length) {
      setLocked(true);
      if (norm(val) === word) {
        win();
      } else {
        setWrong(true);
        playWrong();
        window.setTimeout(() => {
          setTyped("");
          setWrong(false);
          setLocked(false);
        }, 700);
      }
    } else {
      setWrong(false);
    }
  };

  const tapLetter = (letter: string) => {
    applyAnswer(typed + letter);
    inputRef.current?.focus();
  };

  const startLevel = (lvl: Level) => {
    setLevel(lvl);
    setIndex(0);
    setDone(false);
  };

  // 1) Välj kategori
  if (!category) return <CategoryPicker title="Stava ordet" onPick={setCategory} />;

  // 2) Välj nivå
  if (!level)
    return (
      <LevelPicker
        game="spelling"
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

  // 4) Spela – skriv ELLER tryck på bokstäverna (samma fält)
  return (
    <main dir={getLanguage(lang).dir} className="mx-auto flex min-h-screen max-w-xl flex-col p-6">
      <div className="w-full pt-2">
        <ProgressBar value={index / concepts.length} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="text-8xl">{current.emoji}</div>

        <input
          ref={inputRef}
          autoFocus
          value={typed}
          onChange={(e) => applyAnswer(e.target.value)}
          dir={getLanguage(lang).dir}
          placeholder="Skriv eller tryck…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          className={cn(
            "w-full max-w-xs rounded-2xl border-2 bg-white px-5 py-3 text-center text-3xl font-bold lowercase outline-none dark:bg-zinc-800",
            wrong
              ? "border-red-400 text-red-500"
              : "border-purple-300 text-purple-600 focus:border-purple-500 dark:border-purple-800 dark:text-purple-300"
          )}
        />

        {/* Bokstavsbank – tryck för att fylla i fältet */}
        <div className="flex flex-wrap justify-center gap-2">
          {bank.map((letter, i) => (
            <button
              key={i}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => tapLetter(letter)}
              className="h-14 w-12 rounded-xl bg-white text-2xl font-bold uppercase text-purple-600 shadow transition active:scale-90 dark:bg-zinc-800 dark:text-purple-300"
            >
              {letter}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={() => {
              if (!locked) {
                setTyped("");
                setWrong(false);
                inputRef.current?.focus();
              }
            }}
            className="bg-white text-purple-600 dark:bg-zinc-800 dark:text-purple-300"
          >
            Sudda
          </Button>
          <span dir="ltr" className="font-semibold text-zinc-500 dark:text-zinc-400">
            {index + 1} / {concepts.length}
          </span>
        </div>

        <Link to="/dashboard" className="text-zinc-400">
          ← Tillbaka
        </Link>
      </div>
    </main>
  );
}
