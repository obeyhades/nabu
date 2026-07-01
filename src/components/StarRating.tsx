import { Star } from "lucide-react";
import { cn } from "../lib/cn";

export function StarRating({ value, size = 28 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-1" aria-label={`${value} av 3 stjärnor`}>
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          size={size}
          className={cn(
            i <= value ? "fill-yellow-400 text-yellow-400" : "text-zinc-300 dark:text-zinc-600"
          )}
        />
      ))}
    </div>
  );
}
