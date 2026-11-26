import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { NestItem } from "../../types";
import { cn } from "../../lib/cn";
import { wrapTab } from "../../lib/focusTrap";
import { balanceOf, isOwnedItem } from "../../lib/rewards";
import { giftCondition } from "../../data/nestItems";
import { useNest } from "../../stores/useNest";
import { ItemThumb, PouchAmount, PriceTag } from "./NestBits";
import { buyVerb, starsWord } from "./nestUi";

/**
 * Köpkortet i Stjärnboden (ett bottenark, inte en helskärm – scenen ovanför
 * visar förhandsvisningen hela tiden).
 * - Räcker stjärnorna: "Köp för 8 ⭐" och "Nej tack", lika stora.
 * - Räcker de inte: "Du har 5 i påsen. Den kostar 8." med "💛 Önska" och "Nej tack".
 * - Efter ett köp syns "↩️ Ångra" så länge arket är öppet; en köpt sak kan
 *   alltid "Lämna tillbaka" (100 % tillbaka). Inga röda minus – "kvar i påsen".
 * - Dubbeltryck: Ångra hamnar aldrig under fingret där "Köp" satt ("Klar" tar
 *   den platsen), och knapparna tar inte emot tryck en kort stund efter att
 *   arket öppnats eller läget bytts – ett andra tryck kan aldrig ångra köpet.
 * Stängs med ✕, Esc eller ett tryck utanför. Fokus stannar i arket (Tab går runt).
 */

/** Så länge knapparna ignorerar tryck efter att arket öppnats eller läget bytts. */
const SETTLE_MS = 500;

type Props = {
  item: NestItem;
  onClose: () => void;
  /** Köp och ställ fram. true = det gick. */
  onBuy: () => boolean;
  /** Ångra köpet nyss (sak tillbaka, stjärnor tillbaka, det som flyttades undan tillbaka). */
  onUndo: () => void;
  /** Lämna tillbaka en sak som köpts tidigare. */
  onReturn: () => void;
  onWish: () => void;
  /** Läs upp namnet och priset igen. */
  onSpeak: () => void;
};

type Fly = { n: number; dx: number; dy: number; x: number; y: number };

const BIG_BTN =
  "flex min-h-16 items-center justify-center gap-2 rounded-2xl px-3 text-lg font-bold shadow outline-none focus-visible:ring-4 focus-visible:ring-purple-400 motion-safe:active:scale-95 transition-transform";

