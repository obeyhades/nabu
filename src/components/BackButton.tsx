import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/cn";

/**
 * Barnvänlig tillbaka-knapp: stor (48px), synlig bakgrund och rätt riktning i
 * RTL (pilen speglas). Ge `to` för länk eller `onClick` för ett steg bakåt.
 */
export function BackButton({
  to,
  onClick,
  className,
}: {
  to?: string;
  onClick?: () => void;
  className?: string;
}) {
  const cls = cn(
    "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-zinc-600 shadow transition active:scale-90 dark:bg-zinc-800 dark:text-zinc-200",
    className
  );
  const icon = <ArrowLeft size={26} className="rtl:rotate-180" aria-hidden />;
  if (to) {
    return (
      <Link to={to} aria-label="Tillbaka" className={cls}>
        {icon}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label="Tillbaka" className={cls}>
      {icon}
    </button>
  );
}
