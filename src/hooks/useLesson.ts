import { useCallback, useRef, useState } from "react";
import { useProfile } from "../stores/useProfile";
import { useStats, XP_PER_STAR } from "../stores/useStats";
import { celebrate } from "../lib/celebrate";
import { playCorrect, playWrong, playLevelUp, playCombo } from "../lib/sfx";
import { lessonKey } from "../lib/progress";
import { starsFor } from "../lib/difficulty";
import type { GameId, Level } from "../types";

/**
 * Gemensam poäng-logik för en lektion: fel, kombo (rätt i rad), stjärnor,
 * XP och belöningar när lektionen är klar. Varje spel anropar `correct()` /
 * `wrong()` och till sist `finish()`.
 */
export function useLesson(game: GameId) {
  const addStars = useProfile((s) => s.addStars);
  const completeLesson = useStats((s) => s.completeLesson);

  const [mistakes, setMistakes] = useState(0);
  const mistakesRef = useRef(0); // läses i finish() även från timers
  const [combo, setCombo] = useState(0);
  const comboRef = useRef(0); // synkron kopia, så ljudet vet kombon direkt
  const [bestCombo, setBestCombo] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ stars: number; xp: number } | null>(null);

  const reset = useCallback(() => {
    mistakesRef.current = 0;
    setMistakes(0);
    comboRef.current = 0;
    setCombo(0);
    setBestCombo(0);
    setDone(false);
    setResult(null);
  }, []);

  /** Rätt svar: ljud + kombo. Returnerar nya kombon. */
  const correct = useCallback((silent = false) => {
    const next = comboRef.current + 1;
    comboRef.current = next;
    setCombo(next);
    setBestCombo((b) => Math.max(b, next));
    if (!silent) {
      // var tredje rätt i rad låter extra festligt
      if (next % 3 === 0) playCombo();
      else playCorrect();
    }
    return next;
  }, []);

  const wrong = useCallback((silent = false) => {
    mistakesRef.current += 1;
    setMistakes(mistakesRef.current);
    comboRef.current = 0;
    setCombo(0);
    if (!silent) playWrong();
  }, []);

  /** Spara stjärnor + XP och visa vinstskärmen. */
  const finish = useCallback(
    (category: string, level: Level, gold: boolean, rounds: number) => {
      const stars = starsFor(mistakesRef.current, rounds);
      const xp = stars * XP_PER_STAR * (gold ? 2 : 1);
      addStars(lessonKey(game, category, level, gold), stars);
      completeLesson(xp);
      celebrate();
      playLevelUp();
      setResult({ stars, xp });
      setDone(true);
    },
    [addStars, completeLesson, game]
  );

  return { mistakes, combo, bestCombo, done, result, correct, wrong, finish, reset };
}
