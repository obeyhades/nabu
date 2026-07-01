import { useEffect, useState } from "react";
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
import { playLevelUp } from "../lib/sfx";
import { starKey } from "../lib/progress";
import { cn } from "../lib/cn";
import { Link } from "react-router-dom";
import type { Category, Level } from "../types";

type Mode = "word" | "picture";
type Card = { key: string; conceptId: string; kind: "emoji" | "word"; content: string; word: string };

// Fler par ju högre nivå (max 5 = så många ord vi har per nivå)
const PAIRS_BY_LEVEL: Record<Level, number> = { 1: 3, 2: 4, 3: 5, 4: 5 };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MemoryGame() {
  const lang = useSettings((s) => s.lang);
  const addStars = useProfile((s) => s.addStars);
  const completeLesson = useStats((s) => s.completeLesson);
  const { speak } = useSpeech();

  const [mode, setMode] = useState<Mode | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);

  const pairs = level ? PAIRS_BY_LEVEL[level] : 0;
  const won = pairs > 0 && cards.length > 0 && matched.size === pairs;
  const stars = moves <= pairs + 2 ? 3 : moves <= pairs + 5 ? 2 : 1;

  useEffect(() => {
    if (won && category && level) {
      addStars(starKey("memory", category, level), stars);
      completeLesson(stars * XP_PER_STAR);
      celebrate();
      playLevelUp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const start = (cat: Category, lvl: Level, m: Mode) => {
    const chosen = shuffle(conceptsByLevel(cat, lvl)).slice(0, PAIRS_BY_LEVEL[lvl]);
    const deck: Card[] = chosen.flatMap((c) => {
      const word = c.labels[lang] ?? c.labels.sv ?? "";
      if (m === "picture") {
        // Bild & bild: två likadana bilder
        return [
          { key: `${c.id}-a`, conceptId: c.id, kind: "emoji" as const, content: c.emoji, word },
          { key: `${c.id}-b`, conceptId: c.id, kind: "emoji" as const, content: c.emoji, word },
        ];
      }
      // Ord & bild: bild + ord
      return [
        { key: `${c.id}-e`, conceptId: c.id, kind: "emoji" as const, content: c.emoji, word },
        { key: `${c.id}-w`, conceptId: c.id, kind: "word" as const, content: word, word },
      ];
    });
    setCards(shuffle(deck));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setLock(false);
  };

  const pickLevel = (lvl: Level) => {
    setLevel(lvl);
    if (category && mode) start(category, lvl, mode);
  };

  const backToLevels = () => {
    setLevel(null);
    setCards([]);
    setMatched(new Set());
    setFlipped([]);
  };

  const onFlip = (i: number) => {
    if (lock || flipped.includes(i) || matched.has(cards[i].conceptId)) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (cards[a].conceptId === cards[b].conceptId) {
        speak(cards[a].word, lang, cards[a].conceptId);
        setMatched((prev) => new Set(prev).add(cards[a].conceptId));
        setFlipped([]);
      } else {
        setLock(true);
        setTimeout(() => {
          setFlipped([]);
          setLock(false);
        }, 800);
      }
    }
  };

  // 1) Välj läge
  if (!mode) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/dashboard" className="text-zinc-400" aria-label="Tillbaka">
            ←
          </Link>
          <h1 className="text-2xl font-bold">Para ihop</h1>
        </div>
        <p className="mb-4 text-zinc-600 dark:text-zinc-400">Hur vill du para ihop?</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => setMode("word")}
            className="flex flex-col items-center gap-2 rounded-3xl bg-gradient-to-br from-sky-400 to-emerald-500 p-8 text-white shadow-lg transition hover:-translate-y-1 active:scale-95"
          >
            <span className="text-4xl">🖼️🔤</span>
            <span className="text-lg font-bold">Ord &amp; bild</span>
            <span className="text-sm opacity-90">Matcha ord med bild</span>
          </button>
          <button
            onClick={() => setMode("picture")}
            className="flex flex-col items-center gap-2 rounded-3xl bg-gradient-to-br from-fuchsia-400 to-pink-500 p-8 text-white shadow-lg transition hover:-translate-y-1 active:scale-95"
          >
            <span className="text-4xl">🖼️🖼️</span>
            <span className="text-lg font-bold">Bild &amp; bild</span>
            <span className="text-sm opacity-90">Matcha två likadana bilder</span>
          </button>
        </div>
      </main>
    );
  }

  // 2) Välj kategori
  if (!category)
    return <CategoryPicker title="Para ihop" onPick={setCategory} onBack={() => setMode(null)} />;

  // 3) Välj nivå
  if (!level)
    return (
      <LevelPicker
        game="memory"
        category={category}
        onPick={pickLevel}
        onBack={() => setCategory(null)}
      />
    );

  // 4) Vunnit
  if (won) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-7xl">🎉</div>
        <h1 className="text-3xl font-bold">Alla par hittade!</h1>
        <p className="text-zinc-500 dark:text-zinc-400">{moves} drag</p>
        <StarRating value={stars} size={44} />
        <p className="text-zinc-500 dark:text-zinc-400">+{stars * XP_PER_STAR} XP</p>
        <LevelUpBanner />
        <div className="flex flex-wrap justify-center gap-3">
          {level < 4 && (
            <Button
              onClick={() => pickLevel((level + 1) as Level)}
              className="bg-emerald-500 text-white"
            >
              Nästa nivå →
            </Button>
          )}
          <Button
            onClick={() => start(category, level, mode)}
            className="bg-purple-500 text-white"
          >
            Spela igen
          </Button>
          <Button
            onClick={backToLevels}
            className="bg-white text-purple-600 dark:bg-zinc-800 dark:text-purple-300"
          >
            Byt nivå
          </Button>
        </div>
      </main>
    );
  }

  // 5) Spelplan
  return (
    <main dir={getLanguage(lang).dir} className="mx-auto max-w-xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={backToLevels} className="text-zinc-400" aria-label="Tillbaka">
          ←
        </button>
        <span dir="ltr" className="font-semibold text-zinc-500 dark:text-zinc-400">
          Drag: {moves}
        </span>
      </div>
      <div className="mb-4">
        <ProgressBar value={pairs ? matched.size / pairs : 0} />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {cards.map((card, i) => {
          const isUp = flipped.includes(i) || matched.has(card.conceptId);
          return (
            <button
              key={card.key}
              onClick={() => onFlip(i)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-2xl p-2 text-center shadow transition active:scale-95",
                isUp
                  ? "bg-white dark:bg-zinc-800"
                  : "bg-gradient-to-br from-purple-400 to-pink-400 text-white",
                matched.has(card.conceptId) && "opacity-60"
              )}
            >
              {isUp ? (
                <span
                  className={
                    card.kind === "emoji"
                      ? "text-4xl"
                      : "text-lg font-bold text-purple-600 dark:text-purple-300"
                  }
                >
                  {card.content}
                </span>
              ) : (
                <span className="text-2xl">❓</span>
              )}
            </button>
          );
        })}
      </div>
    </main>
  );
}
