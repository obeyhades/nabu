import { motion } from "framer-motion";
import type { LangCode, OwnedSticker, StickerId } from "../../types";
import { cn } from "../../lib/cn";
import { STICKER_ALIGN, stickerSize } from "../../lib/stickerBook";
import { Sticker } from "../Sticker";

type Point = { x: number; y: number };

/**
 * Flygturen från kuvertet till platsen (≈450 ms i en liten båge). Ritas fast i
 * fönstret med båda punkterna i fönsterkoordinater, så den fungerar även när
 * sidan är scrollad och kuvertet ligger fast nederst. Vid reducerad rörelse
 * hoppar framer direkt till målet och `onLand` körs genast.
 * Bara en flygtur åt gången; platsen väntar osynlig tills märket landat.
 */
export function FlyingSticker({
  id,
  from,
  to,
  o,
  lang,
  onLand,
}: {
  id: StickerId;
  from: Point;
  to: Point;
  o: OwnedSticker | undefined;
  lang: LangCode;
  onLand: () => void;
}) {
  const top = Math.min(from.y, to.y) - 56;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[45] will-change-transform"
      initial={{ x: from.x, y: from.y, scale: 1.1 }}
      animate={{ x: [from.x, (from.x + to.x) / 2, to.x], y: [from.y, top, to.y], scale: [1.1, 1.25, 1.15] }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      onAnimationComplete={onLand}
    >
      <span className={cn("block -translate-x-1/2 -translate-y-1/2", STICKER_ALIGN)}>
        <Sticker id={id} parts={o?.parts} tricky={o?.tricky === 1} lang={lang} decorative className={stickerSize(id)} />
      </span>
    </motion.div>
  );
}
