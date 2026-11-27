import { Link } from "react-router-dom";
import type { GameDefinition } from "../types";
import { cn } from "../lib/cn";

export function GameCard({ game }: { game: GameDefinition }) {
  return (
    <Link
      to={game.path}
      className={cn(
        // Liggande mobil (short:): lägre kort i tre kolumner – mindre luft, ikon och text
        "group relative flex min-w-0 flex-col gap-2 rounded-3xl bg-gradient-to-br p-4 text-white shadow-xl transition-transform hover:-translate-y-1 active:scale-95 sm:p-6 short:gap-1 short:p-3",
        game.gradient
      )}
    >
      {game.isNew && (
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-black text-pink-600 shadow">
          Ny!
        </span>
      )}
      <div className="text-5xl transition-transform group-hover:scale-110 short:text-4xl">{game.emoji}</div>
      {/* Ett ord som "Ballongpop" ska rymmas i kortet även på 320 px (mindre text, avstavning som reserv) */}
      <h3 className="word-fit text-lg font-bold leading-tight min-[360px]:text-xl sm:text-2xl short:text-lg">
        {game.name}
      </h3>
      {/* Beskrivningen bryts mellan orden, aldrig mitt i ("bok-stav") – orden ryms alltid på en rad */}
      <p className="min-w-0 break-words opacity-90 md:text-lg short:text-sm short:leading-snug">{game.description}</p>
    </Link>
  );
}
