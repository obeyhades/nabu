import { useEffect, useMemo, useRef, useState } from "react";
import { lessonWords, labelOf } from "../data/concepts";
import { LEVEL_COUNT } from "../data/levels";
import { getLanguage } from "../data/languages";
import { useSettings } from "../stores/useSettings";
import { useSpeech } from "../hooks/useSpeech";
import { useLesson } from "../hooks/useLesson";
import { CategoryPicker } from "../components/CategoryPicker";
import { LevelPicker } from "../components/LevelPicker";
import { GameHeader } from "../components/GameHeader";
import { QuestionStage, BigPicture } from "../components/QuestionStage";
import { Coach } from "../components/Coach";
import { useCoach } from "../hooks/useCoach";
import { VictoryScreen } from "../components/VictoryScreen";
import { Button } from "../components/Button";
import { celebrate } from "../lib/celebrate";
import { difficulty } from "../lib/difficulty";
import { shuffle } from "../lib/shuffle";
import { graphemes, normChar } from "../lib/graphemes";
import { cn } from "../lib/cn";
import { balancedRowWidth } from "../lib/fit";
import { GAME_MAIN } from "../lib/layout";
import { useElementSize } from "../hooks/useElementSize";
import type { Concept, Level, PlayCategory } from "../types";


export default function SpellingGame() {
  const lang = useSettings((s) => s.lang);
  const { speak } = useSpeech();
  const lesson = useLesson("spelling");
  const coach = useCoach();
  const inputRef = useRef<HTMLInputElement>(null);

  // pekskärm: öppna inte OS-tangentbordet förrän barnet själv trycker i fältet
  const isTouch = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
    []
  );
  const [kbMode, setKbMode] = useState(false);
  const [bankBox, { w: bankW }] = useElementSize<HTMLDivElement>();

  const [category, setCategory] = useState<PlayCategory | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [index, setIndex] = useState(0);
  const [bank, setBank] = useState<string[]>([]);
  const [accepted, setAccepted] = useState<string[]>([]); // godkända grafem hittills
  const [wrong, setWrong] = useState(false);
  const [locked, setLocked] = useState(false);

  const current = concepts[index];
  const word = (current ? labelOf(current, lang) : "").replace(/\s+/g, "");
  const targetG = useMemo(() => graphemes(word), [word]);
  const d = level ? difficulty(level, gold) : null;

  // Nytt ord: ny bokstavsbank, töm svar, ev. ledtråd
  useEffect(() => {
    if (!current || !level || !d) return;
    // Extra vilse-bokstäver: 0 på nivå 1 → 4 på nivå 20 (+2 i guld)
    const extra = Math.round(d.t * 4) + (gold ? 2 : 0);
    const pool = concepts
      .filter((c) => c.id !== current.id)
      .flatMap((c) => graphemes(labelOf(c, lang).replace(/\s+/g, "")));
    const distractors = shuffle(pool).slice(0, extra);
    setBank(shuffle([...targetG, ...distractors]));
    setAccepted([]);
    setWrong(false);
    setLocked(false);
    if (d.help !== "none") speak(word, lang, current.id); // ledtråd utom på mästarnivåerna
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, lang, level, gold]);

  const win = () => {
    if (!category || !level || !current) return;
    setLocked(true);
    speak(word, lang, current.id);
    coach.cheer(lesson.correct());
    celebrate();
    window.setTimeout(() => {
      if (index === concepts.length - 1) {
        lesson.finish(category, level, gold, concepts.length);
      } else {
        setIndex((n) => n + 1);
      }
    }, 900);
  };

  const reject = () => {
    setWrong(true);
    lesson.wrong();
    coach.comfort();
    window.setTimeout(() => setWrong(false), 500);
  };

  /** Validera per grafem: fel bokstav släpps aldrig in (skakar istället). */
  const tryValue = (nextG: string[]) => {
    if (locked) return;
    for (let i = 0; i < nextG.length; i++) {
      if (i >= targetG.length || normChar(nextG[i]) !== normChar(targetG[i])) {
        reject();
        return;
      }
    }
    setAccepted(nextG);
    if (nextG.length === targetG.length) win();
  };

  const tapLetter = (g: string) => {
    tryValue([...accepted, g]);
    if (!isTouch || kbMode) inputRef.current?.focus();
  };

  const onType = (v: string) => tryValue(graphemes(v.replace(/\s+/g, "")));

  const startLevel = (lvl: Level, isGold = false) => {
    if (!category) return;
    setLevel(lvl);
    setGold(isGold);
    setConcepts(lessonWords(category, lvl, Math.min(7, difficulty(lvl, isGold).rounds)));
    setIndex(0);
    lesson.reset();
  };

  // 1) Välj kategori
  if (!category) return <CategoryPicker game="spelling" title="Stava ordet" onPick={setCategory} />;

  // 2) Välj nivå
  if (!level || !d)
    return (
      <LevelPicker
        game="spelling"
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
  const n = targetG.length;
  const inputSize = n <= 9 ? "text-3xl" : n <= 13 ? "text-2xl" : "text-xl";
  // Bokstavsknapparnas bredd (min-w-12, md:min-w-14, short:min-w-11) → jämna rader i banken
  const landscapeLow = typeof window !== "undefined" && window.innerWidth > window.innerHeight && window.innerHeight <= 500;
  const keyW = landscapeLow ? 44 : typeof window !== "undefined" && window.innerWidth >= 768 ? 56 : 48;
  const bankRowW = balancedRowWidth(bank.length, bankW, keyW, 8);

  // 4) Spela – skriv på tangentbordet OCH/ELLER tryck på bokstäverna
  return (
    <main dir={getLanguage(lang).dir} className={GAME_MAIN}>
      <GameHeader
        onBack={() => setLevel(null)}
        progress={index / concepts.length}
        level={level}
        gold={gold}
        combo={lesson.combo}
      />

      <QuestionStage qkey={index} split>
        <div className="stage-prompt">
          <BigPicture className="text-8xl low:text-7xl md:text-9xl short:text-7xl">{current.emoji}</BigPicture>
        </div>

        <div className="stage-answers flex w-full flex-col items-center justify-center gap-3">
          <input
            ref={inputRef}
            autoFocus={!isTouch}
            value={accepted.join("")}
            onChange={(e) => onType(e.target.value)}
            onClick={() => {
              if (isTouch && !kbMode) {
                setKbMode(true);
                window.setTimeout(() => inputRef.current?.focus(), 0);
              }
            }}
            dir={getLanguage(lang).dir}
            lang={lang}
            placeholder="Skriv eller tryck…"
            inputMode={isTouch && !kbMode ? "none" : "text"}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className={cn(
              // långa ord får mindre text, så att början av ordet inte rullar ur bild
              "w-full max-w-xs select-text rounded-2xl border-2 bg-white px-5 py-3 text-center font-bold lowercase outline-none dark:bg-zinc-800 md:max-w-sm",
              inputSize,
              wrong
                ? "animate-shake border-red-400 text-red-500"
                : "border-purple-300 text-purple-600 focus:border-purple-500 dark:border-purple-800 dark:text-purple-300"
            )}
          />
          {/* Hur många bokstäver kvar – prickarna krymper för långa ord (aldrig bredare än skärmen) */}
          <div className="flex w-full max-w-xs justify-center gap-1.5" dir="ltr">
            {targetG.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 min-w-1.5 max-w-6 flex-1 rounded-full",
                  i < accepted.length ? "bg-emerald-400" : "bg-zinc-300 dark:bg-zinc-600"
                )}
              />
            ))}
          </div>

          {/* Bokstavsbank – tryck för att fylla i fältet. Raderna blir lika långa
              (6 bokstäver på 320 px = 3 + 3, aldrig 5 + 1 med en ensam bokstav) */}
          <div ref={bankBox} className="w-full md:max-w-xl">
            <div className="mx-auto flex flex-wrap justify-center gap-2" style={{ maxWidth: bankRowW || undefined }}>
              {bank.map((letter, i) => (
                <button
                  key={i}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => tapLetter(letter)}
                  className="h-14 min-w-12 rounded-xl bg-white px-2 text-2xl font-bold uppercase text-purple-600 shadow transition active:scale-90 dark:bg-zinc-800 dark:text-purple-300 md:h-16 md:min-w-14 md:text-3xl short:h-12 short:min-w-11"
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="stage-count flex items-center gap-4">
          <Button
            onClick={() => {
              if (!locked) {
                setAccepted([]);
                setWrong(false);
                if (!isTouch || kbMode) inputRef.current?.focus();
              }
            }}
            className="bg-white text-purple-600 dark:bg-zinc-800 dark:text-purple-300 short:py-2"
          >
            Sudda
          </Button>
          <span dir="ltr" className="font-semibold text-zinc-500 dark:text-zinc-400">
            {index + 1} / {concepts.length}
          </span>
        </div>
      </QuestionStage>
      <Coach event={coach.event} />
    </main>
  );
}
