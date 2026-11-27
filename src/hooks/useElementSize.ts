import { useCallback, useState } from "react";

export type Size = { w: number; h: number };

/**
 * Ett elements innerstorlek (clientWidth/clientHeight) som följer storleks-
 * ändringar – vridning av skärmen, Safaris verktygsfält, delad skärm på surfplattan.
 *
 * Ger en ref-callback att sätta på elementet (fungerar även när elementet dyker
 * upp först senare, t.ex. efter nivåväljaren). Mätningen sker när elementet
 * monteras, före första ritningen, så inget hoppar. { w: 0, h: 0 } tills dess.
 */
export function useElementSize<T extends HTMLElement>(): [(el: T | null) => void | (() => void), Size] {
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });

  const ref = useCallback((el: T | null) => {
    if (!el) return;
    const measure = () =>
      setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, size];
}
