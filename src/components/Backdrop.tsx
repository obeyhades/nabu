import { useTheme } from "../stores/useTheme";

/**
 * Dekorativ bakgrund för hela appen (renderas en gång i App).
 * Ljust läge: äng med mjuka kullar, färgbubblor och svävande former.
 * Mörkt läge: natthimmel med stjärnor och måne. Ren CSS – inga bilder.
 */
export function Backdrop() {
  const theme = useTheme((s) => s.theme);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {theme === "dark" ? (
        <>
          {/* Stjärnhimmel */}
          <div className="stars absolute inset-0" />
          <span className="animate-float absolute right-[8%] top-[6%] text-4xl opacity-70">🌙</span>
          <span className="animate-float absolute left-[12%] top-[22%] text-xl opacity-50 [animation-delay:1.5s]">⭐</span>
          <span className="animate-float absolute right-[24%] top-[38%] text-sm opacity-40 [animation-delay:3s]">✨</span>
          {/* Mjuk lila glöd */}
          <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute -right-24 top-2/3 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        </>
      ) : (
        <>
          {/* Prick-mönster + färgbubblor */}
          <div className="dots absolute inset-0" />
          <div className="absolute -left-28 -top-20 h-80 w-80 rounded-full bg-purple-300/25 blur-3xl" />
          <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-pink-300/25 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
          {/* Svävande former */}
          <span className="animate-float absolute left-[10%] top-[10%] text-4xl opacity-60">☁️</span>
          <span className="animate-float absolute right-[14%] top-[18%] text-3xl opacity-50 [animation-delay:2s]">☁️</span>
          <span className="animate-float absolute left-[70%] top-[55%] text-2xl opacity-40 [animation-delay:4s]">⭐</span>
          {/* Äng-horisont */}
          <div className="absolute -bottom-24 -left-1/4 h-48 w-3/4 rounded-[100%] bg-green-300/30" />
          <div className="absolute -bottom-28 -right-1/4 h-52 w-3/4 rounded-[100%] bg-emerald-300/25" />
        </>
      )}
    </div>
  );
}
