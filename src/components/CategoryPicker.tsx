import { CATEGORIES } from "../data/concepts";
import { BackButton } from "./BackButton";
import type { Category } from "../types";
import { cn } from "../lib/cn";

/** Steg 1 i de flesta spel: välj kategori. Varje kategori har sin egen färgvärld. */
export function CategoryPicker({
  title,
  onPick,
  onBack,
}: {
  title: string;
  onPick: (category: Category) => void;
  onBack?: () => void; // om satt: gå tillbaka i spelet istället för till startsidan
}) {
  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="mb-6 flex items-center gap-3">
        {onBack ? <BackButton onClick={onBack} /> : <BackButton to="/dashboard" />}
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <p className="mb-4 text-zinc-600 dark:text-zinc-400">Välj vad du vill öva på:</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-3xl border-2 p-5 shadow-lg transition hover:-translate-y-1 active:scale-95",
              c.tint
            )}
          >
            <span className="text-4xl">{c.emoji}</span>
            <span className="text-sm font-bold">{c.name}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
