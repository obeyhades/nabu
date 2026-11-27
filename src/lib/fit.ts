import { graphemes } from "./graphemes";

/**
 * Hjälpare för att saker ska FÅ PLATS på mobil och surfplatta – oavsett
 * skärm, orientering eller hur långt ordet är.
 */

/** Antal synliga tecken (grafem) – arabiska vokaltecken räknas inte som egna. */
export const glyphCount = (text: string): number => graphemes(text.replace(/\s+/g, "")).length;

/** Längsta ordet i en etikett ("polisbil" → 8, "bell pepper" → 6). */
export const longestWord = (text: string): number =>
  Math.max(0, ...text.split(/\s+/).filter(Boolean).map((w) => graphemes(w).length));

/**
 * Välj en textklass efter ordets längd, så att långa ord (ryska, grekiska,
 * svenska sammansättningar) krymper i stället för att flöda ut.
 * `steps` är [maxTecken, klass] i stigande ordning; `longer` gäller för längre ord.
 * Använd tillsammans med `word-fit` (avstavning som sista utväg).
 */
export function fitText(text: string, steps: readonly (readonly [number, string])[], longer: string): string {
  const n = longestWord(text);
  for (const [max, cls] of steps) if (n <= max) return cls;
  return longer;
}

/**
 * Bredden en rad knappar (lika breda, `item` px) ska få för att raderna blir
 * jämna när de radbryts: 6 = 3 + 3 och 7 = 4 + 3, aldrig 5 + 1. Samma tanke
 * som FitGrid men för knappar med fast storlek. 0 = inte mätt än (ingen gräns).
 */
export function balancedRowWidth(n: number, boxW: number, item: number, gap: number): number {
  if (n <= 0 || boxW <= 0) return 0;
  const perRowMax = Math.max(1, Math.floor((boxW + gap) / (item + gap)));
  const rows = Math.ceil(n / perRowMax);
  const perRow = Math.ceil(n / rows);
  return Math.min(boxW, perRow * item + (perRow - 1) * gap);
}

export type GridFit = {
  /** antal kolumner */
  cols: number;
  /** rutans bredd i px (höjden = bredd × ratio) */
  tile: number;
  /** minsta höjd behållaren behöver för att rutorna aldrig ska bli mindre än `min` */
  minH: number;
};

export type GridFitOptions = {
  /** höjd/bredd för en ruta (1 = kvadrat) */
  ratio?: number;
  /** mellanrum i px */
  gap?: number;
  /** minsta rutbredd i px (får inte bli ett för litet tryckmål) */
  min?: number;
  /** största rutbredd i px (inga jätterutor på surfplattan) */
  max?: number;
  /**
   * Andel (t.ex. 0.05 = 5 %) som rutorna får krympa för att få fler kolumner:
   * ett brett bräde (3 × 4) är lättare att överblicka än en hög remsa (2 × 6).
   * 0 = alltid största rutorna (svarsrutorna i spelen).
   */
  spread?: number;
};

/**
 * Hur `n` rutor ska ligga i en ruta på w × h px för att bli så stora som möjligt.
 * Både bredd och höjd räknas, så ingen rad hamnar under skärmkanten (liggande
 * mobil, iPad på tvären). En ensam ruta på sista raden (5 = 4 + 1) ser trasig ut
 * och straffas lite; sista raden centreras alltid av FitGrid.
 */
export function fitGrid(n: number, w: number, h: number, opts: GridFitOptions = {}): GridFit {
  const { ratio = 1, gap = 12, min = 64, max = 220, spread = 0 } = opts;
  if (n <= 0 || w <= 0) return { cols: Math.max(1, n), tile: 0, minH: 0 };

  // Hur långt rutnätets form är från ytans form (0 = samma bredd/höjd-förhållande)
  const boxAspect = h > 0 ? w / h : 1;
  const shapeOff = (cols: number, rows: number, tile: number) =>
    Math.abs(Math.log((cols * tile + (cols - 1) * gap) / (rows * tile * ratio + (rows - 1) * gap) / boxAspect));

  const options: { cols: number; tile: number; score: number; off: number }[] = [];
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const byW = (w - (cols - 1) * gap) / cols;
    const byH = h > 0 ? (h - (rows - 1) * gap) / rows / ratio : byW;
    const tile = Math.min(max, byW, byH);
    const last = n - (rows - 1) * cols;
    const score = tile * (rows > 1 && last === 1 ? 0.8 : 1);
    options.push({ cols, tile, score, off: tile > 0 ? shapeOff(cols, rows, tile) : Infinity });
  }
  // Största rutorna vinner. Lika stora (t.ex. båda når `max` på en surfplatta) → den form
  // som liknar ytan mest: en liggande yta får fler kolumner, en stående färre. Helt lika → färre kolumner.
  const top = Math.max(...options.map((o) => o.score));
  let best = options[0];
  for (const o of options) {
    if (o.score < top - 0.5) continue;
    if (best.score < top - 0.5 || o.off < best.off - 0.01) best = o;
  }
  // `spread`: nästan lika stora rutor med fler kolumner vinner (memory på en stående
  // mobil: 3 × 4 i stället för en smal 2 × 6-remsa med tomma kanter). Inte när rutorna
  // redan når `max` – då gäller formen ovan (surfplattan).
  if (spread > 0 && best.tile < max - 0.5) {
    for (const o of options) {
      if (o.cols > best.cols && o.tile >= min && o.score >= top * (1 - spread)) best = o;
    }
  }

  // Golv: rutorna blir aldrig mindre än `min` – räcker inte höjden får sidan scrolla.
  // Så få rader som bredden tillåter, och raderna så jämna som möjligt (5 = 3 + 2).
  const maxCols = Math.max(1, Math.min(n, Math.floor((w + gap) / (min + gap))));
  const rowsAtMin = Math.ceil(n / maxCols);
  const colsAtMin = Math.ceil(n / rowsAtMin);
  const minH = Math.ceil(rowsAtMin * min * ratio + (rowsAtMin - 1) * gap);
  if (best.tile < min) {
    const tile = Math.min(min, (w - (colsAtMin - 1) * gap) / colsAtMin);
    return { cols: colsAtMin, tile: Math.max(0, Math.floor(tile)), minH };
  }
  return { cols: best.cols, tile: Math.max(0, Math.floor(best.tile)), minH };
}
