import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useAnimate } from "framer-motion";
import { Eraser, Volume2 } from "lucide-react";
import { CONCEPTS } from "../data/concepts";
import { shuffle } from "../lib/shuffle";
import { traceLevel, traceText, type TraceKind } from "../data/alphabets";
import { getLanguage } from "../data/languages";
import { LEVEL_COUNT } from "../data/levels";
import { useSettings } from "../stores/useSettings";
import { useSpeech } from "../hooks/useSpeech";
import { useLesson } from "../hooks/useLesson";
import { LevelPicker } from "../components/LevelPicker";
import { GameHeader } from "../components/GameHeader";
import { QuestionStage } from "../components/QuestionStage";
import { Coach } from "../components/Coach";
import { useCoach } from "../hooks/useCoach";
import { VictoryScreen } from "../components/VictoryScreen";
import { difficulty, type HelpLevel } from "../lib/difficulty";
import { playPop } from "../lib/sfx";
import { cn } from "../lib/cn";
import type { LangCode, Level } from "../types";

type Item = { label: string; text: string; conceptId?: string };
type Stroke = { pts: [number, number][]; color: string };

const MAX_ROUNDS = 7;
const CHECK_N = 200; // upplösning för rättningen (px i sida)
const INK_COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#3b82f6",
  "#22c55e",
];

// Tröskelvärden (se rapport): täckning av förlagan / bläck utanför förlagan
// (provkört mot simulerade spårningar och klotter, se scoreTrace)
const PASS_COVERAGE = { glyph: 0.6, word: 0.5 };
const MAX_SPILL = 0.3;
/** Max bläcklängd i förhållande till förlagans "mittlinje" – stoppar sicksack-klotter. */
const MAX_OVERDRAW = { glyph: 2.6, word: 2.8 };
/** Ungefärlig strecktjocklek i typsnittet (andel av fontstorleken, vikt 800). */
const GLYPH_THICKNESS = 0.17;

const FONT_STACK = `ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", "Varela Round", system-ui, sans-serif`;

type Layout = { fontPx: number; x: number; y: number; ink: number };

