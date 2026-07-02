import { cn } from "../lib/cn";

/**
 * Nabu-ugglan som levande maskot. `idle` guppar lugnt, `cheer` jublar.
 * En karaktär på många ställen bygger igenkänning.
 */
export function Mascot({
  mood = "idle",
  className,
}: {
  mood?: "idle" | "cheer" | "still";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block select-none",
        mood === "idle" && "animate-bob",
        mood === "cheer" && "animate-cheer",
        className
      )}
    >
      🦉
    </span>
  );
}
