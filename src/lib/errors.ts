/**
 * Centraliserad felhantering. En enda plats att logga fel — lätt att byta
 * till en riktig felrapporteringstjänst (Sentry etc.) senare.
 */
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(`[Nabu] ${context}:`, error);
  }
  // TODO: skicka till felrapportering i produktion
}

/** Kör en funktion och faller tillbaka till ett defaultvärde vid fel. */
export function safe<T>(fn: () => T, fallback: T, context = "safe"): T {
  try {
    return fn();
  } catch (error) {
    logError(context, error);
    return fallback;
  }
}
