/**
 * Be webbläsaren att inte rensa Nabus sparade data (boken och boet) när
 * utrymmet blir trångt. Frågar högst en gång per sidladdning och aldrig om
 * datan redan är skyddad. Fel sväljs – det här är bara en extra säkerhet.
 */
let requested = false;

export function requestPersistOnce(): void {
  if (requested) return;
  requested = true;
  try {
    const storage = typeof navigator !== "undefined" ? navigator.storage : undefined;
    if (!storage?.persist) return;
    const persisted = storage.persisted ? storage.persisted() : Promise.resolve(false);
    persisted
      .then((yes) => (yes ? true : storage.persist()))
      .catch(() => {});
  } catch {
    // inget stöd – appen fungerar ändå
  }
}
