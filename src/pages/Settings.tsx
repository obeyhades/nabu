import { useState } from "react";
import { Link } from "react-router-dom";
import { Volume2, VolumeX } from "lucide-react";
import { BackButton } from "../components/BackButton";
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
    // Surfplatta: bredare (md:), och på en liggande surfplatta (lg:) två spalter – ingen smal mobilkolumn
    <main className="mx-auto max-w-xl p-6 pb-nav md:max-w-2xl md:text-lg lg:max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <BackButton to="/dashboard" />
        <h1 className="text-2xl font-bold md:text-3xl">Inställningar</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* Profil */}
        <section className="rounded-3xl bg-white p-5 shadow dark:bg-zinc-800 lg:row-span-2">
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
          {/* Minst 44 px per avatar även på smala mobiler */}
          <div className="mt-4 grid grid-cols-4 gap-2 min-[400px]:grid-cols-6">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setProfile(draftName.trim() || "Vän", a)}
                aria-label={`Välj ${a}`}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-2xl text-3xl transition active:scale-90 md:text-4xl",
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
        <section className="rounded-3xl bg-white p-5 shadow dark:bg-zinc-800">
          <h2 className="mb-3 font-semibold text-zinc-600 dark:text-zinc-300">Språk</h2>
          <LanguagePicker />
          {/* Förhandsvisning: byter direkt när man väljer språk. Lyssna-knappen är själv
              minst 44 px hög (min-h-11) – lappen blir lika stor som förut (py-0.5) */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-0.5 dark:bg-zinc-700">
            <span className="text-2xl">{SAMPLE.emoji}</span>
            <SpeakableText
              text={sampleLabel}
              conceptId={SAMPLE.id}
              className="min-h-11 font-semibold text-purple-600 dark:text-purple-300"
            />
          </div>
        </section>

        {/* Ljud och tema (en spalt på liggande surfplatta, bredvid profilen) */}
        <div className="grid gap-4">
          <section className="flex items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow dark:bg-zinc-800">
            <div>
              <h2 className="font-semibold text-zinc-700 dark:text-zinc-200">Ljud</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 md:text-base">Läs upp orden automatiskt</p>
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
          <section className="flex items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow dark:bg-zinc-800">
            <div>
              <h2 className="font-semibold text-zinc-700 dark:text-zinc-200">Tema</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 md:text-base">Ljust eller mörkt läge</p>
            </div>
            <ThemeToggle />
          </section>
        </div>
      </div>

      {/* Tips till föräldrar: en hemskärms-app rensas mer sällan av webbläsaren */}
      <p className="mt-4 flex items-start gap-3 rounded-3xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100 md:text-base">
        <span aria-hidden className="text-xl leading-none">
          📲
        </span>
        <span>
          <span className="font-semibold">Tips till föräldrar: </span>
          Lägg Nabu på hemskärmen – då sparas boken och boet säkrare på den här enheten.
        </span>
      </p>

      <Link
        to="/admin"
        className="mt-4 flex min-h-11 items-center justify-center text-center text-sm text-zinc-400 hover:text-zinc-500 md:text-base"
      >
        🔒 Föräldrar &amp; admin
      </Link>

      <BottomNav />
    </main>
  );
}
