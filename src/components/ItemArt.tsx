import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { ItemArt as ItemArtDef, CssArtId, LangCode, SvgArtId } from "../types";
import { cn } from "../lib/cn";
import { showsEmoji } from "../lib/emojiSupport";
import { numberOf } from "../lib/stickerArt";
import { ALPHABETS } from "../data/alphabets";
import { GROW_STAGES } from "../data/nestItems";
import { parseStickerId } from "../data/stickers";
import { recentPlacedWords, useStickers } from "../stores/useStickers";

/**
 * Konsten för en sak i Nabus bo: emoji, egen CSS/SVG-konst eller en egen SVG-hatt.
 * All konst här är egenritad (inga bilder utifrån) och dekorativ (aria-hidden) –
 * knappen eller platsen runt om bär namnet.
 *
 * Storlek: 1em = konstens BREDD. Emoji och hattar är 1em × 1em; fönster är
 * 110:80, mattor 170:24 och girlanger 280:52 (samma mått som i boet). Med
 * `fill` fyller konsten i stället sin förälder (t.ex. fönsterramen i scenen).
 */
export function ItemArt({
  art,
  fill = false,
  grow,
  className,
}: {
  art: ItemArtDef;
  fill?: boolean;
  grow?: 0 | 1 | 2; // Lilla plantans steg (🌱 → 🌿 → 🌳)
  className?: string;
}) {
  if ("e" in art) {
    const e = grow !== undefined && art.e === GROW_STAGES[0] ? GROW_STAGES[grow] : art.e;
    return (
      <span aria-hidden className={cn("inline-block leading-none", className)}>
        {e}
      </span>
    );
  }
  if ("svg" in art) return <HatArt id={art.svg} className={className} />;
  return <CssArt id={art.css} arg={art.arg} fill={fill} className={className} />;
}

// ── Hattar (egna SVG, 1em × 1em; brättet ligger nedtill som på emoji-hattar) ──

/** En femuddig stjärna som SVG-väg. */
function starPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
}

function HatArt({ id, className }: { id: SvgArtId; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width="1em"
      height="1em"
      aria-hidden
      focusable="false"
      className={cn("inline-block overflow-visible", className)}
    >
      {id === "luva" && <Luva />}
      {id === "nightcap" && <Nightcap />}
      {id === "starhat" && <Starhat />}
    </svg>
  );
}

/** Nabus luva: stickad mössa med tofs och resår. */
function Luva() {
  return (
    <g strokeLinejoin="round">
      <path d="M14 74 C14 45 30 28 50 28 C70 28 86 45 86 74 Z" fill="#e2475f" stroke="#9f1239" strokeWidth="3" />
      <path d="M22 56 Q50 44 78 56" fill="none" stroke="#fde7e1" strokeWidth="5" strokeLinecap="round" />
      <path d="M17 66 Q50 54 83 66" fill="none" stroke="#fde7e1" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      <rect x="9" y="68" width="82" height="20" rx="9" fill="#be123c" stroke="#9f1239" strokeWidth="3" />
      {[20, 30, 40, 50, 60, 70, 80].map((x) => (
        <line key={x} x1={x} y1="72" x2={x} y2="84" stroke="#fb7185" strokeWidth="3" strokeLinecap="round" />
      ))}
      <circle cx="50" cy="20" r="12" fill="#fff7ed" stroke="#e7cfc0" strokeWidth="3" />
      <circle cx="44" cy="17" r="3" fill="#fde7e1" />
      <circle cx="55" cy="23" r="2.5" fill="#fde7e1" />
    </g>
  );
}

/** Nattmössan: lång mjuk luva som hänger åt sidan, med tofs och stjärnprickar. */
function Nightcap() {
  return (
    <g strokeLinejoin="round">
      <path
        d="M14 84 C18 52 34 22 60 14 C76 10 90 22 88 44 C82 32 72 28 66 34 C62 40 70 60 86 84 Z"
        fill="#3b82f6"
        stroke="#1e3a8a"
        strokeWidth="3"
      />
      <path d={starPath(38, 56, 6)} fill="#fde68a" />
      <path d={starPath(56, 36, 5)} fill="#fde68a" />
      <circle cx="62" cy="64" r="3" fill="#fde68a" />
      <circle cx="30" cy="74" r="2.5" fill="#fde68a" />
      <path d="M10 80 Q50 71 90 80 L90 93 Q50 84 10 93 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="3" />
      <circle cx="88" cy="47" r="9" fill="#fde047" stroke="#ca8a04" strokeWidth="2.5" />
    </g>
  );
}

