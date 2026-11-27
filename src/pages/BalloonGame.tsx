import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { lessonWords, distractorPool, pickDistractors, labelOf } from "../data/concepts";
import { getLanguage } from "../data/languages";
import { LEVEL_COUNT } from "../data/levels";
import { useSettings } from "../stores/useSettings";
import { useSpeech } from "../hooks/useSpeech";
import { useLesson } from "../hooks/useLesson";
import { CategoryPicker } from "../components/CategoryPicker";
import { LevelPicker } from "../components/LevelPicker";
import { GameHeader } from "../components/GameHeader";
import { Coach } from "../components/Coach";
import { useCoach } from "../hooks/useCoach";
import { VictoryScreen } from "../components/VictoryScreen";
import { difficulty, lerp, type Difficulty } from "../lib/difficulty";
import { playPop } from "../lib/sfx";
import { shuffle } from "../lib/shuffle";
import { cn } from "../lib/cn";
import { fitText } from "../lib/fit";
import { GAME_SCREEN } from "../lib/layout";
import type { Concept, Level, PlayCategory } from "../types";

type Round = { concept: Concept; options: Concept[] };

/**
 * Ballongpop – ordet läses upp och ballonger med bilder svävar uppåt.
 * Barnet poppar ballongen som matchar ordet. Högre nivåer = fler ballonger,
 * snabbare fart och (från t > 0.4) ballonger som svajar i sidled.
 */
