import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { lessonWords, labelOf } from "../data/concepts";
import { getLanguage } from "../data/languages";
import { LEVEL_COUNT } from "../data/levels";
import { useSettings } from "../stores/useSettings";
import { useSpeech } from "../hooks/useSpeech";
import { useLesson } from "../hooks/useLesson";
import { CategoryPicker } from "../components/CategoryPicker";
import { LevelPicker } from "../components/LevelPicker";
import { BackButton } from "../components/BackButton";
import { GameHeader } from "../components/GameHeader";
import { FitGrid } from "../components/FitGrid";
import { Coach } from "../components/Coach";
import { useCoach } from "../hooks/useCoach";
import { VictoryScreen } from "../components/VictoryScreen";
import { difficulty } from "../lib/difficulty";
import { playPop } from "../lib/sfx";
import { shuffle } from "../lib/shuffle";
import { cn } from "../lib/cn";
import { longestWord } from "../lib/fit";
import { GAME_WIDE } from "../lib/layout";
import type { Level, PlayCategory } from "../types";

type Mode = "word" | "picture";
type Card = { key: string; conceptId: string; kind: "emoji" | "word"; content: string; word: string };

/** Antal par: 3 på nivå 1 → 9 på nivå 20 (+1 i guld). */
function pairsFor(level: Level, gold: boolean): number {
  return Math.min(10, 3 + Math.floor((level - 1) / 3) + (gold ? 1 : 0));
}

/**
 * Ordets storlek på ett memorykort (--tile = kortets bredd).
 * Först: hela ordet på en rad, så stort som får plats (korta ord stort).
 * Blir det mindre än en läsbar minsta storlek delas ordet på två rader
 * (avstavning), men aldrig större än den minsta storleken – ett långt ord blir
 * alltså aldrig större än ett kortare ord på brädet.
 * ~0,6 em per tecken i fet stil, plus ett teckens marginal.
 */
function cardFont(word: string): string {
  const n = Math.max(1, longestWord(word));
  const per = (chars: number) => `calc((var(--tile) - 10px) / ${((chars + 1) * 0.6).toFixed(2)})`;
  const oneLine = per(n);
  const twoLines = per(Math.ceil(n / 2));
  const readable = "max(14px, calc(var(--tile) * 0.14))";
  return `min(calc(var(--tile) * 0.26), max(${oneLine}, min(${twoLines}, ${readable})))`;
}

/**
 * Para ihop (memory). Korten vänds med 3D-animation. Fler par och kortare
 * titt-tid högre upp. Bara "onödiga" missar räknas som fel – lite letande
 * hör till memory.
 */
