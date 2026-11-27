import { useId, useMemo, useRef, type KeyboardEvent } from "react";
import type { ItemId, NestItem } from "../../types";
import { cn } from "../../lib/cn";
import { balanceOf, isOwnedItem } from "../../lib/rewards";
import { DRAWER_TABS, NEST_ITEMS, giftCondition } from "../../data/nestItems";
import { useNest } from "../../stores/useNest";
import { useSettings } from "../../stores/useSettings";
import { ItemThumb, PriceTag } from "./NestBits";
import { isWear, shopLabel, slotName, slotOf, type DrawerTab } from "./nestUi";

/**
 * Lådan under scenen, med fyra flikar: "På Nabu", "Ljus & väggar",
 * "Möbler & saker" och "Vänner".
 * - Pynta: bara det barnet äger. Tryck på ett kort för att välja det (dess
 *   platser lyser i boet) – saker med en enda plats sätts på direkt.
 * - Stjärnboden: allt i katalogen. Det man äger visar "✓ Din", gåvor visas som
 *   silhuett med villkoret (aldrig ett pris) och resten med sitt fasta pris.
 * Inga "Nytt!"-märken, inget som blinkar eller lockar.
 */

const TAB_ICON: Record<DrawerTab, string> = { nabu: "🦉", ljus: "💡", saker: "🧸", vanner: "🐞" };

// Stjärnboden: startsakerna först, sedan prisstegen (billigast först), sist gåvorna
const VIA_ORDER: Record<NestItem["via"], number> = { start: 0, shop: 1, gift: 2 };
const SHOP_ORDER = [...NEST_ITEMS].sort((a, b) => VIA_ORDER[a.via] - VIA_ORDER[b.via] || a.price - b.price);

type Props = {
  variant: "pynta" | "bod";
  tab: DrawerTab;
  onTab: (tab: DrawerTab) => void;
  /** Pynta: vald sak. Stjärnboden: saken vars köpkort är öppet. */
  active: ItemId | null;
  onPick: (item: NestItem) => void;
  /** Pynta: släpp den valda saken. */
  onCancel?: () => void;
};

