import { Link } from "react-router-dom";
import type { GameDefinition } from "../types";
import { cn } from "../lib/cn";

export function GameCard({ game }: { game: GameDefinition }) {
  return (
    <Link
      to={game.path}
      className={cn(
        "group flex flex-col gap-2 rounded-3xl bg-gradient-to-br p-6 text-white shadow-xl transition-transform hover:-translate-y-1 active:scale-95",
        game.gradient
      )}
    >
      <div className="text-5xl transition-transform group-hover:scale-110">{game.emoji}</div>
      <h3 className="text-2xl font-bold">{game.name}</h3>
      <p className="opacity-90">{game.description}</p>
    </Link>
  );
}
