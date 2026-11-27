import { useEffect } from "react";

let locks = 0;

/**
 * Sidan bakom en dialog/ett blad står still medan dialogen är öppen: ett svep
 * på den mörka bakgrunden (eller förbi bladets slut) rullar inte boken bakom.
 * Räknar lås, så att två dialoger samtidigt inte släpper låset för tidigt.
 */
export function useScrollLock() {
  useEffect(() => {
    const root = document.documentElement;
    if (locks++ === 0) root.style.overflow = "hidden";
    return () => {
      if (--locks === 0) root.style.overflow = "";
    };
  }, []);
}
