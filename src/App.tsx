import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import Collection from "./pages/Collection";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import FlashcardsGame from "./pages/FlashcardsGame";
import MemoryGame from "./pages/MemoryGame";
import SpellingGame from "./pages/SpellingGame";
import MathGame from "./pages/MathGame";
import AbcGame from "./pages/AbcGame";
import ListeningGame from "./pages/ListeningGame";
import CountingGame from "./pages/CountingGame";
import PuzzleGame from "./pages/PuzzleGame";
import BalloonGame from "./pages/BalloonGame";
import CatapultGame from "./pages/CatapultGame";
import TraceGame from "./pages/TraceGame";
import { Backdrop } from "./components/Backdrop";
import { useProfile } from "./stores/useProfile";
import { useTheme } from "./stores/useTheme";

// Klistermärkesboken och Nabus bo laddas först när barnet går dit (egna chunks,
// som PWA:n förhämtar). Ingen global MotionConfig – sidorna har var sin.
const StickerBook = lazy(() => import("./pages/StickerBook"));
const StickerPage = lazy(() => import("./pages/StickerPage"));
const Nest = lazy(() => import("./pages/Nest"));

/** En lat sida med en egen, tom reserv medan den laddas. */
function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<main className="p-6" />}>{children}</Suspense>;
}

export default function App() {
  const theme = useTheme((s) => s.theme);
  const hasProfile = useProfile((s) => Boolean(s.name));

  // Applicera .dark på <html> när temat ändras
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <>
      <Backdrop />
      <Routes>
        <Route path="/" element={hasProfile ? <Navigate to="/dashboard" replace /> : <Welcome />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/game/flashcards" element={<FlashcardsGame />} />
        <Route path="/game/memory" element={<MemoryGame />} />
        <Route path="/game/spelling" element={<SpellingGame />} />
        <Route path="/game/math" element={<MathGame />} />
        <Route path="/game/abc" element={<AbcGame />} />
        <Route path="/game/listen" element={<ListeningGame />} />
        <Route path="/game/counting" element={<CountingGame />} />
        <Route path="/game/puzzle" element={<PuzzleGame />} />
        <Route path="/game/balloon" element={<BalloonGame />} />
        <Route path="/game/catapult" element={<CatapultGame />} />
        <Route path="/game/trace" element={<TraceGame />} />
        <Route path="/stickers" element={<Lazy><StickerBook /></Lazy>} />
        <Route path="/stickers/:pageId" element={<Lazy><StickerPage /></Lazy>} />
        <Route path="/nest" element={<Lazy><Nest /></Lazy>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
