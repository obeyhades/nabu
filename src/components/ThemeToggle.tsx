import { Moon, Sun } from "lucide-react";
import { useTheme } from "../stores/useTheme";

export function ThemeToggle() {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Byt till ljust läge" : "Byt till mörkt läge"}
      className="rounded-full bg-white p-3 shadow active:scale-95 dark:bg-zinc-800 dark:text-zinc-100"
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </button>
  );
}
