import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { playPop, playWhoosh } from "../lib/sfx";
import { shuffle } from "../lib/shuffle";
import type { Concept, Level, PlayCategory } from "../types";

/* ------------------------------------------------------------------ */
/* Scen & fysik (logiska enheter – skalas till behållarens bredd)       */
/* ------------------------------------------------------------------ */

const W = 800;
const H = 450;
const GROUND = 400; // marknivå till höger om kullen
const GRAVITY = 520; // enheter/s²
const DT = 1 / 120; // fast tidssteg
const MAX_PULL = 150; // längsta dragning (enheter)
const MIN_PULL = 18; // kortare dragning = inget kast
const MAX_SPEED = 640; // fart vid full dragning → räckvidd ~780 enheter på plan mark
const MIN_ANGLE = (8 * Math.PI) / 180;
const MAX_ANGLE = (80 * Math.PI) / 180;
const BALL_R = 13;
const MAX_FLIGHT = 6; // s – sen återställs kulan alltid (ingen soft-lock)

const PIVOT = { x: 160, y: 335 }; // kastarmens axel
const ARM_LEN = 75;
const REST_DEG = -35; // armens viloläge (grader från lodrätt)
const LAUNCH = armTip(REST_DEG); // där kulan ligger i skopan

const CRATE_W = 54;
const CRATE_H = 40;
const FRAME = 64; // bildramen ovanpå tornet
const TOWER_HALF = FRAME / 2;

function armTip(deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: PIVOT.x + ARM_LEN * Math.sin(a), y: PIVOT.y - ARM_LEN * Math.cos(a) };
}

type Vec = { x: number; y: number };

/** Dragning → (begränsad) dragvektor + utgångsfart. Riktning = vinkel, längd = kraft. */
function aimFrom(pull: Vec) {
  const len = Math.min(MAX_PULL, Math.hypot(pull.x, pull.y));
  // kastet går motsatt dragningen; vinkel uppåt-höger mäts från vågrätt
  let angle = Math.atan2(pull.y, -pull.x);
  if (angle <= -Math.PI / 2 || angle > MAX_ANGLE) angle = MAX_ANGLE;
  else if (angle < MIN_ANGLE) angle = MIN_ANGLE;
  const power = len / MAX_PULL;
  const speed = power * MAX_SPEED;
  return {
    power,
    len,
    vel: { x: Math.cos(angle) * speed, y: -Math.sin(angle) * speed },
    // kulan ritas bakåt längs samma linje (halva sträckan, så den inte hamnar i marken)
    ballAt: { x: LAUNCH.x - Math.cos(angle) * len * 0.5, y: LAUNCH.y + Math.sin(angle) * len * 0.5 },
  };
}

type Tower = { concept: Concept; crates: number; x: number; phase: number };
type Round = { concept: Concept; towers: Tower[] };

/** Bildens upp-och-ner-gungning (från t > 0.6). Samma funktion för ritning och träffyta. */
function bobOf(tower: Tower, time: number, d: Difficulty) {
  if (d.t <= 0.6) return 0;
  return Math.sin(time * 1.4 * d.speed + tower.phase) * 9;
}

function towerTop(tower: Tower) {
  return GROUND - tower.crates * CRATE_H - FRAME;
}

/** Avstånd från punkt till rektangel (0 inuti). */
function distToRect(p: Vec, l: number, t: number, r: number, b: number) {
  const cx = Math.max(l, Math.min(p.x, r));
  const cy = Math.max(t, Math.min(p.y, b));
  return Math.hypot(p.x - cx, p.y - cy);
}

function buildTowers(options: Concept[], d: Difficulty): Tower[] {
  const n = options.length;
  const start = lerp(380, 450, d.t);
  const end = lerp(620, 730, d.t);
  const base = 1 + Math.round(d.t * 2.5); // 1 → 3–4 lådor
  return options.map((c, i) => ({
    concept: c,
    crates: Math.min(4, base + (Math.random() < 0.5 ? 0 : 1)),
    x: n === 1 ? (start + end) / 2 : start + ((end - start) * i) / (n - 1),
    phase: Math.random() * Math.PI * 2,
  }));
}

