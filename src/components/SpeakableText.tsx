import { Volume2 } from "lucide-react";
import { useSpeech } from "../hooks/useSpeech";
import { cn } from "../lib/cn";

/** Text som läses upp när man klickar på den. conceptId ger förinspelat klipp. */
export function SpeakableText({
  text,
  conceptId,
  className,
}: {
  text: string;
  conceptId?: string;
  className?: string;
}) {
  const { speak } = useSpeech();
  return (
    <button
      type="button"
      onClick={() => speak(text, undefined, conceptId)}
      aria-label={`Lyssna: ${text}`}
      className={cn("inline-flex items-center gap-2 active:scale-95", className)}
    >
      <span>{text}</span>
      <Volume2 aria-hidden size={22} />
    </button>
  );
}
