import { useRef, useState } from "react";

export type CoachEvent = { kind: "correct" | "wrong"; combo: number; n: number };

/** Liten hjälp-hook för att skapa coach-händelser. */
export function useCoach() {
  const [event, setEvent] = useState<CoachEvent | null>(null);
  const n = useRef(0);
  const cheer = (combo: number) => setEvent({ kind: "correct", combo, n: ++n.current });
  const comfort = () => setEvent({ kind: "wrong", combo: 0, n: ++n.current });
  return { event, cheer, comfort };
}
