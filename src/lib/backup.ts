import { logError } from "./errors";

/**
 * Säkerhetskopia av allt Nabu sparar på enheten (alla localStorage-nycklar
 * som börjar med "nabu-": profil, statistik, inställningar, bok, bo …).
 * Filen är vanlig JSON: { app: "nabu", format: 1, exportedAt, data: { nyckel: råtext } }.
 */

const PREFIX = "nabu-";

export type Backup = { app: "nabu"; format: 1; exportedAt: string; data: Record<string, string> };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Varje värde ska se ut som en Zustand-persist-post: { state: {...}, version: n }. */
function isPersistEntry(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  try {
    const v: unknown = JSON.parse(raw);
    return isObject(v) && isObject(v.state) && typeof v.version === "number";
  } catch {
    return false;
  }
}

/** Kontrollera en inläst fil. Returnerar null om den inte är en giltig Nabu-kopia. */
export function parseBackup(text: string): Backup | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(v) || v.app !== "nabu" || v.format !== 1 || !isObject(v.data)) return null;
  const entries = Object.entries(v.data);
  if (!entries.length) return null;
  for (const [key, raw] of entries) if (!key.startsWith(PREFIX) || !isPersistEntry(raw)) return null;
  return {
    app: "nabu",
    format: 1,
    exportedAt: typeof v.exportedAt === "string" ? v.exportedAt : "",
    data: v.data as Record<string, string>,
  };
}

/** Lokalt datum som YYYY-MM-DD (för filnamnet). */
function localDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Samla alla nabu-nycklar och ladda ner dem som nabu-sakerhetskopia-ÅÅÅÅ-MM-DD.json. */
export function exportBackup(): void {
  try {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (raw !== null) data[key] = raw;
    }
    const backup: Backup = { app: "nabu", format: 1, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nabu-sakerhetskopia-${localDate()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    logError("backup.export", error);
  }
}

/**
 * Läs in en säkerhetskopia: kontrollera formen, skriv alla nycklar och ladda om
 * appen. Returnerar false (och ändrar ingenting) om filen inte är giltig eller
 * inte gick att skriva – då återställs de nycklar som hann skrivas.
 */
export async function importBackup(file: File): Promise<boolean> {
  let backup: Backup | null;
  try {
    backup = parseBackup(await file.text());
  } catch (error) {
    logError("backup.read", error);
    return false;
  }
  if (!backup) return false;

  const previous = new Map<string, string | null>();
  try {
    for (const [key, raw] of Object.entries(backup.data)) {
      previous.set(key, localStorage.getItem(key));
      localStorage.setItem(key, raw);
    }
  } catch (error) {
    logError("backup.write", error);
    for (const [key, raw] of previous) {
      try {
        if (raw === null) localStorage.removeItem(key);
        else localStorage.setItem(key, raw);
      } catch {
        // gick inte att återställa – inget mer att göra
      }
    }
    return false;
  }
  location.reload();
  return true;
}