export function ItemSheet({ item, onClose, onBuy, onUndo, onReturn, onWish, onSpeak }: Props) {
  const balance = useNest((s) => balanceOf(s));
  const owned = useNest((s) => isOwnedItem(s, item.id));
  const bought = useNest((s) => s.owned[item.id]?.via === "buy");
  const wished = useNest((s) => s.wish === item.id);
  const [justBought, setJustBought] = useState(false);
  const [fly, setFly] = useState<Fly | null>(null);

  const sheetRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const settleUntil = useRef(0); // performance.now() då knapparna tar emot tryck igen
  const pouchRef = useRef<HTMLSpanElement>(null);
  const artRef = useRef<HTMLSpanElement>(null);

  const shop = item.via === "shop";
  const enough = balance >= item.price;
  const showUndo = justBought && bought;

  // Fokus tillbaka dit man var när arket stängs. Ett andra tryck på kortet som
  // öppnade arket får inte trycka på arkets knappar.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    settleUntil.current = performance.now() + SETTLE_MS;
    return () => before?.focus?.({ preventScroll: true });
  }, []);
  // Fokus på arkets första knapp – även när läget byts (köpt → Klar)
  useEffect(() => {
    firstRef.current?.focus({ preventScroll: true });
  }, [showUndo, owned, enough]);
  // Esc stänger; Tab går runt inne i arket
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else wrapTab(e, sheetRef.current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Ett tryck som kommer för tätt efter förra lägesbytet räknas inte. */
  const settled = () => performance.now() >= settleUntil.current;
  const settle = () => {
    settleUntil.current = performance.now() + SETTLE_MS;
  };
  const guarded = (fn: () => void) => () => {
    if (settled()) fn();
  };

  const buy = () => {
    if (!settled()) return;
    // Var stjärnorna flyger från (påsen) och till (saken), mätt före köpet
    const sheet = sheetRef.current?.getBoundingClientRect();
    const from = pouchRef.current?.getBoundingClientRect();
    const to = artRef.current?.getBoundingClientRect();
    if (!onBuy()) return;
    settle();
    setJustBought(true);
    if (sheet && from && to) {
      const x = to.left + to.width / 2 - sheet.left;
      const y = to.top + to.height / 2 - sheet.top;
      setFly((f) => ({
        n: (f?.n ?? 0) + 1,
        x,
        y,
        dx: from.left + from.width / 2 - sheet.left - x,
        dy: from.top + from.height / 2 - sheet.top - y,
      }));
    }
  };

  const undo = () => {
    if (!settled()) return;
    onUndo();
    settle();
    setJustBought(false);
    setFly(null);
  };

  const giveBack = () => {
    if (!settled()) return;
    onReturn();
    settle();
  };

  // ── Rader och knappar för varje läge ──
  let line: ReactNode;
  let actions: ReactNode;
  const noThanks = (label = "Nej tack", first = false) => (
    <button
      type="button"
      ref={first ? firstRef : undefined}
      onClick={guarded(onClose)}
      className={cn(BIG_BTN, "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100")}
    >
      {label}
    </button>
  );

  if (showUndo) {
    line = (
      <p className="text-base font-bold">
        {item.kind === "friend" ? `🎉 ${item.name} flyttar in!` : "🎉 Nu är den din!"}{" "}
        <PouchAmount n={balance} kvar className="whitespace-nowrap font-semibold" />
      </p>
    );
    // "Klar" där "Köp" satt – Ångra ligger aldrig under fingret efter köpet
    actions = (
      <>
        {noThanks("Klar", true)}
        <button
          type="button"
          onClick={undo}
          className={cn(BIG_BTN, "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100")}
        >
          ↩️ Ångra
        </button>
      </>
    );
  } else if (owned) {
    line = (
      <p className="text-base font-semibold">
        <span className="font-black text-emerald-600 dark:text-emerald-400">✓ Din!</span>{" "}
        {bought ? <>Lämnar du tillbaka den får du {item.price} ⭐ i påsen igen.</> : <>Du hittar den i Pynta.</>}
      </p>
    );
    actions = bought ? (
      <>
        <button
          type="button"
          ref={firstRef}
          onClick={giveBack}
          className={cn(BIG_BTN, "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100")}
        >
          Lämna tillbaka
        </button>
        {noThanks("Stäng")}
      </>
    ) : (
      <div className="col-span-2">{noThanks("Stäng", true)}</div>
    );
  } else if (!shop) {
    // En gåva som inte flyttat in än: villkoret, aldrig ett pris
    line = <p className="text-base font-semibold">🎁 {giftCondition(item)}.</p>;
    actions = <div className="col-span-2">{noThanks("Okej", true)}</div>;
  } else if (enough) {
    line = (
      <p className="text-base font-semibold">
        <span className="sr-only">Den kostar {starsWord(item.price)}. </span>
        <span ref={pouchRef} className="inline-flex items-center whitespace-nowrap">
          Du har&nbsp;
          <PouchAmount n={balance} />
        </span>
      </p>
    );
    actions = (
      <>
        <button
          type="button"
          ref={firstRef}
          onClick={buy}
          className={cn(BIG_BTN, "bg-gradient-to-br from-amber-400 to-orange-500 text-white")}
        >
          {buyVerb(item)} för <span dir="ltr">{item.price} ⭐</span>
        </button>
        {noThanks()}
      </>
    );
  } else {
    line = (
      <p className="text-base font-semibold">
        <span ref={pouchRef} className="inline-flex items-center whitespace-nowrap">
          Du har&nbsp;
          <PouchAmount n={balance} />.
        </span>{" "}
        Den kostar <span dir="ltr">{item.price}</span>.
      </p>
    );
    actions = (
      <>
        <button
          type="button"
          ref={firstRef}
          aria-pressed={wished}
          onClick={guarded(() => {
            onWish();
            settle();
          })}
          className={cn(
            BIG_BTN,
            wished
              ? "bg-yellow-300 text-yellow-950 ring-2 ring-yellow-500"
              : "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100"
          )}
        >
          💛 {wished ? "Önskad" : "Önska"}
        </button>
        {noThanks()}
      </>
    );
  }

  return (
    <>
      {/* Tryck utanför stänger (svag ton – förhandsvisningen ska synas) */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-zinc-900/10"
      />
      <motion.div
        ref={sheetRef}
        dir="ltr"
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-xl rounded-t-3xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-10px_30px_-10px_rgb(0_0_0/0.35)] dark:bg-zinc-800"
      >
        <div className="flex items-start gap-3 pr-12">
          <span
            ref={artRef}
            className="grid h-24 w-28 shrink-0 place-items-center rounded-2xl bg-amber-50 dark:bg-zinc-900/60"
          >
            <ItemThumb item={item} w={104} h={80} ghost={!owned && !shop} />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black leading-tight">{item.name}</h2>
              <button
                type="button"
                onClick={onSpeak}
                aria-label={`Lyssna: ${item.name}`}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-purple-100 text-xl outline-none focus-visible:ring-4 focus-visible:ring-purple-400 dark:bg-purple-900/50"
              >
                🔊
              </button>
            </div>
            {shop && !owned && !showUndo && (
              <PriceTag price={item.price} balance={balance} big className="items-start" />
            )}
            {line}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Stäng"
          className="absolute right-3 top-3 grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-600 outline-none focus-visible:ring-4 focus-visible:ring-purple-400 dark:bg-zinc-700 dark:text-zinc-200"
        >
          <X size={24} aria-hidden />
        </button>

        <div className="mt-4 grid grid-cols-2 gap-3">{actions}</div>

        {/* Stjärnorna flyger från påsen till saken (bara en toning vid reducerad rörelse) */}
        {fly &&
          Array.from({ length: 5 }, (_, i) => (
            <motion.span
              key={`${fly.n}-${i}`}
              aria-hidden
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 text-2xl leading-none"
              style={{ left: fly.x + (i - 2) * 8, top: fly.y }}
              initial={{ x: fly.dx, y: fly.dy, opacity: 0, scale: 0.6 }}
              animate={{ x: 0, y: 0, opacity: [0, 1, 1, 0], scale: [0.6, 1.1, 1, 0.7] }}
              transition={{ duration: 0.7, delay: i * 0.07, ease: "easeOut" }}
            >
              ⭐
            </motion.span>
          ))}
      </motion.div>
    </>
  );
}
