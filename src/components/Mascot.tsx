import type { ItemId, NestItem, WearSlot } from "../types";
import { cn } from "../lib/cn";
import { wornItem } from "../lib/rewards";
import { ITEM_BY_ID } from "../data/nestItems";
import { useNest } from "../stores/useNest";
import { OwlWear } from "./OwlWear";

/**
 * Nabu-ugglan som levande maskot. `idle` guppar lugnt, `cheer` jublar.
 * En karaktär på många ställen bygger igenkänning.
 *
 * Nabu bär det barnet klätt på hen i boet (hatt och hals). `plain` = ingen
 * hatt alls (t.ex. välkomstsidan, eller i spelen när föräldern stängt av
 * "Visa Nabus hatt i spelen" – Coach och vinstskärmen skickar då `plain`).
 * `wear` är en förhandsvisning som går före boet (null = inget på den platsen),
 * och `only` begränsar vilka platser som visas (Coach visar bara hatten).
 */
export function Mascot({
  mood = "idle",
  className,
  plain = false,
  wear,
  only,
}: {
  mood?: "idle" | "cheer" | "still";
  className?: string;
  plain?: boolean;
  wear?: Partial<Record<WearSlot, ItemId | null>>;
  only?: WearSlot[];
}) {
  const wornHat = useNest((s) => wornItem(s, "hat"));
  const wornNeck = useNest((s) => wornItem(s, "neck"));

  const pick = (slot: WearSlot, worn: NestItem | null): NestItem | null => {
    if (plain || (only && !only.includes(slot))) return null;
    if (wear && slot in wear) {
      const id = wear[slot];
      const item = id ? ITEM_BY_ID.get(id) : undefined;
      return item && item.kind === slot ? item : null; // förhandsvisning: behöver inte ägas
    }
    return worn;
  };
  const hat = pick("hat", wornHat);
  const neck = pick("neck", wornNeck);

  return (
    <span
      aria-hidden
      className={cn(
        "inline-block select-none",
        mood === "idle" && "animate-bob",
        mood === "cheer" && "animate-cheer",
        className
      )}
    >
      <span dir="ltr" className="relative inline-block leading-none">
        🦉
        {neck && <OwlWear item={neck} slot="neck" />}
        {hat && <OwlWear item={hat} slot="hat" />}
      </span>
    </span>
  );
}
