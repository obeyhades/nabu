import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Slår ihop Tailwind-klasser säkert (villkorliga + krock-hantering). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