export default function MemoryGame() {
  const lang = useSettings((s) => s.lang);
  const { speak } = useSpeech();
  const lesson = useLesson("memory");
  const coach = useCoach();

  const [mode, setMode] = useState<Mode | null>(null);
  const [category, setCategory] = useState<PlayCategory | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);

  const pairs = cards.length / 2;
  const won = pairs > 0 && matched.size === pairs;
  const d = level ? difficulty(level, gold) : null;
  // Hur många missar som är "gratis" – krymper när nivån stiger
  const allowance = d ? Math.round(pairs * (1.3 - 0.7 * d.t)) : 0;

  useEffect(() => {
    if (won && category && level) {
      window.setTimeout(() => lesson.finish(category, level, gold, pairs), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const start = (cat: PlayCategory, lvl: Level, m: Mode, isGold: boolean) => {
    const chosen = lessonWords(cat, lvl, pairsFor(lvl, isGold));
    const deck: Card[] = chosen.flatMap((c) => {
      const word = labelOf(c, lang);
      const a = { key: `${c.id}-a`, conceptId: c.id, kind: "emoji" as const, content: c.emoji, word };
      const b =
        m === "picture"
          ? { key: `${c.id}-b`, conceptId: c.id, kind: "emoji" as const, content: c.emoji, word }
          : { key: `${c.id}-w`, conceptId: c.id, kind: "word" as const, content: word, word };
      return [a, b];
    });
    setCards(shuffle(deck));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setLock(false);
    lesson.reset();
  };

  const pickLevel = (lvl: Level, isGold = false) => {
    setLevel(lvl);
    setGold(isGold);
    if (category && mode) start(category, lvl, mode, isGold);
  };

  const backToLevels = () => {
    setLevel(null);
    setCards([]);
    setMatched(new Set());
    setFlipped([]);
  };

  const onFlip = (i: number) => {
    if (lock || flipped.includes(i) || matched.has(cards[i].conceptId) || !d) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length === 2) {
      const nextMoves = moves + 1;
      setMoves(nextMoves);
      const [a, b] = next;
      if (cards[a].conceptId === cards[b].conceptId) {
        speak(cards[a].word, lang, cards[a].conceptId);
        playPop();
        coach.cheer(lesson.correct(true));
        setMatched((prev) => new Set(prev).add(cards[a].conceptId));
        setFlipped([]);
      } else {
        // Missar utöver "gratis-kvoten" räknas som fel
        if (nextMoves - matched.size > allowance) lesson.wrong(true);
        setLock(true);
        window.setTimeout(() => {
          setFlipped([]);
          setLock(false);
        }, Math.round(1000 - 450 * d.t));
      }
    }
  };

  // 1) Välj läge
  if (!mode) {
    return (
      // Surfplatta: bredare kolumn och större kort (samma bredd som kategorivalet)
      <main className="mx-auto max-w-xl p-6 pb-[max(1.5rem,var(--safe-b))] md:max-w-2xl lg:max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-2xl font-bold md:text-3xl">Para ihop</h1>
        </div>
        <p className="mb-4 text-zinc-600 dark:text-zinc-400 md:text-lg">Hur vill du para ihop?</p>
        <div className="grid gap-4 sm:grid-cols-2 md:gap-6">
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -4 }}
            onClick={() => setMode("word")}
            className="flex flex-col items-center gap-3 rounded-3xl bg-gradient-to-br from-emerald-400 to-green-600 p-8 text-white shadow-lg md:gap-4 md:p-10 short:p-5"
          >
            <span className="flex items-center gap-2">
              <span className="rounded-xl bg-white/25 p-2 text-3xl md:text-5xl">🐱</span>
              <span className="rounded-xl bg-white/25 px-3 py-2 text-xl font-bold md:text-3xl">katt</span>
            </span>
            <span className="text-lg font-bold md:text-2xl">Ord &amp; bild</span>
            <span className="text-sm opacity-90 md:text-lg">Matcha ord med bild</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -4 }}
            onClick={() => setMode("picture")}
            className="flex flex-col items-center gap-3 rounded-3xl bg-gradient-to-br from-fuchsia-400 to-pink-500 p-8 text-white shadow-lg md:gap-4 md:p-10 short:p-5"
          >
            <span className="flex items-center gap-2">
              <span className="rounded-xl bg-white/25 p-2 text-3xl md:text-5xl">🐱</span>
              <span className="rounded-xl bg-white/25 p-2 text-3xl md:text-5xl">🐱</span>
            </span>
            <span className="text-lg font-bold md:text-2xl">Bild &amp; bild</span>
            <span className="text-sm opacity-90 md:text-lg">Matcha två likadana bilder</span>
          </motion.button>
        </div>
      </main>
    );
  }

  // 2) Välj äventyr/kategori
  if (!category)
    return <CategoryPicker game="memory" title="Para ihop" onPick={setCategory} onBack={() => setMode(null)} />;

  // 3) Välj nivå
  if (!level || !d)
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
  if (lesson.done && lesson.result) {
    return (
      <VictoryScreen
        title="Alla par hittade!"
        stars={lesson.result.stars}
        xp={lesson.result.xp}
        detail={`${moves} drag`}
        gold={gold}
        bestCombo={lesson.bestCombo}
        onNext={level < LEVEL_COUNT && !gold ? () => pickLevel(level + 1) : undefined}
        onReplay={() => start(category, level, mode, gold)}
        onChangeLevel={backToLevels}
      />
    );
  }

  // 5) Spelplan – hela brädet syns alltid (memory utan att scrolla mellan vändningarna).
  // Liggande surfplatta: hela bredden, så att brädet kan lägga sig på bredden (4 × 3).
  return (
    <main dir={getLanguage(lang).dir} className={GAME_WIDE}>
      <GameHeader
        onBack={backToLevels}
        progress={pairs ? matched.size / pairs : 0}
        level={level}
        gold={gold}
        combo={lesson.combo}
        extra={
          <span dir="ltr" aria-label={`${moves} drag`} className="shrink-0 font-semibold text-zinc-500 dark:text-zinc-400">
            <span aria-hidden className="hidden sm:inline">
              Drag:{" "}
            </span>
            <span aria-hidden className="sm:hidden">
              👆{" "}
            </span>
            {moves}
          </span>
        }
      />
      {/* spread: hellre 3 × 4 än en hög 2 × 6-remsa när korten bara blir lite mindre (lättare att minnas var korten ligger) */}
      {/* Stående surfplatta: en remsa under brädet åt ugglan i hörnet (annars står den på sista kortet) */}
      <FitGrid count={cards.length} gap={10} min={52} max={220} spread={0.06} className="mt-3 md:mb-20 short:mt-2 md:side:mb-0" innerClassName="[perspective:800px]">
        {cards.map((card, i) => {
          const isUp = flipped.includes(i) || matched.has(card.conceptId);
          const isMatched = matched.has(card.conceptId);
          return (
            <motion.button
              key={card.key}
              onClick={() => onFlip(i)}
              initial={{ scale: 0, rotate: -10 }}
              animate={{
                scale: isMatched ? [1, 1.12, 1] : 1,
                rotate: 0,
                rotateY: isUp ? 180 : 0,
              }}
              transition={{
                rotateY: { duration: 0.35 },
                scale: { duration: 0.35 },
                default: { delay: i * 0.025, type: "spring", stiffness: 300, damping: 20 },
              }}
              whileTap={{ scale: 0.93 }}
              className="relative"
              style={{ transformStyle: "preserve-3d" }}
              aria-label={isUp ? card.word : "Dolt kort"}
            >
              {/* Baksida – ugglan växer med kortet */}
              <span
                className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 text-[calc(var(--tile)*0.4)] text-white shadow"
                style={{ backfaceVisibility: "hidden" }}
              >
                🦉
              </span>
              {/* Framsida */}
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl bg-white p-1 text-center shadow dark:bg-zinc-800",
                  isMatched && "ring-4 ring-emerald-400"
                )}
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                {card.kind === "emoji" ? (
                  <span className="text-[calc(var(--tile)*0.55)] leading-none">{card.content}</span>
                ) : (
                  // Ordet ryms alltid i kortet: storleken räknas från kortet och ordets längd,
                  // långa ord avstavas (lang) på högst två rader
                  <span
                    lang={lang}
                    className="word-fit font-bold leading-tight text-purple-600 dark:text-purple-300"
                    style={{ fontSize: cardFont(card.content) }}
                  >
                    {card.content}
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}
      </FitGrid>
      <Coach event={coach.event} />
    </main>
  );
}
