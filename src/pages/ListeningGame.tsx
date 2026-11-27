import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
import { QuestionStage, RoundCount } from "../components/QuestionStage";
import { FitGrid } from "../components/FitGrid";
import { ChoiceButton } from "../components/ChoiceButton";
import { choiceState } from "../lib/choice";
import { Coach } from "../components/Coach";
import { useCoach } from "../hooks/useCoach";
import { VictoryScreen } from "../components/VictoryScreen";
import { difficulty } from "../lib/difficulty";
import { shuffle } from "../lib/shuffle";
import { GAME_MAIN, PROMPT_TEXT } from "../lib/layout";
import type { Concept, Level, PlayCategory } from "../types";

type Round = { concept: Concept; options: Concept[] };

/**
 * Hör & hitta – ren hörförståelse: ordet spelas upp (ingen text) och barnet
 * väljer rätt bild. Högre nivåer = fler bilder och mer lika alternativ.
 *
 * MALL för ordspel: kategori → nivå → spela → vinst. Svårigheten kommer från
 * difficulty(level), orden från lessonWords(), poängen från useLesson().
 */
export default function ListeningGame() {
  const lang = useSettings((s) => s.lang);
  const { speak } = useSpeech();
  const lesson = useLesson("listen");
  const coach = useCoach();

  const [category, setCategory] = useState<PlayCategory | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [gold, setGold] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const current = rounds[index];
  const word = current ? labelOf(current.concept, lang) : "";

  const startLevel = (lvl: Level, isGold = false) => {
    if (!category) return;
    const d = difficulty(lvl, isGold);
    const words = lessonWords(category, lvl, d.rounds);
    const pool = distractorPool(category, lvl);
    const optionCount = d.options + 1; // bilder är lätta att skilja – ett extra alternativ
    setRounds(
      words.map((c) => ({
        concept: c,
        options: shuffle([c, ...pickDistractors(c, pool, optionCount - 1, d.t)]),
      }))
    );
    setLevel(lvl);
    setGold(isGold);
    setIndex(0);
    setPicked(null);
    lesson.reset();
  };

  // Spela upp ordet automatiskt vid varje ny fråga
  useEffect(() => {
    if (current) speak(word, lang, current.concept.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.concept.id, index, lang]);

  const choose = (opt: Concept) => {
    if (picked !== null || !current || !category || !level) return;
    setPicked(opt.id);
    if (opt.id === current.concept.id) {
      coach.cheer(lesson.correct());
      window.setTimeout(() => {
        if (index === rounds.length - 1) lesson.finish(category, level, gold, rounds.length);
        else {
          setIndex((n) => n + 1);
          setPicked(null);
        }
      }, 750);
    } else {
      lesson.wrong();
      coach.comfort();
      window.setTimeout(() => setPicked(null), 800);
    }
  };

  // 1) Välj äventyr eller kategori
  if (!category) return <CategoryPicker game="listen" title="Hör & hitta" onPick={setCategory} />;

  // 2) Välj nivå
  if (!level)
    return (
      <LevelPicker
        game="listen"
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
        title="Bra lyssnat!"
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

  // 4) Lyssna & välj
  return (
    <main dir={getLanguage(lang).dir} className={GAME_MAIN}>
      <GameHeader
        onBack={() => setLevel(null)}
        progress={index / rounds.length}
        level={level}
        gold={gold}
        combo={lesson.combo}
      />

      <QuestionStage qkey={index} split>
        <div className="stage-prompt">
          {/* Stor lyssna-knapp – ordet är hemligheten! */}
          <motion.button
            onClick={() => speak(word, lang, current.concept.id)}
            aria-label="Hör ordet igen"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
            whileTap={{ scale: 0.9 }}
            className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow-xl low:h-24 low:w-24 short:h-20 short:w-20"
          >
            <Volume2 size={52} className="short:size-10" />
          </motion.button>
          <p className={PROMPT_TEXT}>Lyssna! Vilken bild hör du?</p>
        </div>

        {/* Rutorna mäter själva höjden: alla bilder syns, även på en liggande mobil */}
        <FitGrid count={current.options.length}>
          {current.options.map((opt, i) => (
            <ChoiceButton
              key={opt.id}
              index={i}
              state={choiceState(opt.id, picked, current.concept.id)}
              onClick={() => choose(opt)}
              className="text-[calc(var(--tile)*0.5)]"
            >
              {opt.emoji}
            </ChoiceButton>
          ))}
        </FitGrid>

        <RoundCount n={index + 1} of={rounds.length} />
      </QuestionStage>

      <Coach event={coach.event} />
    </main>
  );
}
