import { GAMES } from "../data/gameRegistry";
import { GameCard } from "../components/GameCard";
import { MotivationCard } from "../components/MotivationCard";
import { BottomNav } from "../components/BottomNav";
import { useProfile } from "../stores/useProfile";

export default function Dashboard() {
  const name = useProfile((s) => s.name);
  const avatar = useProfile((s) => s.avatar);

  return (
    <main className="mx-auto max-w-3xl p-6 pb-24">
      <header className="flex items-center gap-3">
        <span className="text-4xl">{avatar}</span>
        <div>
          <h1 className="text-2xl font-bold">Hej {name || "Vän"}! 👋</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Vad vill du lära dig idag?</p>
        </div>
      </header>

      <div className="mt-6">
        <MotivationCard />
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {GAMES.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </section>

      <BottomNav />
    </main>
  );
}
