import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../stores/useProfile";
import { AVATARS } from "../data/avatars";
import { Button } from "../components/Button";
import { Mascot } from "../components/Mascot";
import { cn } from "../lib/cn";

export default function Welcome() {
  const navigate = useNavigate();
  const setProfile = useProfile((s) => s.setProfile);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);

  const start = () => {
    setProfile(name.trim() || "Vän", avatar);
    navigate("/dashboard");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      {/* Välkomstsidan visar Nabu utan hatt (varumärket) */}
      <Mascot mood="idle" plain className="text-7xl" />
      <div>
        <h1 className="text-5xl font-black text-purple-600 dark:text-purple-400">Nabu</h1>
        <p className="mt-1 text-lg text-zinc-600 dark:text-zinc-400">Lär dig ord på flera språk!</p>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Vad heter du?"
        maxLength={20}
        className="w-full max-w-xs rounded-full border-2 border-purple-200 bg-white px-6 py-3 text-center text-lg outline-none focus:border-purple-500 dark:border-purple-900 dark:bg-zinc-800 dark:text-white"
      />

      <div className="grid w-full max-w-xs grid-cols-6 gap-2">
        {AVATARS.map((a) => (
          <button
            key={a}
            onClick={() => setAvatar(a)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-2xl text-3xl transition active:scale-90",
              avatar === a
                ? "bg-purple-200 ring-2 ring-purple-500 dark:bg-purple-900"
                : "bg-white dark:bg-zinc-800"
            )}
          >
            {a}
          </button>
        ))}
      </div>

      <Button onClick={start} className="bg-purple-500 text-white">
        Kom igång →
      </Button>
    </main>
  );
}
