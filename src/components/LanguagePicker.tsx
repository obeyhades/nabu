import { LANGUAGES } from "../data/languages";
import { useSettings } from "../stores/useSettings";
import { cn } from "../lib/cn";

export function LanguagePicker() {
  const lang = useSettings((s) => s.lang);
  const setLang = useSettings((s) => s.setLang);

  return (
    <div className="flex flex-wrap gap-2">
      {LANGUAGES.filter((l) => l.available).map((l) => {
        const active = lang === l.code;
        return (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={cn(
              "flex items-center gap-2 rounded-full border-2 px-4 py-2 font-semibold transition active:scale-95",
              active
                ? "border-purple-500 bg-purple-500 text-white"
                : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            )}
          >
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-xs font-bold",
                active ? "bg-white/20" : "bg-zinc-100 dark:bg-zinc-700"
              )}
            >
              {l.code.toUpperCase()}
            </span>
            {l.name}
          </button>
        );
      })}
    </div>
  );
}
