import { cn } from "../lib/cn";

/**
 * Stjärnpåsen: en egen SVG-påse med dragsko och en stjärna på framsidan.
 * Visas alltid som påsen (aldrig som ett ensamt ⭐) och tillsammans med ordet
 * "påsen", t.ex. "[påse] 12 i påsen". Storlek = 1em, så den följer textstorleken.
 * Utan `title` är den dekorativ (aria-hidden) – texten bredvid bär betydelsen.
 */
export function StarPouch({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width="1em"
      height="1em"
      className={cn("inline-block shrink-0 align-[-0.15em]", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {/* veckad krage ovanför snöret */}
      <path
        d="M23 23 L19 11 Q24 14 27 9 Q30 15 32 8 Q34 15 37 9 Q40 14 45 11 L41 23 Z"
        fill="#f0b46b"
        stroke="#9a5b1e"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* själva påsen */}
      <path
        d="M24 21 C13 27 7 37 8.5 47 C10 56 20 60.5 32 60.5 C44 60.5 54 56 55.5 47 C57 37 51 27 40 21 Z"
        fill="#e9a35a"
        stroke="#9a5b1e"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* ljus kant (lite rundning) */}
      <path d="M17 34 C13 40 13 48 17 53" fill="none" stroke="#f8d29e" strokeWidth="3" strokeLinecap="round" />
      {/* dragskon med rosett */}
      <path d="M21 21 Q32 26 43 21" fill="none" stroke="#7c3a12" strokeWidth="3" strokeLinecap="round" />
      <path d="M42 22 C47 15 53 18 49 23 C47 25 44 24 42 22 Z" fill="#c2410c" stroke="#7c3a12" strokeWidth="1.5" />
      <path d="M42 22 C46 27 51 27 50 23" fill="none" stroke="#7c3a12" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M42.5 23 Q45 29 43 33" fill="none" stroke="#7c3a12" strokeWidth="1.8" strokeLinecap="round" />
      {/* stjärnan */}
      <path
        d="M32 31 L34.5 37.6 L41.5 37.9 L36 42.3 L37.9 49.1 L32 45.2 L26.1 49.1 L28 42.3 L22.5 37.9 L29.5 37.6 Z"
        fill="#facc15"
        stroke="#ca8a04"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