export default function BalloonGame() {
  const lang = useSettings((s) => s.lang);
  const { speak } = useSpeech();
  const lesson = useLesson("balloon");
  const coach = useCoach();

  const [category, setCategory] = useState<PlayCategory | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [session, setSession] = useState(0);
  const resolvedRef = useRef(false);
  const lastSpokenRef = useRef(0);

  const current = rounds[index];
  const word = current ? labelOf(current.concept, lang) : "";
  const d = level ? difficulty(level, gold) : null;

  const startLevel = (lvl: Level, isGold = false) => {
    if (!category) return;
    const diff = difficulty(lvl, isGold);
    const words = lessonWords(category, lvl, diff.rounds);
    const pool = distractorPool(category, lvl);
    setRounds(
      words.map((c) => ({
        concept: c,
        options: shuffle([c, ...pickDistractors(c, pool, diff.options - 1, diff.t)]),
      }))
    );
    setLevel(lvl);
    setGold(isGold);
    setIndex(0);
    setSession((s) => s + 1);
    resolvedRef.current = false;
    lesson.reset();
  };

  const sayWord = useCallback(() => {
    if (!current) return;
    lastSpokenRef.current = performance.now();
    speak(word, lang, current.concept.id);
  }, [current, word, lang, speak]);

  // Spela upp ordet automatiskt vid varje ny fråga
  useEffect(() => {
    if (current) sayWord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.concept.id, index, lang, session]);

  // Rätt ballong flög iväg → påminn om ordet (men inte för ofta)
  const onAnswerEscaped = () => {
    if (resolvedRef.current) return;
    if (performance.now() - lastSpokenRef.current < 2500) return;
    sayWord();
  };

  /** Returnerar true om ballongen var rätt (då poppar den). */
  const choose = (opt: Concept): boolean => {
    if (resolvedRef.current || !current || !category || !level) return false;
    if (opt.id === current.concept.id) {
      resolvedRef.current = true;
      playPop();
      coach.cheer(lesson.correct());
      const isLast = index === rounds.length - 1;
      window.setTimeout(() => {
        if (isLast) lesson.finish(category, level, gold, rounds.length);
        else {
          resolvedRef.current = false;
          setIndex((n) => n + 1);
        }
      }, 900);
      return true;
    }
    lesson.wrong();
    coach.comfort();
    return false;
  };

  // 1) Välj äventyr eller kategori
  if (!category) return <CategoryPicker game="balloon" title="Ballongpop" onPick={setCategory} />;

  // 2) Välj nivå
  if (!level)
    return (
      <LevelPicker
        game="balloon"
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
        title="Pang, pang, pang!"
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

  if (!current || !d) return null;
  const showWord = d.help === "full";

  // 4) Lyssna & poppa
  return (
    <main className={GAME_SCREEN}>
      <GameHeader
        onBack={() => setLevel(null)}
        progress={index / rounds.length}
        level={level}
        gold={gold}
        combo={lesson.combo}
        extra={
          <span dir="ltr" className="shrink-0 font-semibold text-zinc-500 dark:text-zinc-400">
            {index + 1} / {rounds.length}
          </span>
        }
      />

      <div className="flex items-center gap-3 py-3 short:py-1.5">
        <motion.button
          onClick={sayWord}
          aria-label="Hör ordet igen"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          whileTap={{ scale: 0.9 }}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-600 text-white shadow-lg short:h-12 short:w-12"
        >
          <Volume2 size={32} className="short:size-6" />
        </motion.button>
        <div className="min-w-0 flex-1">
          {showWord ? (
            // Ordet klipps aldrig med "…": långa ord blir mindre och får två rader
            <motion.p
              key={`${session}-${index}`}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              lang={lang}
              dir={getLanguage(lang).dir}
              className={cn(
                "word-fit line-clamp-2 font-extrabold leading-snug text-zinc-800 dark:text-white",
                fitText(word, [[7, "text-4xl short:text-3xl"], [10, "text-3xl short:text-2xl"]], "text-2xl short:text-xl")
              )}
            >
              {word}
            </motion.p>
          ) : (
            <p className="font-semibold text-zinc-600 dark:text-zinc-300 md:text-xl">Lyssna och poppa rätt ballong!</p>
          )}
        </div>
      </div>

      <BalloonField
        key={`${session}-${index}`}
        options={current.options}
        answerId={current.concept.id}
        d={d}
        onPick={choose}
        onAnswerEscaped={onAnswerEscaped}
      />

      <Coach event={coach.event} />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Spelplanen                                                          */
/* ------------------------------------------------------------------ */

type Status = "fly" | "wrong" | "pop";

type BalloonState = {
  x: number; // vänsterkant i px
  y: number; // nederkant ovanför planens botten i px (negativ = under kanten)
  mul: number; // liten fartvariation per ballong
  phase: number; // sväng-fas
  freq: number; // svängningar per sekund
  status: Status;
};

const COLORS: [string, string][] = [
  ["#f87171", "#b91c1c"], // röd
  ["#60a5fa", "#1d4ed8"], // blå
  ["#fbbf24", "#b45309"], // gul
  ["#4ade80", "#15803d"], // grön
  ["#c084fc", "#7e22ce"], // lila
  ["#fb923c", "#c2410c"], // orange
  ["#f472b6", "#be185d"], // rosa
];

/** Ballongens höjd (kropp + snöre) i förhållande till bredden. */
const ASPECT = 1.8;

/**
 * Ballongens bredd i px för en spelplan på w × h. Bredden styr på stående skärm;
 * på en liggande mobil är planen låg och då styr höjden (en ballong får ta högst
 * ungefär två tredjedelar av planens höjd), så att flera ballonger syns hela.
 * Farten räknas redan från planens höjd (samma tid att korsa planen).
 */
function balloonWidth(w: number, h: number): number {
  const byWidth = Math.max(84, w * 0.23);
  const byHeight = h > 0 ? h / (ASPECT * 1.5) : byWidth;
  return Math.round(Math.max(52, Math.min(124, byWidth, byHeight)));
}

/**
 * Hur många sekunder det tar för en ballong att korsa planen.
 * Nivå 1 (speed 1) ≈ 9.5 s → nivå 20 (speed 2.2) ≈ 3.5 s, guld nivå 20 ≈ 3.2 s.
 * Med reducerad rörelse går allt 60 % långsammare.
 */
function crossSeconds(d: Difficulty, reduced: boolean): number {
  return (9.5 / Math.pow(d.speed, 1.25)) * (reduced ? 1.6 : 1);
}

/** Sidosväng i px: inget upp till t = 0.4, sedan 8 → 36 px. */
function swayAmp(d: Difficulty, reduced: boolean): number {
  if (reduced || d.t <= 0.4) return 0;
  return lerp(8, 36, (d.t - 0.4) / 0.6);
}

function BalloonField({
  options,
  answerId,
  d,
  onPick,
  onAnswerEscaped,
}: {
  options: Concept[];
  answerId: string;
  d: Difficulty;
  onPick: (c: Concept) => boolean;
  onAnswerEscaped: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const areaRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sizeRef = useRef(size);
  const balloonsRef = useRef<BalloonState[]>([]);
  const elsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const pausedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const escapedRef = useRef(onAnswerEscaped);
  const [statuses, setStatuses] = useState<Status[]>(() => options.map(() => "fly"));

  useEffect(() => {
    escapedRef.current = onAnswerEscaped;
  });

  const bw = balloonWidth(size.w, size.h);
  const bh = bw * ASPECT;

  // Mät planen (och följ storleksändringar)
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => {
      const next = { w: el.clientWidth, h: el.clientHeight };
      sizeRef.current = next;
      setSize(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rensa timers vid avmontering
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  /** Välj ett x som ligger så långt som möjligt från grannar på ungefär samma höjd. */
  const pickX = useCallback((i: number, y: number, w: number, bwNow: number) => {
    const max = Math.max(0, w - bwNow);
    const neighbours = balloonsRef.current.filter(
      (b, j) => j !== i && b && Math.abs(b.y - y) < bwNow * ASPECT * 1.1
    );
    let best = Math.random() * max;
    let bestDist = -1;
    for (let k = 0; k < 10; k++) {
      const cand = Math.random() * max;
      const dist = neighbours.length ? Math.min(...neighbours.map((b) => Math.abs(b.x - cand))) : max;
      if (dist > bestDist) {
        bestDist = dist;
        best = cand;
      }
    }
    return best;
  }, []);

  const respawn = useCallback(
    (i: number) => {
      const b = balloonsRef.current[i];
      if (!b) return;
      const { w, h } = sizeRef.current;
      const bwNow = balloonWidth(w, h);
      b.y = -bwNow * ASPECT * (1 + Math.random() * 0.3);
      b.x = pickX(i, b.y, w, bwNow);
      b.phase = Math.random() * Math.PI * 2;
    },
    [pickX]
  );

  // Starta: placera ballongerna utspridda i tid så de inte krockar
  useLayoutEffect(() => {
    if (!size.w || balloonsRef.current.length) return;
    const n = options.length;
    const spacing = (size.h + bh) / n;
    const order = shuffle(options.map((_, i) => i));
    const list: BalloonState[] = [];
    balloonsRef.current = list;
    order.forEach((i, k) => {
      const y = size.h * 0.35 - k * spacing;
      list[i] = {
        x: 0,
        y,
        mul: 0.94 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2,
        freq: 0.35 + Math.random() * 0.3,
        status: "fly",
      };
      list[i].x = pickX(i, y, size.w, bw);
    });
  }, [size.w, size.h, bw, bh, options, pickX]);

  // Animationsloopen
  const total = crossSeconds(d, reduced);
  const amp = swayAmp(d, reduced);
  useEffect(() => {
    if (!size.w) return;
    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { w, h } = sizeRef.current;
      const bwNow = balloonWidth(w, h);
      const bhNow = bwNow * ASPECT;
      const v = (h + bhNow) / total;

      balloonsRef.current.forEach((b, i) => {
        if (!b) return;
        if (!pausedRef.current && b.status === "fly") {
          b.y += v * b.mul * dt;
          b.phase += b.freq * dt * Math.PI * 2;
          if (b.y > h) {
            respawn(i);
            if (options[i]?.id === answerId) escapedRef.current();
          }
        }
        const el = elsRef.current[i];
        if (!el) return;
        const maxX = Math.max(0, w - bwNow);
        const x = Math.min(maxX, Math.max(0, b.x + Math.sin(b.phase) * amp));
        const rot = amp ? Math.cos(b.phase) * amp * 0.18 : Math.sin(b.phase) * 2;
        el.style.transform = `translate3d(${x}px, ${-b.y}px, 0) rotate(${rot}deg)`;
      });

      if (!pausedRef.current) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [size.w, size.h, total, amp, respawn, options, answerId]);

  const setStatus = (i: number, s: Status) => {
    const b = balloonsRef.current[i];
    if (b) b.status = s;
    setStatuses((prev) => prev.map((p, j) => (j === i ? s : p)));
  };

  const tap = (i: number) => {
    const b = balloonsRef.current[i];
    if (!b || b.status !== "fly" || pausedRef.current) return;
    if (onPick(options[i])) {
      pausedRef.current = true;
      setStatus(i, "pop");
    } else {
      setStatus(i, "wrong");
      const t = window.setTimeout(() => {
        if (pausedRef.current) return; // rundan är redan klar
        respawn(i);
        setStatus(i, "fly");
      }, 650);
      timersRef.current.push(t);
    }
  };

  return (
    <div
      ref={areaRef}
      // Stående: en remsa under himlen åt ugglan (Coach i hörnet), så att den aldrig står där
      // ballongerna kommer upp – och himlen förblir centrerad under rubriken. Liggande står
      // himlen långt från hörnet (surfplatta) eller så syns ingen uggla (mobil).
      className="relative mb-16 min-h-0 flex-1 touch-none overflow-hidden rounded-3xl bg-gradient-to-b from-sky-300 via-sky-200 to-sky-50 select-none low:mb-14 md:mb-20 side:mb-0 md:side:mb-0 dark:from-indigo-950 dark:via-slate-900 dark:to-slate-800"
    >
      {/* Moln / stjärnor i bakgrunden */}
      <span aria-hidden className="pointer-events-none absolute top-[12%] left-[8%] text-5xl opacity-70 dark:hidden">
        ☁️
      </span>
      <span aria-hidden className="pointer-events-none absolute top-[40%] right-[6%] text-6xl opacity-60 dark:hidden">
        ☁️
      </span>
      <span aria-hidden className="pointer-events-none absolute top-[70%] left-[30%] text-4xl opacity-50 dark:hidden">
        ☁️
      </span>
      <span aria-hidden className="pointer-events-none absolute top-[10%] right-[20%] hidden text-xl opacity-70 dark:block">
        ✨
      </span>
      <span aria-hidden className="pointer-events-none absolute top-[55%] left-[10%] hidden text-lg opacity-60 dark:block">
        ⭐
      </span>

      {size.w > 0 &&
        options.map((opt, i) => (
          <button
            key={opt.id}
            ref={(el) => {
              elsRef.current[i] = el;
            }}
            type="button"
            aria-label={`Ballong ${i + 1}`}
            onPointerDown={(e) => {
              e.preventDefault();
              tap(i);
            }}
            onClick={(e) => {
              // tangentbord (Enter/mellanslag) ger click med detail 0
              if (e.detail === 0) tap(i);
            }}
            className="absolute bottom-0 left-0 cursor-pointer touch-none rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/80"
            style={{
              width: bw,
              height: bh,
              willChange: "transform",
              transform: "translate3d(0, 100%, 0)",
              zIndex: statuses[i] === "pop" ? 20 : 1,
            }}
          >
            <Balloon emoji={opt.emoji} color={COLORS[i % COLORS.length]} size={bw} status={statuses[i]} />
          </button>
        ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* En ballong                                                          */
/* ------------------------------------------------------------------ */

function Balloon({
  emoji,
  color,
  size,
  status,
}: {
  emoji: string;
  color: [string, string];
  size: number;
  status: Status;
}) {
  const gid = useId().replace(/:/g, "");
  const [main, dark] = color;
  const bodyH = size * 1.18; // kroppens höjd i px (≈ 118/180 av viewBoxen)

  const animate =
    status === "pop"
      ? { scale: 1.45, opacity: 0, rotate: 0 }
      : status === "wrong"
        ? { rotate: [0, -16, 14, -10, 6, 0], scale: [1, 0.95, 0.85, 0.6, 0.35], opacity: [1, 1, 0.9, 0.6, 0] }
        : { scale: 1, opacity: 1, rotate: 0 };

  return (
    <>
      <motion.div
        className="pointer-events-none relative h-full w-full"
        initial={false}
        animate={animate}
        transition={status === "pop" ? { duration: 0.22, ease: "easeOut" } : { duration: status === "wrong" ? 0.6 : 0.25 }}
        style={{ transformOrigin: "50% 35%" }}
      >
        <svg viewBox="0 0 100 180" width="100%" height="100%" aria-hidden className="drop-shadow-md">
          <defs>
            <radialGradient id={`b${gid}`} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="25%" stopColor={main} />
              <stop offset="100%" stopColor={dark} />
            </radialGradient>
          </defs>
          {/* snöre */}
          <path
            d="M50 121 C 40 134 60 146 50 158 C 42 168 57 173 50 180"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-zinc-500 dark:text-zinc-300"
          />
          {/* knut */}
          <path d="M43 123 L57 123 L50 113 Z" fill={dark} />
          {/* kropp */}
          <path
            d="M50 2 C 18 2 4 28 4 54 C 4 86 30 108 50 116 C 70 108 96 86 96 54 C 96 28 82 2 50 2 Z"
            fill={`url(#b${gid})`}
          />
          {/* glans */}
          <ellipse cx="30" cy="30" rx="8" ry="15" fill="#ffffff" opacity="0.45" transform="rotate(-25 30 30)" />
        </svg>
        <span
          className="absolute inset-x-0 top-0 flex items-center justify-center leading-none"
          style={{ height: bodyH, fontSize: size * 0.46 }}
        >
          {emoji}
        </span>
      </motion.div>
      {status === "pop" && <Burst size={size} colors={[main, dark]} />}
    </>
  );
}

const BURST_COLORS = ["#facc15", "#f472b6", "#60a5fa", "#4ade80", "#ffffff"];

/** Konfetti-bitar som sprutar ut när ballongen poppar. */
function Burst({ size, colors }: { size: number; colors: [string, string] }) {
  const [pieces] = useState(() =>
    Array.from({ length: 14 }, (_, k) => {
      const angle = (k / 14) * Math.PI * 2 + Math.random() * 0.4;
      const r = size * (0.7 + Math.random() * 0.6);
      return {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        rot: Math.random() * 360,
        color: k % 3 === 0 ? colors[0] : BURST_COLORS[k % BURST_COLORS.length],
        round: k % 2 === 0,
      };
    })
  );
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2"
      style={{ top: size * 0.58, width: 0, height: 0 }}
    >
      {pieces.map((p, k) => (
        <motion.span
          key={k}
          className="absolute block"
          style={{
            width: 12,
            height: p.round ? 12 : 7,
            marginLeft: -6,
            marginTop: -6,
            background: p.color,
            borderRadius: p.round ? 999 : 2,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.5, rotate: p.rot }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}