/** Stjärnhatten: hög spetsig hatt med guldband och stjärnor. */
function Starhat() {
  return (
    <g strokeLinejoin="round">
      <ellipse cx="50" cy="87" rx="45" ry="9" fill="#5b21b6" stroke="#3b0764" strokeWidth="3" />
      <path d="M24 86 C34 62 42 34 50 6 Q55 4 57 9 C62 34 68 62 76 86 Z" fill="#7c3aed" stroke="#3b0764" strokeWidth="3" />
      <path d="M26 79 Q50 86 74 79 L76 86 Q50 93 24 86 Z" fill="#facc15" stroke="#a16207" strokeWidth="2" />
      <path d={starPath(46, 56, 8)} fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
      <path d={starPath(60, 38, 5)} fill="#fde047" />
      <path d={starPath(52, 22, 3.5)} fill="#fde047" />
      <circle cx="36" cy="70" r="2.2" fill="#fde68a" />
      <circle cx="64" cy="66" r="2" fill="#fde68a" />
    </g>
  );
}

// ── CSS-/SVG-konst för boet ─────────────────────────────────────────────

/** Bredd:höjd per konst (1em = bredd). */
const ASPECT: Record<CssArtId, number> = {
  moss: 170 / 24,
  stripes: 170 / 24,
  rainbowRug: 170 / 24,
  sky: 110 / 80,
  sunset: 110 / 80,
  aurora: 110 / 80,
  stool: 1,
  frame: 1,
  beads: 2,
  stringLights: 280 / 52,
  bunting: 280 / 52,
  numberBunting: 280 / 52,
  letterBunting: 280 / 52,
};

const RUG_BG: Partial<Record<CssArtId, string>> = {
  moss:
    "radial-gradient(circle at 18% 45%, #84cc16 0 5%, transparent 6%), radial-gradient(circle at 42% 60%, #a3e635 0 4%, transparent 5%), radial-gradient(circle at 66% 40%, #84cc16 0 5%, transparent 6%), radial-gradient(circle at 84% 58%, #a3e635 0 4%, transparent 5%), radial-gradient(ellipse at 50% 40%, #86efac, #4d7c0f 78%)",
  stripes:
    "repeating-linear-gradient(90deg, #fb7185 0 7%, #fef3c7 7% 14%, #2dd4bf 14% 21%, #fef3c7 21% 28%)",
  rainbowRug:
    "radial-gradient(ellipse at 50% 50%, #fef3c7 0 16%, #a78bfa 16% 29%, #60a5fa 29% 42%, #34d399 42% 55%, #facc15 55% 68%, #fb923c 68% 81%, #f87171 81% 100%)",
};

function CssArt({ id, arg, fill, className }: { id: CssArtId; arg?: string; fill: boolean; className?: string }) {
  const box: CSSProperties | undefined = fill ? undefined : { width: "1em", height: `${1 / ASPECT[id]}em` };
  const base = cn("relative block", fill && "h-full w-full", className);

  const rug = RUG_BG[id];
  if (rug)
    return (
      <span
        aria-hidden
        className={cn(base, "rounded-[50%] shadow-[inset_0_-0.01em_0.02em_rgb(0_0_0/0.25)]")}
        style={{ ...box, background: rug }}
      />
    );

  switch (id) {
    case "sky":
    case "sunset":
    case "aurora":
      return (
        <span aria-hidden className={cn(base, "overflow-hidden rounded-t-[50%_40%] rounded-b-[0.04em]")} style={box}>
          <WindowView id={id} />
          {/* fönsterspröjsar */}
          <span className="absolute inset-y-0 left-1/2 w-[2.5%] -translate-x-1/2 bg-amber-900/60" />
          <span className="absolute inset-x-0 top-[55%] h-[3.5%] bg-amber-900/60" />
          <span className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0.06em_rgb(0_0_0/0.3)]" />
        </span>
      );
    case "stool":
      return <SvgBox box={box} className={base} viewBox="0 0 100 100"><Stool /></SvgBox>;
    case "frame":
      return <WordFrame box={box} className={base} />;
    case "beads":
      return <SvgBox box={box} className={base} viewBox="0 0 100 50"><Beads /></SvgBox>;
    case "stringLights":
      return <SvgBox box={box} className={base} viewBox="0 0 280 52"><StringLights /></SvgBox>;
    case "bunting":
      return <SvgBox box={box} className={base} viewBox="0 0 280 52"><Pennants count={9} /></SvgBox>;
    case "numberBunting":
      return (
        <SvgBox box={box} className={base} viewBox="0 0 280 52">
          <Pennants count={20} labels={Array.from({ length: 20 }, (_, i) => String(i + 1))} />
        </SvgBox>
      );
    case "letterBunting":
      return (
        <SvgBox box={box} className={base} viewBox="0 0 280 52">
          <Pennants count={10} labels={bannerLetters(arg)} />
        </SvgBox>
      );
    default:
      return null;
  }
}

