import { useCallback, useRef, useState } from "react";
import { useProfile } from "../stores/useProfile";
import { useStats, XP_PER_STAR, todayStr } from "../stores/useStats";
import { useSettings } from "../stores/useSettings";
import { useStickers } from "../stores/useStickers";
import { useNest } from "../stores/useNest";
import { useRewards } from "../stores/useRewards";
import { celebrate } from "../lib/celebrate";
import { playCorrect, playWrong, playLevelUp, playCombo } from "../lib/sfx";
import { lessonKey } from "../lib/progress";
import { starsFor } from "../lib/difficulty";
import { planLesson, pouchFor } from "../lib/rewards";
import { requestPersistOnce } from "../lib/persist";
import { logError } from "../lib/errors";
import { lastLessonWords } from "../data/concepts";
import { lastTraceItems } from "../data/alphabets";
import { WORD_GAMES } from "../data/stickers";
import type { GameId, LangCode, Level, PlayCategory } from "../types";

/**
 * Gemensam poäng-logik för en lektion: fel, kombo (rätt i rad), stjärnor,
 * XP och belöningar när lektionen är klar. Varje spel anropar `correct()` /
 * `wrong()` och till sist `finish()`.
 * Klistermärken, stjärnor i påsen och gåvor ges BARA här i finish() – aldrig
 * under render eller i en effekt, och aldrig slumpmässigt.
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
  const doneRef = useRef(false); // spärr: en lektion belönas bara en gång
  const [result, setResult] = useState<{ stars: number; xp: number } | null>(null);

  const reset = useCallback(() => {
    mistakesRef.current = 0;
    setMistakes(0);
    comboRef.current = 0;
    setCombo(0);
    setBestCombo(0);
    doneRef.current = false;
    setDone(false);
    setResult(null);
    useRewards.getState().clear();
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

  /** Spara stjärnor + XP, ge klistermärken och påsstjärnor, och visa vinstskärmen. */
  const finish = useCallback(
    (category: string, level: Level, gold: boolean, rounds: number) => {
      if (doneRef.current) return; // dubbel/sen finish → ingenting
      doneRef.current = true;
      const stars = starsFor(mistakesRef.current, rounds);
      const xp = stars * XP_PER_STAR * (gold ? 2 : 1);
      const key = lessonKey(game, category, level, gold);
      const before = useProfile.getState().stars; // läs FÖRE addStars
      addStars(key, stars);
      const after = useProfile.getState().stars;
      const pouch = pouchFor(before, key, stars); // bara nya bästa stjärnor
      if (pouch > 0) useNest.getState().earn(pouch);

      // Ett fel i belöningarna får aldrig stoppa vinstskärmen: stjärnor, påse
      // och XP sparas ändå, och remsan visar då bara påsen (aldrig något inaktuellt).
      try {
        const traceLang = game === "trace" ? (category.slice("trace-".length) as LangCode) : null;
        const plan = planLesson(
          {
            game,
            category,
            level,
            gold,
            stars,
            rounds,
            lang: traceLang ?? useSettings.getState().lang,
            words: WORD_GAMES.has(game) ? lastLessonWords(category as PlayCategory) : [],
            trace: traceLang ? lastTraceItems(traceLang, level) : null,
          },
          useStickers.getState(),
          before,
          after,
          todayStr()
        );
        useStickers.getState().apply(plan);
        if (plan.gifts.length) useNest.getState().gift(plan.gifts);
        useRewards.getState().show({ key, pouch, ...plan.reveal }); // alltid – aldrig inaktuell
      } catch (error) {
        logError("useLesson.finish", error);
        useRewards.getState().show({
          key,
          pouch,
          word: null,
          rain: [],
          upgrades: [],
          badges: [],
          gifts: [],
          praise: "",
          allKnown: false,
        });
      }

      completeLesson(xp);
      celebrate();
      playLevelUp();
      setResult({ stars, xp });
      setDone(true);
      requestPersistOnce();
    },
    [addStars, completeLesson, game]
  );

  return { mistakes, combo, bestCombo, done, result, correct, wrong, finish, reset };
}
