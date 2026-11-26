import type { NestItem } from "../../types";
import { cn } from "../../lib/cn";
import { ItemArt } from "../ItemArt";

/**
 * En sak från Nabus bo i en liten ruta (sidans gåva i hörnet, på lappen och i festen).
 * Emoji och hattar är kvadratiska; CSS-konst (girlanger, halsband) mäts i bredd,
 * så den får dubbla bredden för att synas lika stor. Alltid dekorativ.
 */
export function GiftArt({ item, size = 28, className }: { item: NestItem; size?: number; className?: string }) {
  const wide = "css" in item.art;
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center leading-none", className)}
      style={{ height: size, width: wide ? size * 2 : size, fontSize: wide ? size * 2 : size * 0.9 }}
    >
      <ItemArt art={item.art} />
    </span>
  );
}