/** Var och hur stort tecknet ritas i en ruta på `size` px (samma för visning och rättning). */
function layoutGlyph(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  isWord: boolean,
  dir: "ltr" | "rtl",
): Layout {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.direction = dir;
  let fontPx = size * (isWord ? 0.42 : 0.7);
  ctx.font = `800 ${fontPx}px ${FONT_STACK}`;
  let m = ctx.measureText(text);
  const maxW = size * (isWord ? 0.9 : 0.82);
  const maxH = size * 0.8;
  const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const k = Math.min(1, maxW / Math.max(1, w), maxH / Math.max(1, h));
  if (k < 1) {
    fontPx *= k;
    ctx.font = `800 ${fontPx}px ${FONT_STACK}`;
    m = ctx.measureText(text);
  }
  const x = size / 2 + (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2;
  const y =
    size / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  const ink = Math.max(isWord ? 8 : 12, fontPx * (isWord ? 0.15 : 0.13));
  return { fontPx, x, y, ink };
}

function drawGuide(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  isWord: boolean,
  dir: "ltr" | "rtl",
  help: HelpLevel,
) {
  ctx.clearRect(0, 0, size, size);
  const l = layoutGlyph(ctx, text, size, isWord, dir);
  ctx.lineJoin = "round";
  if (help === "full") {
    ctx.fillStyle = "rgba(56, 189, 248, 0.42)";
    ctx.fillText(text, l.x, l.y);
  } else if (help === "some") {
    ctx.fillStyle = "rgba(139, 92, 246, 0.08)";
    ctx.fillText(text, l.x, l.y);
    ctx.setLineDash([8, 7]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(139, 92, 246, 0.75)";
    ctx.strokeText(text, l.x, l.y);
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = "rgba(128, 128, 128, 0.09)";
    ctx.fillText(text, l.x, l.y);
  }
}

function offscreen(n: number): CanvasRenderingContext2D | null {
  const c = document.createElement("canvas");
  c.width = n;
  c.height = n;
  return c.getContext("2d", { willReadFrequently: true });
}

function mask(ctx: CanvasRenderingContext2D, n: number): Uint8Array {
  const data = ctx.getImageData(0, 0, n, n).data;
  const out = new Uint8Array(n * n);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] > 100 ? 1 : 0;
  return out;
}

function strokeAll(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  scale: number,
  width: number,
) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = width;
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#000";
  for (const s of strokes) {
    if (s.pts.length === 1) {
      ctx.beginPath();
      ctx.arc(
        s.pts[0][0] * scale,
        s.pts[0][1] * scale,
        width / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    s.pts.forEach(([x, y], i) =>
      i === 0
        ? ctx.moveTo(x * scale, y * scale)
        : ctx.lineTo(x * scale, y * scale),
    );
    ctx.stroke();
  }
}

/**
 * Rättning: förlagan ritas på en liten osynlig canvas och jämförs med barnets bläck.
 *  - coverage = andel av förlagans pixlar som har bläck inom ~en penselbredd
 *  - spill    = andel av bläckets mittlinje som hamnar utanför en lite förstorad förlaga
 *  - overdraw = bläckets längd / förlagans ungefärliga mittlinjelängd (yta / tjocklek)
 */
function scoreTrace(
  text: string,
  isWord: boolean,
  dir: "ltr" | "rtl",
  strokes: Stroke[],
) {
  const n = CHECK_N;
  const g = offscreen(n);
  const gd = offscreen(n);
  const inkWide = offscreen(n);
  const inkLine = offscreen(n);
  if (!g || !gd || !inkWide || !inkLine)
    return { coverage: 1, spill: 0, overdraw: 1 };

  const l = layoutGlyph(g, text, n, isWord, dir);
  g.fillStyle = "#000";
  g.fillText(text, l.x, l.y);

  layoutGlyph(gd, text, n, isWord, dir);
  gd.fillStyle = "#000";
  gd.strokeStyle = "#000";
  gd.lineJoin = "round";
  gd.lineWidth = l.ink; // tolerans ≈ en halv penselbredd utanför kanten
  gd.fillText(text, l.x, l.y);
  gd.strokeText(text, l.x, l.y);

  // strokes är normaliserade 0–1 → skala till n
  strokeAll(inkWide, strokes, n, l.ink * 1.3);
  strokeAll(inkLine, strokes, n, 2);

  const G = mask(g, n);
  const GD = mask(gd, n);
  const IW = mask(inkWide, n);
  const IL = mask(inkLine, n);
  let gTotal = 0;
  let covered = 0;
  let line = 0;
  let outside = 0;
  for (let i = 0; i < G.length; i++) {
    if (G[i]) {
      gTotal++;
      if (IW[i]) covered++;
    }
    if (IL[i]) {
      line++;
      if (!GD[i]) outside++;
    }
  }
  let length = 0;
  for (const s of strokes)
    for (let i = 1; i < s.pts.length; i++)
      length +=
        Math.hypot(
          s.pts[i][0] - s.pts[i - 1][0],
          s.pts[i][1] - s.pts[i - 1][1],
        ) * n;
  const skeleton = gTotal / (l.fontPx * GLYPH_THICKNESS);
  return {
    coverage: gTotal ? covered / gTotal : 0,
    spill: line ? outside / line : 1,
    overdraw: skeleton > 0 ? length / skeleton : 0,
  };
}

/** Översta punkten på förlagan (vänster för ltr, höger för rtl) – där barnet börjar. */
function startPoint(
  text: string,
  isWord: boolean,
  dir: "ltr" | "rtl",
): [number, number] | null {
  const n = CHECK_N;
  const g = offscreen(n);
  if (!g) return null;
  const l = layoutGlyph(g, text, n, isWord, dir);
  g.fillStyle = "#000";
  g.fillText(text, l.x, l.y);
  const G = mask(g, n);
  for (let y = 0; y < n; y++) {
    const xs: number[] = [];
    for (let x = 0; x < n; x++) if (G[y * n + x]) xs.push(x);
    if (xs.length) {
      const x = dir === "rtl" ? xs[xs.length - 1] : xs[0];
      // flytta in lite i strecket så pricken hamnar mitt på det
      return [
        (x + (dir === "rtl" ? -l.ink * 0.3 : l.ink * 0.3)) / n,
        (y + l.ink * 0.4) / n,
      ];
    }
  }
  return null;
}

function canvasSize(): number {
  if (typeof window === "undefined") return 320;
  const byWidth = window.innerWidth - 32;
  const byHeight = window.innerHeight - 290;
  return Math.max(220, Math.min(440, byWidth, byHeight));
}

function makeItems(
  lang: LangCode,
  level: Level,
): { items: Item[]; kind: TraceKind } {
  const { items, kind } = traceLevel(lang, level);
  return {
    kind,
    // blanda ordningen så att samma nivå inte känns likadan varje gång
    items: shuffle(items).slice(0, MAX_ROUNDS).map((label) => ({
      label,
      text: kind === "word" ? traceText(label) : label,
      conceptId:
        kind === "word"
          ? CONCEPTS.find((c) => c.labels[lang] === label)?.id
          : undefined,
    })),
  };
}

/**
 * Spåra & rita – barnet spårar bokstäver, siffror och korta ord med fingret.
 * Förlagan blir svagare med nivån (full → streckad → nästan osynlig).
 * Framsteg sparas per språk eftersom alfabetet skiljer sig.
 */
export default function TraceGame() {
  const navigate = useNavigate();
  const lang = useSettings((s) => s.lang);
  const { speak } = useSpeech();
  const lesson = useLesson("trace");
  const coach = useCoach();
  const language = getLanguage(lang);
  const category = `trace-${lang}`;

  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [kind, setKind] = useState<TraceKind>("upper");
  const [index, setIndex] = useState(0);
  const [hasInk, setHasInk] = useState(false);
  const [passed, setPassed] = useState(false);
  const [size, setSize] = useState(canvasSize);

  const guideRef = useRef<HTMLCanvasElement | null>(null);
  const inkRef = useRef<HTMLCanvasElement | null>(null);
  const strokes = useRef<Stroke[]>([]);
  const drawing = useRef<Stroke | null>(null);
  const [scope, animate] = useAnimate<HTMLDivElement>();

  const current = items[index];
  const isWord = kind === "word";
  const dir = isWord ? language.dir : lang === "ar" ? "rtl" : "ltr";
  const help: HelpLevel = level ? difficulty(level, gold).help : "full";

  const startLevel = (lvl: Level, isGold = false) => {
    const made = makeItems(lang, lvl);
    setItems(made.items);
    setKind(made.kind);
    setLevel(lvl);
    setGold(isGold);
    setIndex(0);
    setPassed(false);
    strokes.current = [];
    setHasInk(false);
    lesson.reset();
  };

  const say = useCallback(() => {
    if (current) speak(current.label, lang, current.conceptId);
  }, [current, lang, speak]);

  useEffect(() => {
    const onResize = () => setSize(canvasSize());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const redrawInk = useCallback(() => {
    const c = inkRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    if (!current) return;
    const { ink } = layoutGlyph(ctx, current.text, size, isWord, dir);
    for (const s of strokes.current) {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = ink;
      ctx.beginPath();
      if (s.pts.length === 1) {
        ctx.arc(
          s.pts[0][0] * size,
          s.pts[0][1] * size,
          ink / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      } else {
        s.pts.forEach(([x, y], i) =>
          i === 0
            ? ctx.moveTo(x * size, y * size)
            : ctx.lineTo(x * size, y * size),
        );
        ctx.stroke();
      }
    }
  }, [current, size, isWord, dir]);

  // Rita förlagan + bläck när tecken, storlek eller hjälp ändras
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    for (const c of [guideRef.current, inkRef.current]) {
      if (!c) continue;
      c.width = Math.round(size * dpr);
      c.height = Math.round(size * dpr);
    }
    const g = guideRef.current?.getContext("2d");
    if (g && current) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawGuide(g, current.text, size, isWord, dir, help);
    }
    redrawInk();
  }, [current, size, isWord, dir, help, redrawInk]);

  // Läs upp tecknet automatiskt när det finns hjälp
  useEffect(() => {
    if (current && help !== "none") say();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items]);

  const start =
    level && current && help === "full"
      ? startPoint(current.text, isWord, dir)
      : null;

  const pointFrom = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (passed) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const s: Stroke = {
      pts: [pointFrom(e)],
      color: INK_COLORS[strokes.current.length % INK_COLORS.length],
    };
    drawing.current = s;
    strokes.current.push(s);
    redrawInk();
    if (!hasInk) setHasInk(true);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = drawing.current;
    const ctx = inkRef.current?.getContext("2d");
    if (!s || !ctx || !current) return;
    e.preventDefault();
    const native = e.nativeEvent;
    const events =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [];
    const r = e.currentTarget.getBoundingClientRect();
    const pts: [number, number][] = (events.length ? events : [native]).map(
      (ev) => [
        (ev.clientX - r.left) / r.width,
        (ev.clientY - r.top) / r.height,
      ],
    );
    const { ink } = layoutGlyph(ctx, current.text, size, isWord, dir);
    ctx.strokeStyle = s.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = ink;
    ctx.beginPath();
    let [px, py] = s.pts[s.pts.length - 1];
    ctx.moveTo(px * size, py * size);
    for (const p of pts) {
      [px, py] = p;
      ctx.lineTo(px * size, py * size);
      s.pts.push(p);
    }
    ctx.stroke();
  };

  const onUp = () => {
    drawing.current = null;
  };

  const clear = () => {
    if (passed) return;
    strokes.current = [];
    drawing.current = null;
    setHasInk(false);
    redrawInk();
  };

  const check = () => {
    if (!current || !level || passed) return;
    if (!strokes.current.length) {
      void animate(scope.current, { x: [0, -6, 6, 0] }, { duration: 0.3 });
      return;
    }
    const { coverage, spill, overdraw } = scoreTrace(
      current.text,
      isWord,
      dir,
      strokes.current,
    );
    const need = isWord ? PASS_COVERAGE.word : PASS_COVERAGE.glyph;
    const maxOver = isWord ? MAX_OVERDRAW.word : MAX_OVERDRAW.glyph;
    if (coverage >= need && spill <= MAX_SPILL && overdraw <= maxOver) {
      setPassed(true);
      playPop();
      coach.cheer(lesson.correct());
      window.setTimeout(() => {
        if (index === items.length - 1)
          lesson.finish(category, level, gold, items.length);
        else {
          strokes.current = [];
          setHasInk(false);
          setPassed(false);
          setIndex((n) => n + 1);
        }
      }, 1100);
    } else {
      void animate(
        scope.current,
        { x: [0, -12, 12, -8, 8, -4, 0] },
        { duration: 0.45 },
      );
      lesson.wrong();
      coach.comfort();
    }
  };

  // 1) Välj nivå (inget kategorival – framsteg per språk)
  if (!level)
    return (
      <LevelPicker
        game="trace"
        category={category}
        subtitle={`Spåra & rita · ${language.name}`}
        onPick={(l) => startLevel(l)}
        onPickGold={(l) => startLevel(l, true)}
        onBack={() => navigate("/dashboard")}
      />
    );

  // 2) Klar
  if (lesson.done && lesson.result) {
    return (
      <VictoryScreen
        title="Snyggt ritat!"
        stars={lesson.result.stars}
        xp={lesson.result.xp}
        detail={
          lesson.mistakes === 0
            ? "Perfekt spårat!"
            : `${lesson.mistakes} försök till`
        }
        gold={gold}
        bestCombo={lesson.bestCombo}
        onNext={
          level < LEVEL_COUNT && !gold ? () => startLevel(level + 1) : undefined
        }
        onReplay={() => startLevel(level, gold)}
        onChangeLevel={() => setLevel(null)}
      />
    );
  }

  if (!current) return null;

  const prompt =
    kind === "word"
      ? "Spåra ordet!"
      : kind === "digit"
        ? "Spåra siffran!"
        : "Spåra bokstaven!";

  // 3) Spåra
  return (
    <main className="mx-auto flex h-[100dvh] max-w-xl flex-col overflow-hidden overscroll-none p-4 sm:p-6">
      <GameHeader
        onBack={() => setLevel(null)}
        progress={index / items.length}
        level={level}
        gold={gold}
        combo={lesson.combo}
      />

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-full">
          <QuestionStage qkey={index}>
            <div className="flex items-center gap-3">
              <p className="text-lg font-bold text-zinc-600 dark:text-zinc-300">
                {prompt}
              </p>
              <motion.button
                onClick={say}
                aria-label="Hör igen"
                whileTap={{ scale: 0.9 }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow-lg"
              >
                <Volume2 size={28} />
              </motion.button>
            </div>
          </QuestionStage>
        </div>

        <div
          ref={scope}
          className="relative"
          style={{ width: size, height: size }}
        >
          <div className="absolute inset-0 rounded-3xl border-4 border-violet-200 bg-white shadow-inner dark:border-violet-900 dark:bg-zinc-800" />
          <canvas
            ref={guideRef}
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ width: size, height: size }}
          />
          {start && !hasInk && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute h-6 w-6 rounded-full bg-pink-500 shadow-lg ring-4 ring-pink-300/70"
              style={{ left: start[0] * size - 12, top: start[1] * size - 12 }}
              animate={{ scale: [1, 1.45, 1], opacity: [1, 0.7, 1] }}
              transition={{ repeat: Infinity, duration: 1.1 }}
            />
          )}
          <canvas
            ref={inkRef}
            role="img"
            aria-label={`Rita ${current.text}`}
            className="absolute inset-0 cursor-crosshair rounded-3xl"
            style={{ width: size, height: size, touchAction: "none" }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onLostPointerCapture={onUp}
          />
          <AnimatePresence>
            {passed && (
              <motion.div
                key="sparkle"
                className="pointer-events-none absolute inset-0"
                aria-hidden
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const a = (i / 10) * Math.PI * 2;
                  return (
                    <motion.span
                      key={i}
                      className="absolute text-3xl"
                      style={{ left: size / 2 - 16, top: size / 2 - 16 }}
                      initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
                      animate={{
                        x: Math.cos(a) * size * 0.42,
                        y: Math.sin(a) * size * 0.42,
                        scale: 1.2,
                        opacity: 0,
                      }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                    >
                      {i % 2 ? "✨" : "⭐"}
                    </motion.span>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          className="flex w-full items-center justify-center gap-3"
          style={{ maxWidth: size }}
        >
          <button
            onClick={clear}
            disabled={!hasInk || passed}
            className={cn(
              "flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-white text-lg font-bold text-zinc-600 shadow transition active:scale-95 dark:bg-zinc-800 dark:text-zinc-200",
              (!hasInk || passed) && "opacity-50",
            )}
          >
            <Eraser size={24} /> Sudda
          </button>
          <button
            onClick={check}
            disabled={passed}
            className="flex h-16 flex-[1.4] items-center justify-center rounded-2xl bg-gradient-to-r from-green-400 to-emerald-600 text-xl font-black text-white shadow-lg transition active:scale-95 disabled:opacity-60"
          >
            Klar ✓
          </button>
        </div>

        <span
          dir="ltr"
          className="font-semibold text-zinc-500 dark:text-zinc-400"
        >
          {index + 1} / {items.length}
        </span>
      </div>

      <Coach event={coach.event} />
    </main>
  );
}
