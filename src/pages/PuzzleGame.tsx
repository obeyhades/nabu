import { useEffect, useMemo, useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import { Volume2 } from "lucide-react";
import { lessonWords, labelOf } from "../data/concepts";
import { getLanguage } from "../data/languages";
import { LEVEL_COUNT } from "../data/levels";
import { useSettings } from "../stores/useSettings";
import { useSpeech } from "../hooks/useSpeech";
import { useLesson } from "../hooks/useLesson";
import { CategoryPicker } from "../components/CategoryPicker";
import { LevelPicker } from "../components/LevelPicker";
import { GameHeader } from "../components/GameHeader";
import { QuestionStage, BigPicture, RoundCount } from "../components/QuestionStage";
import { Coach } from "../components/Coach";
import { useCoach } from "../hooks/useCoach";
import { VictoryScreen } from "../components/VictoryScreen";
import { difficulty, type Difficulty } from "../lib/difficulty";
import { graphemes, normChar } from "../lib/graphemes";
import { playPop } from "../lib/sfx";
import { shuffle } from "../lib/shuffle";
import { cn } from "../lib/cn";
import { GAME_MAIN, PROMPT_TEXT } from "../lib/layout";
import { useElementSize } from "../hooks/useElementSize";
import { balancedRowWidth } from "../lib/fit";
import type { Concept, LangCode, Level, PlayCategory } from "../types";

type Tile = { id: string; g: string; rot: number };
type Round = { concept: Concept; target: string[]; tiles: Tile[] };

/** Ordet som grafem, utan mellanslag (samma regel som stavningsspelet). */
function wordGraphemes(c: Concept, lang: LangCode): string[] {
  return graphemes(labelOf(c, lang).replace(/\s+/g, ""));
}

/** Bygg en runda: ordets bokstäver + extra "lurbokstäver" från andra ord. */
function buildRound(concept: Concept, others: Concept[], lang: LangCode, d: Difficulty, r: number): Round {
  const target = wordGraphemes(concept, lang);
  const own = new Set(target.map(normChar));
  const extraCount = Math.max(0, d.band - 1) + (d.gold ? 2 : 0);
  const pool = [
    ...new Set(
      others
        .filter((c) => c.id !== concept.id)
        .flatMap((c) => wordGraphemes(c, lang))
        .filter((g) => !own.has(normChar(g)))
    ),
  ];
  const extras = shuffle(pool).slice(0, extraCount);
  const tiles = shuffle([...target, ...extras]).map((g, i) => ({
    id: `${r}-${i}`,
    g,
    rot: Math.round((Math.random() - 0.5) * 24), // -12°…12°
  }));
  return { concept, target, tiles };
}

/** Pekarens position i fönstret när ett drag släpps (mus, penna eller finger). */
function clientPoint(e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): { x: number; y: number } {
  if ("changedTouches" in e && e.changedTouches.length > 0) {
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  }
  if ("clientX" in e) return { x: e.clientX, y: e.clientY };
  return { x: info.point.x - window.scrollX, y: info.point.y - window.scrollY };
}

const SLOT_GAP = 6;

/**
 * Rutornas storlek räknas från radens bredd, så att ordet ligger på EN rad
 * (aldrig "fåge" + ett ensamt "l" på en smal mobil). Bara när rutorna skulle
 * bli för små (< 36 px) delas ordet i två jämna rader. På en liggande mobil är
 * höjden det som tar slut (svarsspalten bredvid bilden): där delas ordet först
 * under 40 px, i två rader à högst 52 px (ett tryckmål för ett barnfinger).
 */
function slotLayout(n: number, rowW: number, low = false): { perRow: number; size: number } {
  const fits = (k: number) => Math.floor((rowW - (k - 1) * SLOT_GAP) / k);
  if (!rowW) return { perRow: n, size: 48 };
  const one = Math.min(64, fits(n));
  if (one >= (low ? 40 : 36) || n < 6) return { perRow: n, size: Math.max(28, one) };
  const perRow = Math.ceil(n / 2);
  // Liggande: två rader à högst 52 px ryms på höjden (10 bokstäver = 5 + 5 i stället för 31 px-rutor)
  return { perRow, size: Math.max(28, Math.min(low ? 52 : 64, fits(perRow))) };
}

/**
 * Pussla ordet – dra bokstäverna till rätt ruta (eller tryck på en bokstav så
 * flyger den till nästa tomma ruta). Högre nivåer = mindre hjälp (inga
 * spökbokstäver, ordet läses inte upp) och fler lurbokstäver.
 */
export default function PuzzleGame() {
  const lang = useSettings((s) => s.lang);
  const { speak } = useSpeech();
  const lesson = useLesson("puzzle");
  const coach = useCoach();

  const [category, setCategory] = useState<PlayCategory | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  /** filled[i] = id på brickan som ligger i ruta i */
  const [filled, setFilled] = useState<(string | null)[]>([]);
  const [shaking, setShaking] = useState<string | null>(null);
  const [badSlot, setBadSlot] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);

  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [slotRow, { w: rowW }] = useElementSize<HTMLDivElement>();
  const [bankBox, { w: bankW }] = useElementSize<HTMLDivElement>();
  const draggedRef = useRef(false);
  const timers = useRef<number[]>([]);

  const current = rounds[index];
  const d = useMemo(() => difficulty(level ?? 1, gold), [level, gold]);
  const word = current ? labelOf(current.concept, lang) : "";
  const dir = getLanguage(lang).dir;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const startLevel = (lvl: Level, isGold = false) => {
    if (!category) return;
    const dd = difficulty(lvl, isGold);
    const count = Math.min(dd.rounds, 7); // ord är längre än quizfrågor
    const words = lessonWords(category, lvl, count);
    const built = words.map((c, r) => buildRound(c, words, lang, dd, r));
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setRounds(built);
    setFilled(built[0] ? built[0].target.map(() => null) : []);
    setLevel(lvl);
    setGold(isGold);
    setIndex(0);
    setSolved(false);
    setShaking(null);
    setBadSlot(null);
    lesson.reset();
  };

  // Ny runda: läs upp ordet om hjälpen tillåter det
  useEffect(() => {
    if (current && d.help !== "none") speak(word, lang, current.concept.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.concept.id, index, lang, rounds]);

  const usedIds = new Set(filled.filter((x): x is string => x !== null));

  const place = (tile: Tile, slot: number) => {
    if (!current || !category || !level) return;
    const next = [...filled];
    next[slot] = tile.id;
    setFilled(next);
    playPop();
    if (next.every((x) => x !== null)) {
      setSolved(true);
      later(() => speak(word, lang, current.concept.id), 250);
      coach.cheer(lesson.correct());
      later(() => {
        if (index === rounds.length - 1) {
          lesson.finish(category, level, gold, rounds.length);
        } else {
          const ni = index + 1;
          setIndex(ni);
          setFilled(rounds[ni].target.map(() => null));
          setSolved(false);
        }
      }, 1600);
    }
  };

  const mistake = (tileId: string, slot: number | null) => {
    lesson.wrong();
    coach.comfort();
    setShaking(tileId);
    if (slot !== null) setBadSlot(slot);
    later(() => {
      setShaking((s) => (s === tileId ? null : s));
      setBadSlot((b) => (b === slot ? null : b));
    }, 600);
  };

  const fits = (tile: Tile, slot: number) =>
    !!current && normChar(tile.g) === normChar(current.target[slot]);

  /** Vilken tom ruta släpptes brickan på? (lite generös träffyta) */
  const slotAt = (x: number, y: number): number | null => {
    const pad = 14;
    let best: number | null = null;
    let bestDist = Infinity;
    slotRefs.current.forEach((el, i) => {
      if (!el || filled[i] !== null) return;
      const r = el.getBoundingClientRect();
      if (x < r.left - pad || x > r.right + pad || y < r.top - pad || y > r.bottom + pad) return;
      const dist = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  };

  const onDrop = (tile: Tile, e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (solved) return;
    const p = clientPoint(e, info);
    const slot = slotAt(p.x, p.y);
    if (slot === null) return; // släppt bredvid – brickan glider bara tillbaka
    if (fits(tile, slot)) place(tile, slot);
    else mistake(tile.id, slot);
  };

  const onTapTile = (tile: Tile) => {
    if (draggedRef.current || solved) return;
    const slot = filled.findIndex((x) => x === null);
    if (slot < 0) return;
    if (fits(tile, slot)) place(tile, slot);
    else mistake(tile.id, null);
  };

  // 1) Välj äventyr eller kategori
  if (!category) return <CategoryPicker game="puzzle" title="Pussla ordet" onPick={setCategory} />;

  // 2) Välj nivå
  if (!level)
    return (
      <LevelPicker
        game="puzzle"
        category={category}
        onPick={(l) => startLevel(l)}
        onPickGold={(l) => startLevel(l, true)}
        onBack={() => setCategory(null)}
      />
    );

  // 3) Klar
  if (lesson.done && lesson.result) {
    return (
      <VictoryScreen
        title="Snyggt pusslat!"
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
  const n = current.target.length;
  const tileById = new Map(current.tiles.map((t) => [t.id, t]));
  const ghostAt = (i: number) => d.help === "full" || (d.help === "some" && i === 0);
  // Liggande mobil (samma gräns som short: i CSS); räknas om när raden byter bredd (vridning)
  const landscapeLow = typeof window !== "undefined" && window.innerWidth > window.innerHeight && window.innerHeight <= 500;
  const slots = slotLayout(n, rowW, landscapeLow);
  // Brickornas storlek i banken (48 eller 64 px) och jämna rader: 7 brickor = 4 + 3 och
  // 8 = 4 + 4, aldrig 6 + 1 (samma regel som stavningsspelets bank). Mindre brickor på
  // mobilen när ordet är långt (färre rader, sista brickan hamnar inte under kanten) eller
  // när de stora skulle lämna en ensam bricka på sista raden (7 på 320 px = 3 + 3 + 1 →
  // 4 + 3). Surfplattan har plats: där är brickorna alltid lika stora som rutorna.
  const tileCount = current.tiles.length;
  const tablet = typeof window !== "undefined" && window.innerWidth >= 768;
  const bigGap = landscapeLow ? 8 : 12;
  const bankInner = bankW - 8; // px-1 på båda sidor
  const orphanAt64 = (() => {
    if (bankInner <= 0) return false;
    const perMax = Math.max(1, Math.floor((bankInner + bigGap) / (64 + bigGap)));
    const rows = Math.ceil(tileCount / perMax);
    return rows > 1 && tileCount - (rows - 1) * Math.ceil(tileCount / rows) === 1;
  })();
  const small = landscapeLow || (!tablet && (tileCount > 8 || orphanAt64));
  const tileSize = small ? "h-12 min-w-12 text-3xl" : "h-16 min-w-16 text-4xl short:h-12 short:min-w-12 short:text-3xl";
  const tileW = small ? 48 : 64;
  // Små brickor står tätare: på 320 px ryms då 5 per rad (13 brickor = 3 rader, inte 4 + en ensam)
  const tileGap = small ? 8 : 12;
  const bankRowW = balancedRowWidth(tileCount, bankInner, tileW, tileGap);

  // 4) Pussla
  return (
    <main dir={dir} className={GAME_MAIN}>
      <GameHeader
        onBack={() => setLevel(null)}
        progress={index / rounds.length}
        level={level}
        gold={gold}
        combo={lesson.combo}
      />

      <QuestionStage qkey={index} split>
        <div className="stage-prompt">
          <div className="flex items-center gap-4">
            <motion.div
              animate={solved ? { scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] } : { scale: 1 }}
              transition={{ duration: 0.7 }}
            >
              <BigPicture className="text-8xl low:text-7xl md:text-9xl short:text-6xl">{current.concept.emoji}</BigPicture>
            </motion.div>
            <motion.button
              onClick={() => speak(word, lang, current.concept.id)}
              aria-label="Hör ordet"
              whileTap={{ scale: 0.9 }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg"
            >
              <Volume2 size={28} />
            </motion.button>
          </div>

          <p className={cn(PROMPT_TEXT, "text-center")}>{solved ? "Snyggt! 🧩" : "Dra bokstäverna till rätt plats!"}</p>
        </div>

        {/* Låg skärm (320 × 568 med ett långt ord): tätare, så att sidan aldrig scrollar under ett drag */}
        <div className="stage-answers flex w-full flex-col items-center justify-center gap-5 low:gap-3 short:gap-3">
          {/* Rutorna – läses höger→vänster på arabiska tack vare dir. Hela ordet på en rad. */}
          <div ref={slotRow} className="w-full">
            <div
              dir={dir}
              className="mx-auto flex flex-wrap justify-center"
              style={{ gap: SLOT_GAP, width: slots.perRow * slots.size + (slots.perRow - 1) * SLOT_GAP }}
            >
              {current.target.map((g, i) => {
                const tile = filled[i] ? tileById.get(filled[i]!) : undefined;
                return (
                  <motion.div
                    key={i}
                    ref={(el) => {
                      slotRefs.current[i] = el;
                    }}
                    animate={
                      badSlot === i
                        ? { x: [0, -6, 6, -4, 4, 0] }
                        : solved
                          ? { y: [0, -10, 0], transition: { delay: i * 0.06, duration: 0.4 } }
                          : { x: 0, y: 0 }
                    }
                    style={{ width: slots.size, height: slots.size, fontSize: Math.round(slots.size * 0.58) }}
                    className={cn(
                      "relative flex items-center justify-center rounded-2xl font-bold",
                      slots.size < 44 ? "rounded-xl border-[3px]" : "border-4",
                      tile
                        ? solved
                          ? "border-emerald-400 bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-900/50"
                          : "border-sky-300 bg-white dark:border-sky-600 dark:bg-zinc-800"
                        : badSlot === i
                          ? "border-dashed border-rose-400 bg-rose-50 dark:bg-rose-900/30"
                          : "border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/60"
                    )}
                  >
                    {tile ? (
                      <motion.span
                        layoutId={`tile-${tile.id}`}
                        transition={{ type: "spring", stiffness: 500, damping: 28 }}
                        className="text-zinc-800 dark:text-zinc-100"
                      >
                        {tile.g}
                      </motion.span>
                    ) : (
                      ghostAt(i) && (
                        <span aria-hidden className="text-zinc-300 select-none dark:text-zinc-600">
                          {g}
                        </span>
                      )
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Brickorna – raderna lika långa (bankRowW; px-1 = 8 px ingår i maxbredden) */}
          <div ref={bankBox} className="w-full">
          <div
            dir={dir}
            className="mx-auto flex w-full flex-wrap justify-center px-1 py-2 low:py-1 short:py-1"
            style={{ gap: tileGap, maxWidth: bankRowW ? bankRowW + 8 + tileGap - 1 : undefined }}
          >
            {current.tiles.map((tile) => {
              if (usedIds.has(tile.id)) {
                // tom plats så att de andra brickorna inte hoppar runt
                return <div key={tile.id} aria-hidden className={cn(tileSize, "w-0")} />;
              }
              return (
                <motion.button
                  key={tile.id}
                  layoutId={`tile-${tile.id}`}
                  drag={!solved}
                  dragSnapToOrigin
                  dragElastic={0.9}
                  dragMomentum={false}
                  dragTransition={{ bounceStiffness: 400, bounceDamping: 22 }}
                  onPointerDown={() => {
                    draggedRef.current = false;
                  }}
                  onDragStart={() => {
                    draggedRef.current = true;
                  }}
                  onDragEnd={(e, info) => onDrop(tile, e, info)}
                  onClick={() => onTapTile(tile)}
                  aria-label={`Bokstav ${tile.g}`}
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{
                    scale: 1,
                    rotate:
                      shaking === tile.id
                        ? [tile.rot, tile.rot - 18, tile.rot + 18, tile.rot - 10, tile.rot + 10, tile.rot]
                        : tile.rot,
                  }}
                  whileDrag={{ scale: 1.15, rotate: 0, zIndex: 50 }}
                  whileTap={{ scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  style={{ touchAction: "none" }}
                  className={cn(
                    "relative flex cursor-grab items-center justify-center rounded-2xl px-2 font-bold shadow-lg select-none active:cursor-grabbing",
                    tileSize,
                    "bg-gradient-to-br from-amber-200 to-orange-300 text-zinc-800 dark:from-amber-500 dark:to-orange-600 dark:text-white",
                    shaking === tile.id && "ring-4 ring-rose-400"
                  )}
                >
                  {tile.g}
                </motion.button>
              );
            })}
          </div>
          </div>
        </div>

        <RoundCount n={index + 1} of={rounds.length} />
      </QuestionStage>

      <Coach event={coach.event} />
    </main>
  );
}
