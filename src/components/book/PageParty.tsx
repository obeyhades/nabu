import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { NestItem } from "../../types";
import { wrapTab } from "../../lib/focusTrap";
import { giftLine } from "../../lib/stickerBook";
import type { BookPage } from "../../data/stickers";
import { Mascot } from "../Mascot";
import { GiftArt } from "./GiftArt";

/**
 * Festen när sista platsen på en sida fylls (en gång per sida – spärren
 * `donePages` i boken). Nabu jublar med sin hatt, sidans beröm (processen,
 * aldrig förmågan) och sedan gåvokortet: "Pip flyttar in i Nabus bo!" med en
 * länk till boet. Konfettin och vågen startar sidan; det här är bara banderollen.
 * Stängs med "Fortsätt", Esc eller ett tryck utanför. Fokus stannar i rutan (Tab går runt).
 */
export function PageParty({ page, gift, onClose }: { page: BookPage; gift: NestItem | undefined; onClose: () => void }) {
  const primary = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
        return;
      }
      wrapTab(e, dialog.current);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, []);

  const headingId = `fest-${page.id}`;

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        dir="ltr"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.8, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white px-6 pb-6 pt-5 text-center shadow-2xl dark:bg-zinc-900"
      >
        {/* solstrålar bakom Nabu (stilla vid reducerad rörelse) */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-2 h-40 w-40 -translate-x-1/2 rounded-full opacity-30 motion-safe:animate-[spin_24s_linear_infinite]"
          style={{ background: "repeating-conic-gradient(rgba(251,191,36,0.8) 0deg 12deg, transparent 12deg 24deg)" }}
        />
        <div className="relative flex h-32 items-center justify-center">
          <Mascot mood="cheer" className="text-5xl" />
          <span aria-hidden className="absolute right-[22%] top-3 text-3xl">
            {page.emoji}
          </span>
        </div>
        <p className="relative text-sm font-bold uppercase tracking-wide text-purple-600 dark:text-purple-300">
          Sidan {page.title} är klar!
        </p>
        <h2 id={headingId} className="relative mt-1 text-2xl font-black leading-tight">
          {page.praise}
        </h2>

        {gift && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.9, type: "spring", stiffness: 260, damping: 18 }}
            className="relative mt-5 flex items-center gap-3 rounded-2xl bg-amber-50 p-3 text-left ring-1 ring-amber-200 dark:bg-amber-400/10 dark:ring-amber-300/30"
          >
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white shadow-sm dark:bg-zinc-800">
              <GiftArt item={gift} size={40} />
            </span>
            <p className="min-w-0 flex-1 font-bold leading-snug">
              <span aria-hidden>🎁 </span>
              {giftLine(gift)}
            </p>
          </motion.div>
        )}

        <div className="relative mt-5 flex flex-col gap-3">
          {gift && (
            <Link
              to="/nest"
              className="flex min-h-14 items-center justify-center rounded-full bg-emerald-500 px-6 text-lg font-bold text-white shadow outline-none motion-safe:transition motion-safe:active:scale-95 focus-visible:ring-4 focus-visible:ring-purple-400"
            >
              Titta i boet
            </Link>
          )}
          <button
            ref={primary}
            type="button"
            onClick={onClose}
            className={
              gift
                ? "min-h-14 rounded-full bg-zinc-100 px-6 text-lg font-bold text-zinc-700 outline-none motion-safe:transition motion-safe:active:scale-95 focus-visible:ring-4 focus-visible:ring-purple-400 dark:bg-zinc-800 dark:text-zinc-200"
                : "min-h-14 rounded-full bg-purple-500 px-6 text-lg font-bold text-white shadow outline-none motion-safe:transition motion-safe:active:scale-95 focus-visible:ring-4 focus-visible:ring-purple-300"
            }
          >
            Fortsätt
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
