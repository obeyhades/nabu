import confetti from "canvas-confetti";
import { logError } from "./errors";

/** Liten belöningsanimation vid rätt svar / avklarad nivå. */
export function celebrate() {
  try {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
  } catch (error) {
    logError("celebrate", error);
  }
}
