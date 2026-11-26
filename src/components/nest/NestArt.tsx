import { cn } from "../../lib/cn";

/**
 * Den fasta konsten i Nabus bo (egen SVG/CSS, inga bilder utifrån): väggarna
 * med årsringar, golvet, grenen, krokarna, hyllplanet, fönsterbrädan, Nabus
 * stubbe och de stängda fönsterluckorna. Allt ritas i scenens logiska
 * koordinater (viewBox 400 × 300) och har ett mörkt läge via html.dark.
 */

/** Stängda fönsterluckor när fönstret är tomt. */
export function Shutters() {
  return (
    <span className="absolute inset-0 grid grid-cols-2 gap-[4%] bg-[#6b4220] p-[3%] dark:bg-[#3a2412]">
      {[0, 1].map((i) => (
        <span
          key={i}
          className="relative rounded-[0.2rem] bg-[repeating-linear-gradient(0deg,#b07a45_0_22%,#9a6537_22%_25%)] dark:bg-[repeating-linear-gradient(0deg,#6e4a2b_0_22%,#5a3b22_22%_25%)]"
        >
          <span
            className={cn(
              "absolute top-1/2 h-[10%] w-[8%] -translate-y-1/2 rounded-full bg-amber-300/80",
              i ? "left-[10%]" : "right-[10%]"
            )}
          />
        </span>
      ))}
    </span>
  );
}

/** Väggarna, golvet, grenen, krokar och konsoler (bakgrunden, 400 × 300). */
export function Hollow({ uid }: { uid: string }) {
  const ring = [46, 92, 140, 190, 242, 296];
  return (
    <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      <defs>
        <radialGradient id={`${uid}d`} cx="50%" cy="48%" r="72%">
          <stop offset="0" stopColor="#f9e4c1" />
          <stop offset="0.45" stopColor="#efc994" />
          <stop offset="0.8" stopColor="#dba86d" />
          <stop offset="1" stopColor="#b97f45" />
        </radialGradient>
        <radialGradient id={`${uid}n`} cx="50%" cy="48%" r="72%">
          <stop offset="0" stopColor="#6e5039" />
          <stop offset="0.5" stopColor="#4f3726" />
          <stop offset="1" stopColor="#2a1b10" />
        </radialGradient>
        <linearGradient id={`${uid}fd`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9a468" />
          <stop offset="1" stopColor="#b47a42" />
        </linearGradient>
        <linearGradient id={`${uid}fn`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c3525" />
          <stop offset="1" stopColor="#2f2016" />
        </linearGradient>
      </defs>

      {/* väggar med årsringar */}
      <rect width="400" height="300" fill={`url(#${uid}d)`} className="dark:hidden" />
      <rect width="400" height="300" fill={`url(#${uid}n)`} className="hidden dark:inline" />
      <g fill="none" strokeWidth="2.2" className="stroke-[rgb(140_86_40/0.16)] dark:stroke-[rgb(0_0_0/0.28)]">
        {ring.map((r) => (
          <ellipse key={r} cx="200" cy="170" rx={r} ry={r * 0.82} />
        ))}
      </g>
      {/* kvistar i träet */}
      <g className="fill-[#b07a45] stroke-[#8a5a2e] dark:fill-[#3d2a1c] dark:stroke-[#2a1b10]" strokeWidth="1.5">
        <ellipse cx="34" cy="212" rx="7" ry="4" />
        <ellipse cx="376" cy="58" rx="6" ry="3.5" />
        <ellipse cx="118" cy="182" rx="4" ry="2.4" />
      </g>

      {/* golvet */}
      <ellipse cx="200" cy="314" rx="250" ry="76" fill={`url(#${uid}fd)`} className="dark:hidden" />
      <ellipse cx="200" cy="314" rx="250" ry="76" fill={`url(#${uid}fn)`} className="hidden dark:inline" />
      <ellipse
        cx="200"
        cy="314"
        rx="250"
        ry="76"
        fill="none"
        strokeWidth="2"
        className="stroke-[rgb(255_240_220/0.45)] dark:stroke-[rgb(255_220_180/0.08)]"
      />

      {/* lampkroken och spikarna för girlangen */}
      <g className="fill-none stroke-stone-500 dark:stroke-stone-400" strokeWidth="1.6" strokeLinecap="round">
        <path d="M92 0 V8" />
        <circle cx="92" cy="10" r="2" />
      </g>
      <g className="fill-stone-500 dark:fill-stone-400">
        <circle cx="64" cy="24" r="2.6" />
        <circle cx="336" cy="24" r="2.6" />
      </g>

      {/* grenen där en vän kan sitta */}
      <g strokeLinecap="round" fill="none" className="stroke-[#8b5a2b] dark:stroke-[#5a3a1f]">
        <path d="M406 80 C374 84 344 90 294 94" strokeWidth="9" />
        <path d="M352 88 Q362 76 376 74" strokeWidth="3.5" />
      </g>
      <g className="fill-[#65a30d] dark:fill-[#3f6212]">
        <ellipse cx="380" cy="72" rx="8" ry="3.6" transform="rotate(-24 380 72)" />
        <ellipse cx="300" cy="99" rx="6" ry="3" transform="rotate(20 300 99)" />
      </g>

      {/* hyllans konsoler */}
      <g className="fill-[#8b5a2b] dark:fill-[#4a3020]">
        <path d="M300 203 h9 l-9 13 z" />
        <path d="M360 203 h-9 l9 13 z" />
      </g>
    </svg>
  );
}

/** Fönsterbrädan och hyllplanet – ritas FRAMFÖR sakerna så att olika emojitypsnitt inte syns sväva. */
export function Planks() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 300"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <g className="fill-[#a8703c] dark:fill-[#5e3e24]">
        <rect x="134" y="125.5" width="132" height="6" rx="2" />
        <rect x="290" y="197" width="80" height="6" rx="2" />
      </g>
      <g className="fill-[#d6a066] dark:fill-[#7a5434]">
        <rect x="134" y="125.5" width="132" height="1.6" rx="0.8" />
        <rect x="290" y="197" width="80" height="1.6" rx="0.8" />
      </g>
    </svg>
  );
}

/** Nabus stubbe (scenkonst, ingen plats för saker). */
export function Perch() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 300"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <ellipse cx="200" cy="283" rx="40" ry="6" className="fill-black/15 dark:fill-black/30" />
      <path d="M172 257 V276 Q200 286 228 276 V257 Z" className="fill-[#8a5a2e] dark:fill-[#56381d]" />
      <path
        d="M181 262 v12 M193 265 v14 M207 265 v14 M219 262 v12"
        strokeWidth="1.4"
        strokeLinecap="round"
        className="stroke-[#6b4220] dark:stroke-[#3b2512]"
      />
      <ellipse cx="200" cy="257" rx="28" ry="6.5" className="fill-[#e6b982] dark:fill-[#8a6444]" />
      <g fill="none" strokeWidth="1" className="stroke-[rgb(140_86_40/0.45)] dark:stroke-[rgb(0_0_0/0.35)]">
        <ellipse cx="200" cy="257" rx="18" ry="4" />
        <ellipse cx="200" cy="257" rx="9" ry="2" />
      </g>
    </svg>
  );
}
