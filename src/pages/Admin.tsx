import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GAMES } from "../data/gameRegistry";
import { CATEGORIES } from "../data/concepts";
import { LEVELS } from "../data/levels";
import { LANGUAGES } from "../data/languages";
import { Button } from "../components/Button";
import { ThemeToggle } from "../components/ThemeToggle";
import { useSettings } from "../stores/useSettings";
import { useProfile } from "../stores/useProfile";
import { useStats, xpLevelInfo, currentStreak } from "../stores/useStats";
import { starKey, pathsFor } from "../lib/progress";
import { cn } from "../lib/cn";

const RATE_PRESETS = [
  { label: "Långsam", v: 0.8 },
  { label: "Normal", v: 1 },
  { label: "Snabb", v: 1.25 },
];
const GOAL_PRESETS = [10, 20, 30, 50];

// Alla stjärn-nycklar (för "lås upp allt")
function allStarKeys(): string[] {
  const keys: string[] = [];
  for (const g of GAMES) {
    const cats = pathsFor(
      g,
      CATEGORIES.map((c) => c.id),
      LANGUAGES.map((l) => l.code)
    );
    for (const cat of cats) for (const lvl of LEVELS) keys.push(starKey(g.id, cat, lvl.level));
  }
  return keys;
}

export default function Admin() {
  const navigate = useNavigate();

  const speechRate = useSettings((s) => s.speechRate);
  const setSpeechRate = useSettings((s) => s.setSpeechRate);
  const adminPin = useSettings((s) => s.adminPin);
  const setAdminPin = useSettings((s) => s.setAdminPin);
  const soundOn = useSettings((s) => s.soundOn);
  const toggleSound = useSettings((s) => s.toggleSound);

  const name = useProfile((s) => s.name);
  const stars = useProfile((s) => s.stars);
  const resetProgress = useProfile((s) => s.resetProgress);
  const unlockAll = useProfile((s) => s.unlockAll);
  const resetProfile = useProfile((s) => s.reset);

  const xp = useStats((s) => s.xp);
  const streak = useStats((s) => currentStreak(s.streak, s.lastPlayDate));
  const bestStreak = useStats((s) => s.bestStreak);
  const dailyGoal = useStats((s) => s.dailyGoal);
  const setDailyGoal = useStats((s) => s.setDailyGoal);
  const resetStats = useStats((s) => s.reset);

  const [entered, setEntered] = useState("");
  const [err, setErr] = useState(false);
  const [ok, setOk] = useState(false);
  const [confirm, setConfirm] = useState<null | "progress" | "everything">(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");

  const keys = allStarKeys();
  const earned = keys.reduce((sum, k) => sum + (stars[k] ?? 0), 0);
  const { level } = xpLevelInfo(xp);

  const say = (m: string) => setFlash(m);

  // ── PIN-spärr ──────────────────────────────────────────
  if (!ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-6xl">🔒</div>
        <div>
          <h1 className="text-2xl font-bold">Föräldrar</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Skriv PIN för att fortsätta</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (entered === adminPin) setOk(true);
            else {
              setErr(true);
              setEntered("");
            }
          }}
          className="flex w-full flex-col items-center gap-4"
        >
          <input
            autoFocus
            value={entered}
            onChange={(e) => {
              setEntered(e.target.value.replace(/\D/g, "").slice(0, 8));
              setErr(false);
            }}
            inputMode="numeric"
            placeholder="PIN"
            className={cn(
              "w-40 rounded-2xl border-2 bg-white px-5 py-3 text-center text-3xl font-bold tracking-widest outline-none dark:bg-zinc-800",
              err
                ? "border-red-400 text-red-500"
                : "border-purple-300 text-purple-600 focus:border-purple-500 dark:border-purple-800 dark:text-purple-300"
            )}
          />
          {err && <p className="text-sm text-red-500">Fel PIN, försök igen</p>}
          <Button type="submit" className="bg-purple-500 text-white">
            Lås upp
          </Button>
        </form>
        <Link to="/dashboard" className="text-sm text-zinc-400">
          ← Tillbaka
        </Link>
      </main>
    );
  }

  // ── Admin-panel ────────────────────────────────────────
  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="rounded-3xl bg-white p-5 shadow dark:bg-zinc-800">
      <h2 className="mb-3 font-semibold text-zinc-600 dark:text-zinc-300">{title}</h2>
      {children}
    </section>
  );

  const chip = (active: boolean) =>
    cn(
      "rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition active:scale-95",
      active
        ? "border-purple-500 bg-purple-500 text-white"
        : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
    );

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6 pb-16">
      <div className="mb-2 flex items-center gap-3">
        <Link to="/dashboard" className="text-zinc-400" aria-label="Tillbaka">
          ←
        </Link>
        <h1 className="text-2xl font-bold">Föräldrar &amp; admin</h1>
      </div>

      {flash && (
        <div className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
          {flash}
        </div>
      )}

      {/* Framsteg */}
      <Card title={`Framsteg${name ? ` – ${name}` : ""}`}>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Nivå" value={`🎓 ${level}`} />
          <Stat label="XP" value={`⭐ ${xp}`} />
          <Stat label="Streak" value={`🔥 ${streak}`} />
          <Stat label="Bästa streak" value={`🏆 ${bestStreak}`} />
          <Stat label="Stjärnor" value={`${earned} / ${keys.length * 3}`} />
        </div>
        <Link
          to="/collection"
          className="mt-3 inline-block text-sm font-semibold text-purple-600 dark:text-purple-300"
        >
          Se detaljerad samling →
        </Link>
      </Card>

      {/* Inställningar */}
      <Card title="Inställningar">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Röst-hastighet
            </p>
            <div className="flex flex-wrap gap-2">
              {RATE_PRESETS.map((r) => (
                <button
                  key={r.v}
                  onClick={() => setSpeechRate(r.v)}
                  className={chip(Math.abs(speechRate - r.v) < 0.01)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Dagligt XP-mål
            </p>
            <div className="flex flex-wrap gap-2">
              {GOAL_PRESETS.map((g) => (
                <button key={g} onClick={() => setDailyGoal(g)} className={chip(dailyGoal === g)}>
                  {g} XP
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Ljud</span>
            <button onClick={toggleSound} className={chip(soundOn)}>
              {soundOn ? "På" : "Av"}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Tema</span>
            <ThemeToggle />
          </div>
        </div>
      </Card>

      {/* PIN */}
      <Card title="Byt PIN">
        <div className="flex items-center gap-3">
          <input
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            placeholder="Ny PIN"
            className="w-32 rounded-xl border-2 border-zinc-200 bg-white px-4 py-2 text-center font-bold tracking-widest outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <Button
            onClick={() => {
              if (newPin.length >= 4) {
                setAdminPin(newPin);
                setNewPin("");
                say("PIN uppdaterad ✓");
              } else {
                say("PIN måste vara minst 4 siffror");
              }
            }}
            className="bg-purple-500 text-white"
          >
            Spara
          </Button>
        </div>
      </Card>

      {/* Verktyg */}
      <Card title="Verktyg">
        <div className="space-y-3">
          <button
            onClick={() => {
              unlockAll(keys);
              say("Alla nivåer upplåsta ✓");
            }}
            className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-left dark:bg-zinc-700"
          >
            <span className="font-semibold">🗝️ Lås upp alla nivåer</span>
            <span className="mt-0.5 block text-xs text-zinc-400">För att testa allt innehåll</span>
          </button>

          {confirm === "progress" ? (
            <div className="space-y-3 rounded-2xl bg-red-50 p-4 dark:bg-red-950/40">
              <p className="text-sm font-medium">
                Börja om från början? Stjärnor, XP och streak nollställs.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    resetProgress();
                    resetStats();
                    setConfirm(null);
                    say("Börjat om! 🌱");
                  }}
                  className="flex-1 whitespace-nowrap bg-red-500 text-sm text-white"
                >
                  Ja, börja om
                </Button>
                <Button
                  onClick={() => setConfirm(null)}
                  className="flex-1 whitespace-nowrap bg-white text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  Avbryt
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirm("progress")}
              className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-left dark:bg-zinc-700"
            >
              <span className="font-semibold text-red-600 dark:text-red-400">🔄 Börja om</span>
              <span className="mt-0.5 block text-xs text-zinc-400">
                Nollställ stjärnor, XP och streak
              </span>
            </button>
          )}

          {confirm === "everything" ? (
            <div className="space-y-3 rounded-2xl bg-red-50 p-4 dark:bg-red-950/40">
              <p className="text-sm font-medium">
                Rensa allt – även namn och avatar? Appen börjar om från start.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    resetProfile();
                    resetStats();
                    navigate("/");
                  }}
                  className="flex-1 whitespace-nowrap bg-red-600 text-sm text-white"
                >
                  Ja, rensa
                </Button>
                <Button
                  onClick={() => setConfirm(null)}
                  className="flex-1 whitespace-nowrap bg-white text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  Avbryt
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirm("everything")}
              className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-left dark:bg-zinc-700"
            >
              <span className="font-semibold text-red-700 dark:text-red-400">🧹 Rensa allt</span>
              <span className="mt-0.5 block text-xs text-zinc-400">
                Även namn och avatar – appen börjar om helt
              </span>
            </button>
          )}
        </div>
      </Card>

      <p className="px-1 text-xs text-zinc-400">
        PIN-spärren är en barnspärr – inte riktig säkerhet. Allt sparas lokalt på enheten.
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-100 p-3 text-center dark:bg-zinc-900">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
    </div>
  );
}
