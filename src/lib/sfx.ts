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

// ── Klistermärkesboken och Nabus bo ──────────────────────

/** Ett glid från en frekvens till en annan (exponentiellt – låter naturligt). */
function sweep(from: number, to: number, dur: number, type: OscillatorType, gain: number) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

/** Ett klistermärke dras loss från arket. */
export function playPeel() {
  if (!enabled()) return;
  try {
    sweep(1200, 400, 0.12, "triangle", 0.1);
  } catch {
    /* tyst */
  }
}

/** Klistermärket fastnar på sidan. */
export function playStick() {
  if (!enabled()) return;
  try {
    tone(180, 0, 0.05, "triangle", 0.12);
    tone(140, 0.06, 0.06, "triangle", 0.1);
  } catch {
    /* tyst */
  }
}

/** Köp i Stjärnboden: tre glada toner (C-E-G). */
export function playBuy() {
  if (!enabled()) return;
  try {
    [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.16));
  } catch {
    /* tyst */
  }
}

/** En sak ställs på sin plats i boet. */
export function playPlace() {
  if (!enabled()) return;
  try {
    tone(520, 0, 0.06);
    tone(260, 0.04, 0.08, "triangle", 0.08);
  } catch {
    /* tyst */
  }
}

/** Lampknappen: ett litet klick. */
export function playLamp() {
  if (!enabled()) return;
  try {
    tone(1800, 0, 0.02, "square", 0.05);
  } catch {
    /* tyst */
  }
}

/** Trumman: ett mjukt dunk. */
export function playDrum() {
  if (!enabled()) return;
  try {
    sweep(120, 50, 0.25, "sine", 0.3);
  } catch {
    /* tyst */
  }
}

/** En pianoton (Pianot spelar C-E-G med den här). */
export function playNote(freq: number) {
  if (!enabled()) return;
  try {
    tone(freq, 0, 0.3, "triangle", 0.12);
  } catch {
    /* tyst */
  }
}

/** En vän i boet kvittrar. */
export function playChirp() {
  if (!enabled()) return;
  try {
    tone(1400, 0, 0.06);
    tone(1800, 0.07, 0.06);
  } catch {
    /* tyst */
  }
}
