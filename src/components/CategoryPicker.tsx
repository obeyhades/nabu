import { Link } from "react-router-dom";
import { CATEGORIES } from "../data/concepts";
import type { Category } from "../types";

/** Steg 1 i de flesta spel: välj kategori (Djur / Mat / Siffror). */
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
        {onBack ? (
          <button onClick={onBack} className="text-zinc-400" aria-label="Tillbaka">
            ←
          </button>
        ) : (
          <Link to="/dashboard" className="text-zinc-400" aria-label="Tillbaka">
            ←
          </Link>
        )}
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <p className="mb-4 text-zinc-600 dark:text-zinc-400">Välj vad du vill öva på:</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className="flex flex-col items-center gap-2 rounded-3xl bg-white p-5 shadow-lg transition hover:-translate-y-1 active:scale-95 dark:bg-zinc-800"
          >
            <span className="text-4xl">{c.emoji}</span>
            <span className="text-sm font-bold">{c.name}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
