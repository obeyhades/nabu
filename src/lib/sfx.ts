import { useSettings } from "../stores/useSettings";

/**
 * Enkla ljudeffekter via Web Audio – inga ljudfiler behövs, funkar offline.
 * Respekterar ljud-inställningen och faller tyst tillbaka om något strular.
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = ctx ?? new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function enabled(): boolean {
  try {
    return useSettings.getState().soundOn;
  } catch {
    return true;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.14) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export function playCorrect() {
  if (!enabled()) return;
  try {
    tone(660, 0, 0.12);
    tone(880, 0.09, 0.15);
  } catch {
    /* tyst */
  }
}

export function playWrong() {
  if (!enabled()) return;
  try {
    tone(196, 0, 0.22, "square", 0.1);
  } catch {
    /* tyst */
  }
}

/** Tre rätt i rad: snabb glad trudelutt. */
export function playCombo() {
  if (!enabled()) return;
  try {
    [784, 988, 1175].forEach((f, i) => tone(f, i * 0.06, 0.12, "triangle", 0.12));
  } catch {
    /* tyst */
  }
}

/** Ballong som poppar / katapult-träff. */
export function playPop() {
  if (!enabled()) return;
  try {
    tone(900, 0, 0.05, "square", 0.08);
    tone(300, 0.03, 0.1, "triangle", 0.1);
  } catch {
    /* tyst */
  }
}

/** Kort "svisch" när något kastas. */
export function playWhoosh() {
  if (!enabled()) return;
  try {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.35);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.36);
  } catch {
    /* tyst */
  }
}

export function playLevelUp() {
  if (!enabled()) return;
  try {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.18));
  } catch {
    /* tyst */
  }
}
