import { Link, useLocation } from "react-router-dom";
import { Home, Trophy, Settings } from "lucide-react";
import { cn } from "../lib/cn";

const ITEMS = [
  { to: "/dashboard", label: "Hem", Icon: Home },
  { to: "/collection", label: "Samling", Icon: Trophy },
  { to: "/settings", label: "Inställningar", Icon: Settings },
];

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center gap-2 border-t border-zinc-200 bg-white/90 p-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
      {ITEMS.map(({ to, label, Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-2xl px-4 py-1.5 text-sm font-medium transition",
              active ? "bg-purple-500 text-white" : "text-zinc-500 dark:text-zinc-400"
            )}
          >
            <Icon size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
