import type { ItemArt as ItemArtDef, NestItem } from "../../types";
import { cn } from "../../lib/cn";
import { useNest } from "../../stores/useNest";
import { ItemArt } from "../ItemArt";
import { StarPouch } from "../StarPouch";

/**
 * Små byggstenar för Nabus bo: en sak i ett kort (ItemThumb), ett pris
 * (PriceTag) och påsen med ett antal (PouchAmount).
 */

/** Konstens bredd:höjd (1em = bredd i ItemArt). Emoji och hattar är kvadratiska. */
function aspectOf(art: ItemArtDef): number {
  if (!("css" in art)) return 1;
  switch (art.css) {
    case "moss":
    case "stripes":
    case "rainbowRug":
      return 170 / 24;
    case "sky":
    case "sunset":
    case "aurora":
      return 110 / 80;
    case "stringLights":
    case "bunting":
    case "numberBunting":
    case "letterBunting":
      return 280 / 52;
    case "beads":
      return 2;
    default:
      return 1;
  }
}

/**
 * En sak ritad så att den ryms i en ruta på `w` × `h` px (breda mattor och
 * girlanger fyller bredden, emoji fyller höjden). `ghost` = silhuett, för en
 * gåva som inte flyttat in än. Lilla plantan visas i sitt nuvarande växtsteg.
 */
export function ItemThumb({
  item,
  w = 88,
  h = 56,
  ghost = false,
  className,
}: {
  item: NestItem;
  w?: number;
  h?: number;
  ghost?: boolean;
  className?: string;
}) {
  const stage = useNest((s) => (item.trick === "grow" ? (s.grow[item.id] ?? 0) : undefined));
  const a = aspectOf(item.art);
  const width = Math.min(w, h * a) * (a > 1.5 ? 0.96 : 0.9);
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center", className)} style={{ width: w, height: h }}>
      <span
        className={cn(
          "block leading-none",
          ghost && "[filter:brightness(0)_opacity(0.26)] dark:[filter:brightness(0)_invert(1)_opacity(0.3)]"
        )}
        style={{ fontSize: width }}
      >
        <ItemArt art={item.art} grow={stage} />
      </span>
    </span>
  );
}

/** Påsen med ett antal: "[påse] 12 i påsen" (eller "kvar i påsen"). */
export function PouchAmount({ n, kvar = false, className }: { n: number; kvar?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <StarPouch className="text-[1.35em]" />
      <span>
        <span dir="ltr" className="font-black">
          {n}
        </span>{" "}
        {kvar ? "kvar i påsen" : "i påsen"}
      </span>
    </span>
  );
}

/**
 * Priset för förskolebarn: upp till 10 ritas som en rad stjärnor (räkna dem!),
 * över 10 som "⭐ 25" plus en påse med fyllnadsstapel. Räcker stjärnorna visas
 * ett lugnt, stilla "✓ Räcker". Dekorativt – kortet runt om bär etiketten.
 */
export function PriceTag({
  price,
  balance,
  big = false,
  className,
}: {
  price: number;
  balance: number;
  big?: boolean;
  className?: string;
}) {
  const enough = balance >= price;
  return (
    <span aria-hidden className={cn("flex flex-col items-center gap-1", className)}>
      {price <= 10 ? (
        <span
          className={cn(
            "flex flex-wrap gap-px leading-none",
            big ? "max-w-[12rem] text-xl" : "max-w-[7.5rem] justify-center text-[13px]"
          )}
        >
          {Array.from({ length: price }, (_, i) => (
            <span key={i}>⭐</span>
          ))}
        </span>
      ) : (
        <span className={cn("flex items-center gap-2 font-black", big ? "text-xl" : "text-sm")}>
          <span className="whitespace-nowrap">
            ⭐ <span dir="ltr">{price}</span>
          </span>
          <span className="flex items-center gap-1">
            <StarPouch className={big ? "text-xl" : "text-base"} />
            <span
              className={cn(
                "block overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700",
                big ? "h-3 w-20" : "h-2 w-12"
              )}
            >
              <span
                className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500"
                style={{ width: `${Math.min(100, Math.round((balance / price) * 100))}%` }}
              />
            </span>
          </span>
        </span>
      )}
      {enough && (
        <span
          className={cn(
            "rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
            big ? "text-sm" : "text-xs md:text-sm"
          )}
        >
          ✓ Räcker
        </span>
      )}
    </span>
  );
}
