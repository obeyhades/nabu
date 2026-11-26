import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { ITEM_BY_ID } from "../../data/nestItems";
import { useSpeech } from "../../hooks/useSpeech";
import { ItemThumb, PouchAmount } from "./NestBits";

/**
 * Första besöket i boet: Nabu hälsar välkommen, berättar om påsen (bara om
 * Stjärnboden är på) och ger barnet sin luva. Ett tryck på luvan sätter den på
 * Nabu – sedan syns den i alla spel (barnet kan ta av den i Pynta).
 * Ingen brådska, inga löften: allt sägs högt och "Nästa" går i barnets takt.
 */

type Step = { id: "hej" | "sparat" | "pasen" | "luva"; text: string };

const LUVA = ITEM_BY_ID.get("hat-luva");

export function NestIntro({ welcome, shopOn, onDone }: { welcome: number; shopOn: boolean; onDone: () => void }) {
  const { speak } = useSpeech();
  const steps: Step[] = [
    { id: "hej", text: "Välkommen hem till mig! Här får du göra fint." },
    ...(shopOn && welcome > 0
      ? [{ id: "sparat" as const, text: `Jag har sparat ${welcome} stjärnor i påsen åt dig!` }]
      : []),
    ...(shopOn
      ? [
          {
            id: "pasen" as const,
            text: "Nya stjärnor du får på stigarna hoppar ner i påsen – och stjärnorna på stigen finns kvar!",
          },
        ]
      : []),
    { id: "luva", text: "Titta, en mössa till mig – tryck på den!" },
  ];
  const [i, setI] = useState(0);
  const step = steps[Math.min(i, steps.length - 1)];
  const last = step.id === "luva";

  // Första raden läses upp när boet öppnas (barnet har just tryckt sig hit)
  useEffect(() => {
    speak(steps[0].text, "sv");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bara vid första visningen
  }, []);

  const next = () => {
    const n = Math.min(i + 1, steps.length - 1);
    setI(n);
    speak(steps[n].text, "sv");
  };

  return (
    <section dir="ltr" aria-label="Välkommen till Nabus bo" className="mt-4">
      {/* Nabus pratbubbla pekar upp mot Nabu i scenen */}
      <div className="relative rounded-3xl bg-white p-4 shadow-lg dark:bg-zinc-800">
        <span
          aria-hidden
          className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white dark:bg-zinc-800"
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex min-h-20 items-center gap-3"
          >
            <p aria-live="polite" className="flex-1 text-lg font-bold leading-snug">
              {step.id === "sparat" ? (
                <>
                  Jag har sparat <PouchAmount n={welcome} className="align-middle" /> åt dig!
                </>
              ) : (
                step.text
              )}
            </p>
            <button
              type="button"
              onClick={() => speak(step.text, "sv")}
              aria-label="Lyssna igen"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-purple-100 text-xl outline-none focus-visible:ring-4 focus-visible:ring-purple-400 dark:bg-purple-900/50"
            >
              🔊
            </button>
          </motion.div>
        </AnimatePresence>

        {/* Var i introt vi är (stilla prickar) */}
        <div aria-hidden className="mt-2 flex justify-center gap-1.5">
          {steps.map((s, n) => (
            <span
              key={s.id}
              className={cn("h-2 w-2 rounded-full", n <= i ? "bg-purple-500" : "bg-zinc-300 dark:bg-zinc-600")}
            />
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          {last && LUVA ? (
            <button
              type="button"
              onClick={onDone}
              aria-label="Nabus luva – sätt den på Nabu"
              className="flex min-h-28 min-w-36 flex-col items-center justify-center gap-1 rounded-3xl bg-amber-50 p-3 shadow ring-4 ring-amber-300 ring-offset-4 ring-offset-white outline-none focus-visible:ring-purple-400 motion-safe:active:scale-95 dark:bg-amber-950/50 dark:ring-offset-zinc-800"
            >
              <ItemThumb item={LUVA} w={72} h={64} />
              <span className="text-sm font-bold">{LUVA.name}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="min-h-14 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 px-8 text-lg font-bold text-white shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-purple-300 motion-safe:active:scale-95"
            >
              Nästa ▶
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
