import { TOFU_RISK } from "../data/stickers";

/**
 * Kan enheten rita den här emojin i färg? Används bara för TOFU_RISK
 * (Emoji 12+ som blir tomma rutor på t.ex. Windows 10 och Android 9).
 * En 32×32-canvas: rita i 28 px och räkna pixlar som både syns (alfa > 24)
 * och har färg (max(R,G,B) − min > 20). Minst 8 sådana = stöds.
 * Resultatet sparas per emoji. Om något kastar räknas emojin som stödd.
 */
const cache = new Map<string, boolean>();
let ctx: CanvasRenderingContext2D | null | undefined;

const EMOJI_FONT = `28px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;

export function supportsEmoji(e: string): boolean {
  const hit = cache.get(e);
  if (hit !== undefined) return hit;
  let ok = true;
  try {
    if (ctx === undefined) {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      ctx = canvas.getContext("2d", { willReadFrequently: true });
    }
    if (ctx) {
      ctx.clearRect(0, 0, 32, 32);
      ctx.font = EMOJI_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(e, 16, 16);
      const d = ctx.getImageData(0, 0, 32, 32).data;
      let colored = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] <= 24) continue;
        if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 20) colored++;
      }
      ok = colored >= 8;
    }
  } catch {
    ok = true;
  }
  cache.set(e, ok);
  return ok;
}

/** Ska emojin visas som den är? Nej bara för TOFU_RISK-emoji som enheten saknar (då WordBlob). */
export function showsEmoji(e: string): boolean {
  return !TOFU_RISK.has(e) || supportsEmoji(e);
}
