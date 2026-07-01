import { useState } from "react";
import { Link } from "react-router-dom";
import { Volume2, VolumeX } from "lucide-react";
import { LanguagePicker } from "../components/LanguagePicker";
import { SpeakableText } from "../components/SpeakableText";
import { ThemeToggle } from "../components/ThemeToggle";
import { BottomNav } from "../components/BottomNav";
import { CONCEPTS } from "../data/concepts";
import { AVATARS } from "../data/avatars";
import { useSettings } from "../stores/useSettings";
import { useProfile } from "../stores/useProfile";
import { cn } from "../lib/cn";

const SAMPLE = CONCEPTS[0]; // 🐱 – exempelord för språk-förhandsvisning

export default function Settings() {
  const lang = useSettings((s) => s.lang);
  const soundOn = useSettings((s) => s.soundOn);
  const toggleSound = useSettings((s) => s.toggleSound);
  const name = useProfile((s) => s.name);
  const avatar = useProfile((s) => s.avatar);
  const setProfile = useProfile((s) => s.setProfile);
  const [draftName, setDraftName] = useState(name);
  const sampleLabel = SAMPLE.labels[lang] ?? SAMPLE.labels.sv ?? "";

  // Uppdaterar direkt (fallback till "Vän" så profilen aldrig blir tom)
  const changeName = (v: string) => {
    setDraftName(v);
    setProfile(v.trim() || "Vän", avatar);
  };

  return (
    <main className="mx-auto max-w-xl p-6 pb-24">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/dashboard" className="text-zinc-400" aria-label="Tillbaka">
          ←
        </Link>
        <h1 className="text-2xl font-bold">Inställningar</h1>
      </div>

      {/* Profil */}
      <section className="rounded-3xl bg-white p-5 shadow dark:bg-zinc-800">
        <h2 className="mb-3 font-semibold text-zinc-600 dark:text-zinc-300">Profil</h2>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{avatar}</span>
          <input
            value={draftName}
            onChange={(e) => changeName(e.target.value)}
            placeholder="Vad heter du?"
            maxLength={20}
            className="w-full rounded-full border-2 border-purple-200 bg-white px-5 py-2.5 text-lg outline-none focus:border-purple-500 dark:border-purple-900 dark:bg-zinc-900 dark:text-white"
          />
        </div>
        <div className="mt-4 grid grid-cols-6 gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setProfile(draftName.trim() || "Vän", a)}
              aria-label={`Välj ${a}`}
              className={cn(
                "rounded-2xl p-2 text-3xl transition active:scale-90",
                avatar === a
                  ? "bg-purple-200 ring-2 ring-purple-500 dark:bg-purple-900"
                  : "bg-zinc-100 dark:bg-zinc-700"
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </section>

      {/* Språk */}
      <section className="mt-4 rounded-3xl bg-white p-5 shadow dark:bg-zinc-800">
        <h2 className="mb-3 font-semibold text-zinc-600 dark:text-zinc-300">Språk</h2>
        <LanguagePicker />
        {/* Förhandsvisning: byter direkt när man väljer språk */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 dark:bg-zinc-700">
          <span className="text-2xl">{SAMPLE.emoji}</span>
          <SpeakableText
            text={sampleLabel}
            conceptId={SAMPLE.id}
            className="font-semibold text-purple-600 dark:text-purple-300"
          />
        </div>
      </section>

      {/* Ljud */}
      <section className="mt-4 flex items-center justify-between rounded-3xl bg-white p-5 shadow dark:bg-zinc-800">
        <div>
          <h2 className="font-semibold text-zinc-700 dark:text-zinc-200">Ljud</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Läs upp orden automatiskt</p>
        </div>
        <button
          onClick={toggleSound}
          aria-label={soundOn ? "Stäng av ljud" : "Sätt på ljud"}
          className="rounded-full bg-zinc-100 p-3 active:scale-95 dark:bg-zinc-700 dark:text-zinc-100"
        >
          {soundOn ? <Volume2 /> : <VolumeX className="text-zinc-400" />}
        </button>
      </section>

      {/* Tema */}
      <section className="mt-4 flex items-center justify-between rounded-3xl bg-white p-5 shadow dark:bg-zinc-800">
        <div>
          <h2 className="font-semibold text-zinc-700 dark:text-zinc-200">Tema</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Ljust eller mörkt läge</p>
        </div>
        <ThemeToggle />
      </section>

      <Link
        to="/admin"
        className="mt-4 block text-center text-sm text-zinc-400 hover:text-zinc-500"
      >
        🔒 Föräldrar &amp; admin
      </Link>

      <BottomNav />
    </main>
  );
}
