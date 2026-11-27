import { Link, useLocation } from "react-router-dom";
import { Bird, BookOpen, Home, Settings } from "lucide-react";
import { cn } from "../lib/cn";
import { trayIds } from "../lib/rewards";
import { useStickers } from "../stores/useStickers";

const ITEMS = [
  { to: "/dashboard", label: "Hem", Icon: Home },
  { to: "/stickers", label: "Boken", Icon: BookOpen, also: "/collection" }, // stigarna hör till boken
  { to: "/nest", label: "Boet", Icon: Bird },
  { to: "/settings", label: "Inställningar", Icon: Settings },
];

const under = (pathname: string, to: string) => pathname === to || pathname.startsWith(to + "/");

/**
 * Menyn längst ner: Hem, Boken, Boet och Inställningar.
 * Boken visar hur många klistermärken som väntar i kuvertet – en lugn, stilla
 * siffra (aldrig animerad, inget "Nytt!"). Boet får inget märke alls.
 * Höjden är var(--nav-h) (68 px; 52 px på en liggande mobil) plus hemindikatorn
 * (--safe-b): kuvertet i boken ligger precis ovanför (bottom: var(--nav-space)).
 * I boken och boet är menyn helt ogenomskinlig (ingen backdrop-blur över scenerna).
 */
export function BottomNav() {
  const { pathname } = useLocation();
  const tray = useStickers((s) => trayIds(s.owned).length);
  const solid = under(pathname, "/stickers") || under(pathname, "/nest");

  return (
    <nav
      dir="ltr"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex h-[var(--nav-space)] items-center justify-center gap-1 border-t border-zinc-200 pb-[var(--safe-b)] pl-[max(0.5rem,var(--safe-l))] pr-[max(0.5rem,var(--safe-r))] dark:border-zinc-800",
        solid ? "bg-white dark:bg-zinc-900" : "bg-white/90 backdrop-blur dark:bg-zinc-900/90"
      )}
    >
      {ITEMS.map(({ to, label, Icon, also }) => {
        const active = under(pathname, to) || (!!also && under(pathname, also));
        const badge = to === "/stickers" && tray > 0 ? tray : 0;
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            aria-label={
              badge ? `${label}, ${badge} ${badge === 1 ? "klistermärke" : "klistermärken"} att klistra in` : undefined
            }
            className={cn(
              "flex min-h-14 max-w-[110px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-xs font-medium outline-none transition focus-visible:ring-4 focus-visible:ring-purple-400 md:max-w-[140px] md:text-sm short:min-h-11 short:max-w-[150px] short:flex-row short:gap-1.5",
              active ? "bg-purple-500 text-white" : "text-zinc-500 dark:text-zinc-400"
            )}
          >
            <span className="relative">
              <Icon size={24} aria-hidden />
              {badge > 0 && (
                <span
                  aria-hidden
                  // liggande mobil: texten står bredvid ikonen – märket flyttar till vänster sida
                  className="absolute -right-3 -top-1.5 h-5 min-w-5 rounded-full bg-rose-500 px-1 text-center text-[11px] font-bold leading-5 text-white ring-2 ring-white dark:ring-zinc-900 short:-left-4 short:right-auto"
                >
                  <span dir="ltr">{badge > 99 ? "99+" : badge}</span>
                </span>
              )}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