/** Förutsagd bana (samma Euler-integration som kastet). */
function predictPath(vel: Vec): Vec[] {
  const pts: Vec[] = [];
  let x = LAUNCH.x;
  let y = LAUNCH.y;
  let vx = vel.x;
  let vy = vel.y;
  const step = 1 / 30;
  for (let i = 0; i < 120; i++) {
    for (let k = 0; k < 4; k++) {
      vy += GRAVITY * (step / 4);
      x += vx * (step / 4);
      y += vy * (step / 4);
    }
    if (y > GROUND || x > W + 20) break;
    pts.push({ x, y });
  }
  return pts;
}

/* ------------------------------------------------------------------ */
/* Spelet                                                               */
/* ------------------------------------------------------------------ */

/**
 * Katapulten – ett ord läses upp, barnet drar tillbaka katapulten och
 * släpper för att välta tornet med rätt bild. Fel torn gungar bara.
 */
export default function CatapultGame() {
  const lang = useSettings((s) => s.lang);
  const { speak } = useSpeech();
  const lesson = useLesson("catapult");
  const coach = useCoach();

  const [category, setCategory] = useState<PlayCategory | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const nextTimer = useRef<number | undefined>(undefined);

  const current = rounds[index];
  const word = current ? labelOf(current.concept, lang) : "";
  const d = difficulty(level ?? 1, gold);

  useEffect(() => () => window.clearTimeout(nextTimer.current), []);

  const startLevel = (lvl: Level, isGold = false) => {
    if (!category) return;
    window.clearTimeout(nextTimer.current);
    const dd = difficulty(lvl, isGold);
    const count = Math.min(dd.rounds, 6);
    const towerCount = Math.min(4, Math.max(2, dd.options - 1));
    const words = lessonWords(category, lvl, count);
    const pool = distractorPool(category, lvl);
    setRounds(
      words.map((c) => ({
        concept: c,
        towers: buildTowers(shuffle([c, ...pickDistractors(c, pool, towerCount - 1, dd.t)]), dd),
      }))
    );
    setLevel(lvl);
    setGold(isGold);
    setIndex(0);
    lesson.reset();
  };

  // Läs upp ordet vid varje ny runda
  useEffect(() => {
    if (current) speak(word, lang, current.concept.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.concept.id, index, lang]);

  const onCorrect = () => {
    if (!category || !level) return;
    coach.cheer(lesson.correct());
    window.clearTimeout(nextTimer.current);
    nextTimer.current = window.setTimeout(() => {
      if (index === rounds.length - 1) lesson.finish(category, level, gold, rounds.length);
      else setIndex((n) => n + 1);
    }, 1600);
  };

  const onWrong = () => {
    lesson.wrong();
    coach.comfort();
    if (current) window.setTimeout(() => speak(word, lang, current.concept.id), 900);
  };

  const leave = () => {
    window.clearTimeout(nextTimer.current);
    setLevel(null);
  };

  // 1) Kategori
  if (!category) return <CategoryPicker game="catapult" title="Katapulten" onPick={setCategory} />;

  // 2) Nivå
  if (!level)
    return (
      <LevelPicker
        game="catapult"
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
        title="Pang! Bra kastat!"
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

  // 4) Sikta & kasta
  return (
    <main dir={getLanguage(lang).dir} className="mx-auto flex min-h-screen max-w-3xl flex-col gap-3 p-4 sm:p-6">
      <GameHeader onBack={leave} progress={index / rounds.length} level={level} gold={gold} combo={lesson.combo} />

      <div className="flex items-center justify-center gap-3">
        <motion.button
          onClick={() => speak(word, lang, current.concept.id)}
          aria-label="Hör ordet igen"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          whileTap={{ scale: 0.9 }}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-xl"
        >
          <Volume2 size={32} />
        </motion.button>
        {d.help === "full" ? (
          <span className="rounded-2xl bg-white px-5 py-2 text-3xl font-extrabold text-zinc-800 shadow dark:bg-zinc-800 dark:text-zinc-100">
            {word}
          </span>
        ) : (
          <span className="font-semibold text-zinc-600 dark:text-zinc-300">Lyssna! Vilken bild?</span>
        )}
      </div>

      <CatapultStage key={index} round={current} d={d} onCorrect={onCorrect} onWrong={onWrong} />

      <p className="text-center font-semibold text-zinc-600 dark:text-zinc-300">
        Dra tillbaka och släpp!{" "}
        <span dir="ltr" className="text-zinc-500 dark:text-zinc-400">
          ({index + 1} / {rounds.length})
        </span>
      </p>

      <Coach event={coach.event} />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Scenen: katapult, torn och fysik                                     */
/* ------------------------------------------------------------------ */

type Phase = "aim" | "drag" | "fly" | "lock";

type Sim = {
  phase: Phase;
  ball: Vec;
  vel: Vec;
  flight: number; // s sedan kastet
  dragFrom: Vec;
  pull: Vec;
  releasePower: number;
};

function CatapultStage({
  round,
  d,
  onCorrect,
  onWrong,
}: {
  round: Round;
  d: Difficulty;
  onCorrect: () => void;
  onWrong: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const sim = useRef<Sim>({
    phase: "aim",
    ball: { ...LAUNCH },
    vel: { x: 0, y: 0 },
    flight: 0,
    dragFrom: { x: 0, y: 0 },
    pull: { x: 0, y: 0 },
    releasePower: 0,
  });
  const timers = useRef<number[]>([]);
  const start = useRef(0);
  const [clock, setClock] = useState(0); // s sedan rundan började (driver ritningen)
  const [toppled, setToppled] = useState<string | null>(null);
  const [wobble, setWobble] = useState<{ id: string; n: number } | null>(null);
  const [burst, setBurst] = useState<Vec | null>(null);
  const [toast, setToast] = useState(0);

  // senaste props/data för rAF-loopen
  const live = useRef({ round, d, onCorrect, onWrong });
  live.current = { round, d, onCorrect, onWrong };

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const resetBall = () => {
    const s = sim.current;
    s.phase = "aim";
    s.ball = { ...LAUNCH };
    s.vel = { x: 0, y: 0 };
    s.flight = 0;
  };

  // Fysikloop: fast tidssteg i requestAnimationFrame. Städas vid unmount.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    start.current = last;
    let acc = 0;

    const hitTower = (tower: Tower) => {
      const s = sim.current;
      s.phase = "lock";
      const { round: r } = live.current;
      if (tower.concept.id === r.concept.id) {
        setToppled(tower.concept.id);
        setBurst({ ...s.ball });
        playPop();
        live.current.onCorrect();
      } else {
        setWobble((w) => ({ id: tower.concept.id, n: (w?.n ?? 0) + 1 }));
        live.current.onWrong();
        later(resetBall, 900);
      }
    };

    const miss = () => {
      sim.current.phase = "lock";
      setToast((n) => n + 1);
      later(resetBall, 600);
    };

    const step = (time: number) => {
      const s = sim.current;
      const { round: r, d: dd } = live.current;
      s.vel.y += GRAVITY * DT;
      s.ball.x += s.vel.x * DT;
      s.ball.y += s.vel.y * DT;
      s.flight += DT;
      // generös träffyta: mindre marginal när tornen står tätare / nivån är högre
      const spacing = r.towers.length > 1 ? Math.abs(r.towers[1].x - r.towers[0].x) : 200;
      const margin = Math.max(4, Math.min(lerp(24, 12, dd.t), (spacing - FRAME) / 2 - 2));
      for (const tw of r.towers) {
        const top = towerTop(tw) + bobOf(tw, time, dd);
        const dist = distToRect(s.ball, tw.x - TOWER_HALF, top, tw.x + TOWER_HALF, GROUND);
        if (dist < BALL_R + margin) {
          hitTower(tw);
          return;
        }
      }
      if (s.ball.y + BALL_R >= GROUND || s.ball.x > W + 40 || s.ball.x < -40 || s.flight > MAX_FLIGHT) miss();
    };

    const loop = (now: number) => {
      const frame = Math.min(0.1, (now - last) / 1000);
      last = now;
      const time = (now - start.current) / 1000;
      const s = sim.current;
      if (s.phase === "fly") {
        acc += frame;
        while (acc >= DT && s.phase === "fly") {
          acc -= DT;
          step(time);
        }
      } else acc = 0;
      setClock(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const pending = timers.current;
    return () => {
      cancelAnimationFrame(raf);
      pending.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const toScene = (e: React.PointerEvent): Vec | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const s = sim.current;
    if (s.phase !== "aim") return;
    const p = toScene(e);
    if (!p || p.x > W * 0.5) return; // tryck på/nära katapulten (vänstra halvan)
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* vissa webbläsare/pennor saknar capture – dragningen funkar ändå */
    }
    s.phase = "drag";
    s.dragFrom = p;
    s.pull = { x: 0, y: 0 };
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const s = sim.current;
    if (s.phase !== "drag") return;
    const p = toScene(e);
    if (!p) return;
    s.pull = { x: p.x - s.dragFrom.x, y: p.y - s.dragFrom.y };
  };

  const onUp = () => {
    const s = sim.current;
    if (s.phase !== "drag") return;
    const aim = aimFrom(s.pull);
    if (aim.len < MIN_PULL) {
      s.phase = "aim";
      return;
    }
    s.ball = { ...LAUNCH };
    s.vel = { ...aim.vel };
    s.flight = 0;
    s.releasePower = aim.power;
    s.phase = "fly";
    playWhoosh();
  };

  const onCancel = () => {
    if (sim.current.phase === "drag") sim.current.phase = "aim";
  };

  // ---- ritning ----
  const s = sim.current;
  const aim = s.phase === "drag" ? aimFrom(s.pull) : null;

  // armvinkel: vevas bakåt vid dragning, slår framåt vid kast
  let armDeg = REST_DEG;
  if (aim) armDeg = REST_DEG - aim.power * 40;
  else if (s.phase === "fly" || (s.phase === "lock" && s.flight > 0)) {
    const f = s.flight;
    const from = REST_DEG - s.releasePower * 40;
    if (f < 0.12) armDeg = lerp(from, 45, f / 0.12);
    else if (f < 0.6) armDeg = lerp(45, REST_DEG, (f - 0.12) / 0.48);
  }
  const tip = armTip(armDeg);
  const armTipNow = s.phase === "aim" ? LAUNCH : tip;

  const ballPos = aim ? aim.ballAt : s.phase === "aim" ? LAUNCH : s.ball;
  const showBall = !(s.phase === "lock" && toppled);

  let preview: Vec[] = [];
  if (aim && aim.len >= MIN_PULL && d.help !== "none") {
    const full = predictPath(aim.vel);
    preview = d.help === "full" ? full : full.slice(0, Math.max(4, Math.ceil(full.length * 0.25)));
  }

  return (
    <div dir="ltr" className="relative w-full overflow-hidden rounded-3xl shadow-lg">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none select-none"
        style={{ aspectRatio: `${W} / ${H}`, touchAction: "none" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        role="img"
        aria-label="Katapult och torn med bilder"
      >
        <defs>
          <linearGradient id="cat-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="[stop-color:#38bdf8] dark:[stop-color:#1e1b4b]" />
            <stop offset="70%" className="[stop-color:#bae6fd] dark:[stop-color:#7c3aed]" />
            <stop offset="100%" className="[stop-color:#e0f2fe] dark:[stop-color:#fb923c]" />
          </linearGradient>
          <radialGradient id="cat-stone" cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#e7e5e4" />
            <stop offset="100%" stopColor="#78716c" />
          </radialGradient>
        </defs>

        {/* Himmel, sol/måne, moln */}
        <rect x={0} y={0} width={W} height={H} fill="url(#cat-sky)" />
        <circle cx={690} cy={70} r={34} className="fill-yellow-300 dark:fill-amber-100" />
        <g className="fill-white opacity-90 dark:opacity-25">
          <ellipse cx={200 + ((clock * 6) % 900) - 100} cy={80} rx={60} ry={18} />
          <ellipse cx={230 + ((clock * 6) % 900) - 100} cy={66} rx={34} ry={16} />
          <ellipse cx={480 + ((clock * 4) % 900) - 300} cy={130} rx={48} ry={14} />
        </g>

        {/* Mark och kulle */}
        <rect x={0} y={GROUND} width={W} height={H - GROUND} className="fill-green-500 dark:fill-green-800" />
        <rect x={0} y={GROUND} width={W} height={6} className="fill-green-600 dark:fill-green-900" />
        <path d="M-10 450 L-10 384 Q 60 372 160 386 Q 250 394 320 450 Z" className="fill-green-400 dark:fill-green-700" />

        {/* Förutsagd bana */}
        {preview.map((p, i) =>
          i % 2 === 0 ? (
            <circle key={i} cx={p.x} cy={p.y} r={4} className="fill-white/90 dark:fill-amber-100/80" />
          ) : null
        )}

        {/* Torn */}
        {round.towers.map((tw) => (
          <TowerView
            key={tw.concept.id}
            tower={tw}
            bob={bobOf(tw, clock, d)}
            toppled={toppled === tw.concept.id}
            wobbleN={wobble?.id === tw.concept.id ? wobble.n : 0}
          />
        ))}

        {/* Katapult */}
        <g>
          {/* ram */}
          <path d={`M118 360 L${PIVOT.x} ${PIVOT.y} L202 360`} stroke="#7c2d12" strokeWidth={9} fill="none" strokeLinecap="round" />
          <rect x={92} y={352} width={120} height={14} rx={5} fill="#a16207" stroke="#713f12" strokeWidth={2} />
          {/* stopp-bom */}
          <rect x={196} y={318} width={10} height={40} rx={3} fill="#92400e" />
          {/* kastarm */}
          <g transform={`rotate(${armDeg} ${PIVOT.x} ${PIVOT.y})`}>
            <rect x={PIVOT.x - 5} y={PIVOT.y - ARM_LEN} width={10} height={ARM_LEN + 6} rx={4} fill="#b45309" stroke="#78350f" strokeWidth={2} />
            <path
              d={`M${PIVOT.x - 17} ${PIVOT.y - ARM_LEN - 4} Q ${PIVOT.x} ${PIVOT.y - ARM_LEN + 20} ${PIVOT.x + 17} ${PIVOT.y - ARM_LEN - 4}`}
              fill="#92400e"
              stroke="#78350f"
              strokeWidth={3}
            />
          </g>
          <circle cx={PIVOT.x} cy={PIVOT.y} r={6} fill="#57534e" />
          {/* hjul */}
          {[112, 192].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy={372} r={16} fill="#a16207" stroke="#713f12" strokeWidth={3} />
              <path d={`M${cx - 14} 372 H${cx + 14} M${cx} 358 V386`} stroke="#713f12" strokeWidth={2} />
              <circle cx={cx} cy={372} r={4} fill="#713f12" />
            </g>
          ))}
        </g>

        {/* Rep från skopan till kulan när man drar */}
        {aim && (
          <line x1={armTipNow.x} y1={armTipNow.y} x2={ballPos.x} y2={ballPos.y} stroke="#78350f" strokeWidth={3} strokeDasharray="5 4" />
        )}

        {/* Kulan: rund sten med stjärna */}
        {showBall && (
          <g transform={`translate(${ballPos.x} ${ballPos.y}) rotate(${s.phase === "fly" ? s.flight * 540 : 0})`}>
            <circle r={BALL_R} fill="url(#cat-stone)" stroke="#57534e" strokeWidth={2} />
            <text textAnchor="middle" dominantBaseline="central" fontSize={14} fill="#facc15">
              ★
            </text>
          </g>
        )}

        {/* Visa-hur-hand i början */}
        {d.help === "full" && s.phase === "aim" && !toppled && (
          <motion.text
            x={LAUNCH.x + 10}
            y={LAUNCH.y + 10}
            fontSize={34}
            animate={{ x: [0, -50, 0], y: [0, 40, 0], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: 1 }}
          >
            👆
          </motion.text>
        )}

        {/* Stjärnregn vid träff */}
        {burst &&
          Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <motion.text
                key={i}
                x={burst.x}
                y={burst.y}
                fontSize={22}
                textAnchor="middle"
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                animate={{ x: Math.cos(a) * 80, y: Math.sin(a) * 80 - 20, opacity: 0, scale: 1.3 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              >
                {i % 2 ? "⭐" : "✨"}
              </motion.text>
            );
          })}
      </svg>

      <AnimatePresence>
        {toast > 0 && (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0, 1, 1, 0], y: 0 }}
            transition={{ duration: 1.4, times: [0, 0.15, 0.7, 1] }}
            className="pointer-events-none absolute inset-x-0 top-3 text-center text-xl font-extrabold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]"
          >
            Försök igen!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Ett torn av trälådor med en inramad bild överst. */
function TowerView({ tower, bob, toppled, wobbleN }: { tower: Tower; bob: number; toppled: boolean; wobbleN: number }) {
  const crates = Array.from({ length: tower.crates }, (_, j) => j);
  // frys gungningen när tornet välter, så fall-animationen får ett fast mål
  const frozen = useRef<number | null>(null);
  if (toppled && frozen.current === null) frozen.current = bob;
  if (!toppled) frozen.current = null;
  const frameY = towerTop(tower) + (frozen.current ?? bob);
  const fall = (j: number) => {
    const cy = GROUND - (j + 0.5) * CRATE_H;
    const side = j % 2 === 0 ? 1 : -1;
    return {
      x: side * (18 + j * 14) + 30 + j * 8,
      y: GROUND - CRATE_H / 2 - cy - 2,
      rotate: side * (50 + j * 25),
    };
  };
  const originStyle = { transformBox: "fill-box", transformOrigin: "50% 50%" } as const;

  return (
    <motion.g
      key={wobbleN}
      style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
      animate={wobbleN > 0 ? { rotate: [0, -6, 5, -3, 2, 0] } : undefined}
      transition={{ duration: 0.7 }}
    >
      {crates.map((j) => {
        const y = GROUND - (j + 1) * CRATE_H;
        return (
          <motion.g
            key={j}
            style={originStyle}
            initial={false}
            animate={toppled ? fall(j) : { x: 0, y: 0, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.05 * (tower.crates - j), ease: [0.3, 0, 0.6, 1] }}
          >
            <rect x={tower.x - CRATE_W / 2} y={y} width={CRATE_W} height={CRATE_H} rx={3} fill="#d97706" stroke="#92400e" strokeWidth={3} />
            <path
              d={`M${tower.x - CRATE_W / 2 + 4} ${y + 4} L${tower.x + CRATE_W / 2 - 4} ${y + CRATE_H - 4} M${tower.x + CRATE_W / 2 - 4} ${y + 4} L${tower.x - CRATE_W / 2 + 4} ${y + CRATE_H - 4}`}
              stroke="#b45309"
              strokeWidth={3}
            />
          </motion.g>
        );
      })}

      {/* dammoln vid foten när tornet faller */}
      {toppled &&
        [-1, 0, 1].map((k) => (
          <motion.circle
            key={k}
            cx={tower.x + k * 30}
            cy={GROUND - 6}
            r={14}
            className="fill-stone-300 dark:fill-stone-500"
            initial={{ opacity: 0.8, scale: 0.4 }}
            animate={{ opacity: 0, scale: 2 }}
            transition={{ duration: 1, delay: 0.5 }}
            style={originStyle}
          />
        ))}

      <motion.g
        style={originStyle}
        initial={false}
        animate={toppled ? { x: 70, y: GROUND - FRAME / 2 - (frameY + FRAME / 2), rotate: 360 } : { x: 0, y: 0, rotate: 0 }}
        transition={{ duration: 1, ease: "easeIn" }}
      >
        <rect x={tower.x - FRAME / 2} y={frameY} width={FRAME} height={FRAME} rx={8} fill="#fffbeb" stroke="#92400e" strokeWidth={5} />
        <text x={tower.x} y={frameY + FRAME / 2 + 2} fontSize={38} textAnchor="middle" dominantBaseline="central">
          {tower.concept.emoji}
        </text>
      </motion.g>
    </motion.g>
  );
}
