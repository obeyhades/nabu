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
import { BackButton } from "../components/BackButton";
import { VictoryScreen } from "../components/VictoryScreen";
import { celebrate } from "../lib/celebrate";
import { playLevelUp } from "../lib/sfx";
import { starKey, goldStarKey } from "../lib/progress";
import { shuffle } from "../lib/shuffle";
import { cn } from "../lib/cn";
import type { Category, Level } from "../types";

type Mode = "word" | "picture";
type Card = { key: string; conceptId: string; kind: "emoji" | "word"; content: string; word: string };

// Önskat antal par per nivå (begränsas av hur många ord nivån har)
const PAIRS_BY_LEVEL: Record<Level, number> = { 1: 3, 2: 4, 3: 5, 4: 5 };

export default function MemoryGame() {
  const lang = useSettings((s) => s.lang);
  const addStars = useProfile((s) => s.addStars);
  const completeLesson = useStats((s) => s.completeLesson);
  const { speak } = useSpeech();

  const [mode, setMode] = useState<Mode | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);

  // Härlett från faktiska korten (nivåer kan ha färre ord än önskat antal par)
  const pairs = cards.length / 2;
  const won = pairs > 0 && matched.size === pairs;
  const stars = gold
    ? moves <= pairs + 2
      ? 3
      : moves <= pairs + 5
        ? 2
        : 1
    : moves <= pairs + 4
      ? 3
      : moves <= pairs * 2
        ? 2
        : 1;
  const xp = stars * XP_PER_STAR * (gold ? 2 : 1);

  useEffect(() => {
    if (won && category && level) {
      addStars(gold ? goldStarKey("memory", category, level) : starKey("memory", category, level), stars);
      completeLesson(xp);
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
        return [
          { key: `${c.id}-a`, conceptId: c.id, kind: "emoji" as const, content: c.emoji, word },
          { key: `${c.id}-b`, conceptId: c.id, kind: "emoji" as const, content: c.emoji, word },
        ];
      }
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

  const pickLevel = (lvl: Level, isGold = false) => {
    setLevel(lvl);
    setGold(isGold);
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
        }, gold ? 600 : 800);
      }
    }
  };

  // 1) Välj läge
  if (!mode) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-2xl font-bold">Para ihop</h1>
        </div>
        <p className="mb-4 text-zinc-600 dark:text-zinc-400">Hur vill du para ihop?</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => setMode("word")}
            className="flex flex-col items-center gap-3 rounded-3xl bg-gradient-to-br from-emerald-400 to-green-600 p-8 text-white shadow-lg transition hover:-translate-y-1 active:scale-95"
          >
            {/* Mini-exempel: bild + ord */}
            <span className="flex items-center gap-2">
              <span className="rounded-xl bg-white/25 p-2 text-3xl">🐱</span>
              <span className="rounded-xl bg-white/25 px-3 py-2 text-xl font-bold">katt</span>
            </span>
            <span className="text-lg font-bold">Ord &amp; bild</span>
            <span className="text-sm opacity-90">Matcha ord med bild</span>
          </button>
          <button
            onClick={() => setMode("picture")}
            className="flex flex-col items-center gap-3 rounded-3xl bg-gradient-to-br from-fuchsia-400 to-pink-500 p-8 text-white shadow-lg transition hover:-translate-y-1 active:scale-95"
          >
            {/* Mini-exempel: bild + bild */}
            <span className="flex items-center gap-2">
              <span className="rounded-xl bg-white/25 p-2 text-3xl">🐱</span>
              <span className="rounded-xl bg-white/25 p-2 text-3xl">🐱</span>
            </span>
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
        onPick={(l) => pickLevel(l)}
        onPickGold={(l) => pickLevel(l, true)}
        onBack={() => setCategory(null)}
      />
    );

  // 4) Vunnit
  if (won) {
    return (
      <VictoryScreen
        title="Alla par hittade!"
        stars={stars}
        xp={xp}
        detail={`${moves} drag`}
        gold={gold}
        onNext={level < 4 && !gold ? () => pickLevel((level + 1) as Level) : undefined}
        onReplay={() => start(category, level, mode)}
        onChangeLevel={backToLevels}
      />
    );
  }

  // 5) Spelplan
  return (
    <main dir={getLanguage(lang).dir} className="mx-auto max-w-xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <BackButton onClick={backToLevels} />
        <ProgressBar value={pairs ? matched.size / pairs : 0} />
        <span dir="ltr" className="shrink-0 font-semibold text-zinc-500 dark:text-zinc-400">
          Drag: {moves}
        </span>
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