function SvgBox({ box, className, viewBox, children }: { box?: CSSProperties; className: string; viewBox: string; children: ReactNode }) {
  return (
    <svg viewBox={viewBox} aria-hidden focusable="false" className={cn(className, "overflow-visible")} style={box}>
      {children}
    </svg>
  );
}

/** Utsikten i fönstret. Dagshimlen blir natthimmel med stjärnor och måne i mörkt läge. */
function WindowView({ id }: { id: "sky" | "sunset" | "aurora" }) {
  if (id === "sky")
    return (
      <>
        <span className="absolute inset-0 bg-[linear-gradient(to_bottom,#7dd3fc,#e0f2fe)] dark:hidden">
          <span className="absolute right-[14%] top-[14%] h-[22%] w-[16%] rounded-full bg-yellow-300 shadow-[0_0_0.06em_#fde047]" />
          <span className="absolute left-[12%] top-[44%] h-[14%] w-[34%] rounded-full bg-white/90" />
          <span className="absolute left-[20%] top-[36%] h-[16%] w-[18%] rounded-full bg-white/90" />
        </span>
        {/* .stars har en egen bakgrundsbild, så den ligger i ett eget lager ovanpå gradienten */}
        <span className="absolute inset-0 hidden bg-[linear-gradient(to_bottom,#1e1b4b,#312e81)] dark:block">
          <span className="stars absolute inset-0" />
          <span className="absolute right-[12%] top-[10%] text-[0.2em] leading-none">🌙</span>
        </span>
      </>
    );
  if (id === "sunset")
    return (
      <span className="absolute inset-0 bg-[linear-gradient(to_bottom,#7c3aed_0%,#f472b6_45%,#fb923c_78%,#fde68a_100%)]">
        <span className="absolute bottom-[-14%] left-1/2 h-[40%] w-[30%] -translate-x-1/2 rounded-full bg-yellow-300/90" />
        <span className="stars absolute inset-0 hidden opacity-60 dark:block" />
      </span>
    );
  // Norrskenet är alltid en natthimmel; banden böljar (stilla vid reducerad rörelse)
  return (
    <span className="absolute inset-0 bg-[linear-gradient(to_bottom,#0b1023,#1e3a5f)]">
      <span className="stars absolute inset-0" />
      <span className="animate-aurora absolute inset-y-0 -left-1/4 -right-1/4 bg-[radial-gradient(ellipse_30%_34%_at_32%_42%,rgb(52_211_153/0.75),transparent_70%),radial-gradient(ellipse_26%_28%_at_62%_32%,rgb(167_139_250/0.6),transparent_70%),radial-gradient(ellipse_22%_24%_at_80%_52%,rgb(45_212_191/0.5),transparent_70%)]" />
    </span>
  );
}

/** Pallen (ersätter 🪑, som är Emoji 12). */
function Stool() {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <path d="M30 42 L20 92" stroke="#92400e" strokeWidth="8" />
      <path d="M70 42 L80 92" stroke="#92400e" strokeWidth="8" />
      <path d="M50 44 L50 94" stroke="#78350f" strokeWidth="7" />
      <path d="M25 72 L75 72" stroke="#78350f" strokeWidth="5" />
      <path d="M16 34 L16 42 Q50 54 84 42 L84 34 Z" fill="#b45309" stroke="#78350f" strokeWidth="3" />
      <ellipse cx="50" cy="34" rx="34" ry="10" fill="#d4a373" stroke="#78350f" strokeWidth="3" />
      <ellipse cx="44" cy="32" rx="14" ry="3" fill="#e9c39b" />
    </g>
  );
}

/** Pärlhalsbandet: en båge av runda pärlor i bandens färger. */
const BEAD_COLORS = ["#34d399", "#fbbf24", "#fb923c", "#f43f5e", "#a78bfa", "#60a5fa"];
const BEAD_POINTS = Array.from({ length: 11 }, (_, i) => {
  const t = ((15 + i * 15) * Math.PI) / 180;
  return { x: 50 + 42 * Math.cos(t), y: 6 + 36 * Math.sin(t) };
});

function Beads() {
  return (
    <g>
      <path
        d={`M${BEAD_POINTS.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L")}`}
        fill="none"
        stroke="#a16207"
        strokeWidth="1.5"
      />
      {BEAD_POINTS.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="6.5" fill={BEAD_COLORS[i % BEAD_COLORS.length]} stroke="rgb(0 0 0 / 0.25)" strokeWidth="1" />
          <circle cx={p.x - 2} cy={p.y - 2} r="1.8" fill="rgb(255 255 255 / 0.7)" />
        </g>
      ))}
    </g>
  );
}

// ── Girlanger: ett snöre som hänger mellan två krokar ──

const SAG = { x0: 4, x1: 276, y: 6, dip: 22 };