export function NestDrawer({ variant, tab, onTab, active, onPick, onCancel }: Props) {
  const uid = useId();
  const owned = useNest((s) => s.owned);
  const slots = useNest((s) => s.slots);
  const wish = useNest((s) => s.wish);
  const balance = useNest((s) => balanceOf(s));
  const shopOn = useSettings((s) => s.shopOn);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const items = useMemo(() => {
    const kinds = DRAWER_TABS.find((t) => t.id === tab)?.kinds ?? [];
    return (variant === "bod" ? SHOP_ORDER : NEST_ITEMS).filter(
      (i) => kinds.includes(i.kind) && (variant === "bod" || isOwnedItem({ owned }, i.id))
    );
  }, [variant, tab, owned]);
  const activeItem = active ? NEST_ITEMS.find((i) => i.id === active) : undefined;

  // Pil vänster/höger flyttar mellan flikarna (roving tabindex)
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = DRAWER_TABS.findIndex((t) => t.id === tab);
    const next = (i + (e.key === "ArrowRight" ? 1 : DRAWER_TABS.length - 1)) % DRAWER_TABS.length;
    onTab(DRAWER_TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section dir="ltr" aria-label={variant === "bod" ? "Stjärnboden" : "Pynta"} className="mt-3">
      <div
        role="tablist"
        aria-label="Sorter"
        onKeyDown={onTabKey}
        className="grid grid-cols-4 gap-1.5 rounded-3xl bg-white/70 p-1.5 shadow-sm dark:bg-zinc-800/70"
      >
        {DRAWER_TABS.map((t, i) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${t.id}`}
              aria-selected={on}
              aria-controls={`${uid}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => onTab(t.id)}
              className={cn(
                // Ikonen över texten i spalten bredvid scenen (side:) – även på en stor
                // surfplatta, så att "Möbler & saker" bryts mellan orden, aldrig mitt i
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-xs font-bold leading-tight outline-none transition-colors focus-visible:ring-4 focus-visible:ring-purple-400 sm:flex-row sm:gap-1.5 sm:text-sm side:flex-col side:gap-0.5",
                on ? "bg-purple-500 text-white shadow" : "text-zinc-600 dark:text-zinc-300"
              )}
            >
              <span aria-hidden className="text-lg leading-none">
                {TAB_ICON[t.id]}
              </span>
              <span className="text-center">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`} className="mt-3">
        {variant === "pynta" && activeItem && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-amber-100 px-3 py-2 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
            <span className="flex-1 text-sm font-bold">Tryck på en plats som lyser i boet.</span>
            <button
              type="button"
              onClick={onCancel}
              className="min-h-12 rounded-full bg-white px-4 text-sm font-bold text-amber-900 shadow outline-none focus-visible:ring-4 focus-visible:ring-purple-400 dark:bg-zinc-800 dark:text-amber-100"
            >
              Avbryt
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <p className="scroll-mb-[calc(var(--nav-space)+0.75rem)] rounded-3xl bg-white/70 px-4 py-6 text-center text-sm font-semibold text-zinc-500 dark:bg-zinc-800/70 dark:text-zinc-400">
            Inga saker här än.{" "}
            {shopOn
              ? "Saker från Stjärnboden och gåvor från boken hamnar här."
              : "Gåvor från klistermärkesboken hamnar här."}
          </p>
        ) : (
          // Telefon: en rad att bläddra i (scenen syns hela tiden). Större skärm och spalten
          // bredvid scenen (liggande): rutnät med så många kolumner som får plats.
          <ul
            className={cn(
              "-mx-3 flex snap-x scroll-px-3 gap-3 overflow-x-auto px-3 pb-3 pt-1 sm:mx-0 sm:grid sm:overflow-visible sm:px-0",
              variant === "bod"
                ? "sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]"
                : "sm:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))]"
            )}
          >
            {items.map((item) => (
              // scroll-mb: när lådan rullas fram (nytt läge) hamnar kortet ovanför menyn, inte under den
              <li key={item.id} className="shrink-0 snap-start scroll-mb-[calc(var(--nav-space)+0.75rem)]">
                {variant === "pynta" ? (
                  <PyntaCard item={item} where={slotOf(slots, item.id)} on={active === item.id} onPick={onPick} />
                ) : (
                  <ShopCard
                    item={item}
                    owned={isOwnedItem({ owned }, item.id)}
                    balance={balance}
                    wished={wish === item.id}
                    on={active === item.id}
                    onPick={onPick}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const CARD =
  "relative flex h-full w-full flex-col items-center gap-1 rounded-3xl bg-white p-2 shadow outline-none transition-transform focus-visible:ring-4 focus-visible:ring-purple-400 motion-safe:active:scale-95 dark:bg-zinc-800";

/** Ett kort i Pynta: saken, namnet och om den står framme eller ligger i förrådet. */
function PyntaCard({
  item,
  where,
  on,
  onPick,
}: {
  item: NestItem;
  where: ReturnType<typeof slotOf>;
  on: boolean;
  onPick: (item: NestItem) => void;
}) {
  const wearing = isWear(item) && !!where;
  const status = where ? (wearing ? "på Nabu" : `står på ${slotName(where)}`) : "i förrådet";
  return (
    <button
      type="button"
      data-item={item.id}
      aria-pressed={on}
      aria-label={`${item.name}, ${status}`}
      onClick={() => onPick(item)}
      className={cn(
        CARD,
        "min-h-28 w-[6.75rem] justify-between sm:w-full",
        on && "bg-amber-50 ring-4 ring-amber-400 dark:bg-amber-950/60"
      )}
    >
      <ItemThumb item={item} w={84} h={52} />
      <span lang="sv" className="word-fit line-clamp-2 text-center text-xs font-bold leading-tight md:text-sm">
        {item.name}
      </span>
      <span
        aria-hidden
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-bold md:text-sm",
          where
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300"
        )}
      >
        {where ? (wearing ? "✓ På Nabu" : "✓ Framme") : "I förrådet"}
      </span>
    </button>
  );
}

/** Ett kort i Stjärnboden: "✓ Din", gåvans villkor eller priset. */
function ShopCard({
  item,
  owned,
  balance,
  wished,
  on,
  onPick,
}: {
  item: NestItem;
  owned: boolean;
  balance: number;
  wished: boolean;
  on: boolean;
  onPick: (item: NestItem) => void;
}) {
  const giftLeft = item.via === "gift" && !owned;
  return (
    <button
      type="button"
      data-item={item.id}
      aria-pressed={on}
      aria-label={shopLabel(item, owned, balance, wished)}
      onClick={() => onPick(item)}
      className={cn(CARD, "min-h-36 w-[9.25rem] sm:w-full", on && "ring-4 ring-purple-400")}
    >
      {wished && !owned && (
        <span aria-hidden className="absolute right-2 top-1.5 text-base leading-none">
          💛
        </span>
      )}
      <ItemThumb item={item} w={96} h={56} ghost={giftLeft} />
      <span lang="sv" className="word-fit line-clamp-2 text-center text-xs font-bold leading-tight md:text-sm">
        {item.name}
      </span>
      <span aria-hidden className="mt-auto flex w-full justify-center">
        {owned ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 md:text-sm">
            ✓ Din
          </span>
        ) : giftLeft ? (
          <span className="text-center text-xs font-semibold leading-tight text-zinc-500 dark:text-zinc-400 md:text-sm">
            🎁 {giftCondition(item)}
          </span>
        ) : (
          <PriceTag price={item.price} balance={balance} />
        )}
      </span>
    </button>
  );
}
