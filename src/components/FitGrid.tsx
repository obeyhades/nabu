import type { CSSProperties, ReactNode } from "react";
import { useElementSize } from "../hooks/useElementSize";
import { cn } from "../lib/cn";
import { fitGrid, type GridFitOptions } from "../lib/fit";

/**
 * Svarsrutor (och memorykort) som alltid får plats på skärmen.
 *
 * Rutan fyller utrymmet som blir över i spelets kolumn (flex-1) – eller hela
 * högerspalten på en liggande mobil (.stage-answers) – och väljer själv antal
 * kolumner så att rutorna blir så stora som möjligt i både bredd och höjd.
 * Sista raden centreras (5 svar = 3 + 2, aldrig ett ensamt vänsterställt kort).
 *
 * Varje barn får bredd/höjd från FitGrid, och `--tile` (rutans bredd i px) så
 * att emoji och siffror kan skalas med rutan: text-[calc(var(--tile)*0.5)].
 * Behållaren har size-containment: innehållet påverkar aldrig dess storlek
 * (ingen återkoppling vid mätningen). Räcker inte höjden blir rutorna aldrig
 * mindre än `min` – då växer behållaren och sidan får scrolla i stället.
 */
export function FitGrid({
  count,
  ratio = 1,
  gap = 12,
  min = 64,
  max = 220,
  spread = 0,
  className,
  innerClassName,
  children,
}: GridFitOptions & {
  count: number;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  const [box, { w, h }] = useElementSize<HTMLDivElement>();
  const fit = fitGrid(count, w, h, { ratio, gap, min, max, spread });
  const width = fit.cols * fit.tile + (fit.cols - 1) * gap;

  return (
    <div
      ref={box}
      className={cn("stage-answers relative grid w-full flex-1 place-items-center", className)}
      style={{ contain: "size", minHeight: fit.minH }}
    >
      <div
        className={cn(
          "flex flex-wrap content-center justify-center [&>*]:h-[calc(var(--tile)*var(--ratio))] [&>*]:w-[var(--tile)] [&>*]:shrink-0",
          innerClassName
        )}
        style={
          {
            gap,
            width: Math.max(0, width),
            "--tile": `${fit.tile}px`,
            "--ratio": ratio,
            visibility: fit.tile > 0 ? undefined : "hidden",
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}