/** Punkt på snöret (kvadratisk Bézier) vid t ∈ [0, 1]. */
function onString(t: number): { x: number; y: number } {
  const cx = (SAG.x0 + SAG.x1) / 2;
  const cy = SAG.y + SAG.dip * 2;
  const u = 1 - t;
  return { x: u * u * SAG.x0 + 2 * u * t * cx + t * t * SAG.x1, y: u * u * SAG.y + 2 * u * t * cy + t * t * SAG.y };
}

function StringPath() {
  const cx = (SAG.x0 + SAG.x1) / 2;
  return (
    <path
      d={`M${SAG.x0} ${SAG.y} Q${cx} ${SAG.y + SAG.dip * 2} ${SAG.x1} ${SAG.y}`}
      fill="none"
      stroke="#78716c"
      strokeWidth="1.6"
    />
  );
}

const PENNANT_COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"];

/** Vimplar längs snöret, ev. med en bokstav eller siffra på varje. */
function Pennants({ count, labels }: { count: number; labels?: string[] }) {
  const w = Math.min(26, 250 / count);
  const h = w * 1.15;
  return (
    <g>
      <StringPath />
      {Array.from({ length: count }, (_, i) => {
        const { x, y } = onString((i + 0.5) / count);
        const label = labels?.[i];
        return (
          <g key={i}>
            <path
              d={`M${(x - w / 2).toFixed(1)} ${y.toFixed(1)} L${(x + w / 2).toFixed(1)} ${y.toFixed(1)} L${x.toFixed(1)} ${(y + h).toFixed(1)} Z`}
              fill={PENNANT_COLORS[i % PENNANT_COLORS.length]}
              stroke="rgb(0 0 0 / 0.15)"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
            {label && (
              <text
                x={x}
                y={y + h * 0.36}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={w * 0.5}
                fontWeight="800"
                fill="#fff"
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** De första tio bokstäverna på vimpeln (arabiska läses från höger, så ordningen vänds). */
function bannerLetters(arg?: string): string[] {
  const a = arg && arg in ALPHABETS ? ALPHABETS[arg as LangCode] : ALPHABETS.sv;
  const first = a.upper.slice(0, 10);
  return a.lower ? first : [...first].reverse();
}

const BULB_COLORS = ["#fde047", "#f87171", "#34d399", "#60a5fa", "#f472b6", "#fb923c"];

/** Ljusslingan: lampor på en sladd. I mörkt läge lyser de (sken runt varje lampa). */
function StringLights() {
  const n = 9;
  return (
    <g>
      <StringPath />
      {Array.from({ length: n }, (_, i) => {
        const { x, y } = onString((i + 0.5) / n);
        const color = BULB_COLORS[i % BULB_COLORS.length];
        return (
          <g key={i}>
            <circle cx={x} cy={y + 12} r="13" fill={color} className="opacity-0 dark:opacity-20" />
            <circle cx={x} cy={y + 12} r="8" fill={color} className="opacity-0 dark:opacity-40" />
            <rect x={x - 3} y={y} width="6" height="5" rx="1" fill="#57534e" />
            <ellipse cx={x} cy={y + 12} rx="5" ry="7.5" fill={color} stroke="rgb(0 0 0 / 0.2)" strokeWidth="0.8" />
          </g>
        );
      })}
    </g>
  );
}

/** Ordtavlan: de fyra senast inklistrade orden i en träram. */
function WordFrame({ box, className }: { box?: CSSProperties; className: string }) {
  const owned = useStickers((s) => s.owned);
  const words = useMemo(() => recentPlacedWords(owned, 4), [owned]);
  return (
    <span
      aria-hidden
      className={cn(className, "rounded-[0.08em] border-[0.07em] border-amber-700 bg-amber-50 p-[0.05em] shadow-[0_0.03em_0.05em_rgb(0_0_0/0.3)]")}
      style={box}
    >
      <span className="grid h-full w-full grid-cols-2 grid-rows-2 place-items-center gap-[0.03em]">
        {Array.from({ length: 4 }, (_, i) => {
          const p = words[i] ? parseStickerId(words[i]) : null;
          const concept = p?.family === "word" ? p.concept : null;
          const n = concept ? numberOf(concept.id) : null;
          return (
            <span key={i} className="grid h-full w-full place-items-center rounded-[0.03em] bg-white/80 text-[0.3em] leading-none">
              {!concept ? null : n !== null ? (
                <span dir="ltr" className="font-black text-indigo-600">{n}</span>
              ) : showsEmoji(concept.emoji) ? (
                concept.emoji
              ) : (
                <span className="text-[0.4em] font-bold text-zinc-600">{concept.labels.sv}</span>
              )}
            </span>
          );
        })}
      </span>
    </span>
  );
}
