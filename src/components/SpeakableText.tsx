import { Volume2 } from "lucide-react";
import { useSpeech } from "../hooks/useSpeech";
import { getLanguage } from "../data/languages";
import { cn } from "../lib/cn";
import type { LangCode } from "../types";

/**
 * Text som läses upp när man klickar på den. conceptId ger förinspelat klipp.
 * `lang` sätter bara textens språk/riktning (rätt avstavning av långa ord);
 * uppläsningen följer som förut det valda språket.
 * Tryckytan är minst 48 px hög även när texten är liten (osynlig kant runt).
 */
export function SpeakableText({
  text,
  conceptId,
  lang,
  className,
}: {
  text: string;
  conceptId?: string;
  lang?: LangCode;
  className?: string;
}) {
  const { speak } = useSpeech();
  return (
    <button
      type="button"
      onClick={() => speak(text, undefined, conceptId)}
      aria-label={`Lyssna: ${text}`}
      className={cn(
        "relative inline-flex items-center gap-2 active:scale-95 before:absolute before:-inset-x-2 before:-inset-y-3 before:content-['']",
        className
      )}
    >
      <span lang={lang} dir={lang ? getLanguage(lang).dir : undefined} className="word-fit">
        {text}
      </span>
      <Volume2 aria-hidden size={22} className="shrink-0" />
    </button>
  );
}
