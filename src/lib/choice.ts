export type ChoiceState = "idle" | "correct" | "wrong" | "dim";

/** Hjälp: räkna ut knappens läge från vad som valts och vad som är rätt. */
export function choiceState<T>(opt: T, picked: T | null, answer: T): ChoiceState {
  if (picked === null) return "idle";
  if (opt === answer) return picked === answer ? "correct" : "dim";
  if (opt === picked) return "wrong";
  return "dim";
}
