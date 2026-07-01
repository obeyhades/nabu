/**
 * Genererar uppläsnings-klipp för alla ord × språk till
 * public/audio/<lang>/<id>.mp3 med Microsofts gratis neural-röster
 * (msedge-tts, ingen API-nyckel). Klippen buntas med appen så uppläsning
 * funkar på ALLA enheter, offline – oberoende av enhetens egna röster.
 *
 * Kör:
 *   bun run audio           (fyller bara på det som saknas)
 *   bun run audio -- --force  (skriver om alla klipp)
 *
 * Orden hämtas från src/data/concepts.ts, så ljudet hålls i synk med appen.
 * Lägger du till ett ord eller språk: kör bara skriptet igen.
 */
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONCEPTS } from "../src/data/concepts";
import { LANGUAGES } from "../src/data/languages";
import type { LangCode } from "../src/types";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "public", "audio");
const FORCE = process.argv.includes("--force");
const RATE = "-10%"; // lite långsammare för barn

// Tydliga kvinnliga neural-röster per språk
const VOICES: Record<LangCode, string> = {
  sv: "sv-SE-SofieNeural",
  en: "en-US-JennyNeural",
  el: "el-GR-AthinaNeural",
  ru: "ru-RU-SvetlanaNeural",
  ar: "ar-SA-ZariyahNeural",
};

async function synth(voice: string, text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const buf = await new Promise<Buffer>((resolve, reject) => {
    const { audioStream } = tts.toStream(text, { rate: RATE });
    const chunks: Buffer[] = [];
    audioStream.on("data", (c) => chunks.push(c as Buffer));
    audioStream.on("end", () => resolve(Buffer.concat(chunks)));
    audioStream.on("error", reject);
  });
  try {
    tts.close();
  } catch {
    /* strunt i */
  }
  return buf;
}

let made = 0,
  skipped = 0,
  fail = 0;

for (const lang of LANGUAGES.filter((l) => l.available)) {
  const voice = VOICES[lang.code];
  if (!voice) {
    console.warn(`ingen röst konfigurerad för ${lang.code}, hoppar över`);
    continue;
  }
  const dir = path.join(OUT, lang.code);
  fs.mkdirSync(dir, { recursive: true });
  for (const c of CONCEPTS) {
    const text = c.labels[lang.code];
    if (!text) continue;
    const file = path.join(dir, `${c.id}.mp3`);
    if (!FORCE && fs.existsSync(file)) {
      skipped++;
      continue;
    }
    try {
      const buf = await synth(voice, text);
      fs.writeFileSync(file, buf);
      made++;
    } catch (e) {
      fail++;
      console.error("FAIL", lang.code, c.id, (e as Error)?.message ?? e);
    }
  }
  console.log(`✓ ${lang.code} (${voice})`);
}

console.log(`\nKlart: ${made} skapade, ${skipped} fanns redan, ${fail} fel`);
process.exit(fail ? 1 : 0);
