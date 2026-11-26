import type { NestItem, WearSlot } from "../types";
import { cn } from "../lib/cn";
import { DEFAULT_WEAR } from "../data/nestItems";
import { ItemArt } from "./ItemArt";

/**
 * Ett lager på ugglan: hatten eller det som sitter runt halsen.
 * Måtten (`wear`) är i em av ugglan: lagret flyttas (dx, dy) från ugglans
 * överkant, och saken ritas i `size` em, lutad `rot` grader. Läggs efter 🦉
 * i Mascot, så det ritas ovanpå. Trimma måtten med DEV-hattrutnätet i Admin.
 */
export function OwlWear({ item, slot }: { item: NestItem; slot: WearSlot }) {
  const fit = item.wear ?? DEFAULT_WEAR[slot];
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none absolute inset-x-0 top-0 flex justify-center", slot === "neck" ? "z-[1]" : "z-[2]")}
      style={{ transform: `translate(${fit.dx ?? 0}em, ${fit.dy}em)` }}
    >
      <span className="block leading-none" style={{ fontSize: `${fit.size}em`, transform: `rotate(${fit.rot ?? 0}deg)` }}>
        <ItemArt art={item.art} />
      </span>
    </span>
  );
}
