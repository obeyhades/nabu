import { useCallback } from "react";
import { useSettings } from "../stores/useSettings";
import { getLanguage } from "../data/languages";
import { logError } from "../lib/errors";
import type { LangCode } from "../types";

/**
 * Uppläsning: spelar i första hand ett förinspelat klipp som buntas med appen
 * (/audio/<språk>/<id>.mp3 — funkar offline på alla enheter). Faller tillbaka
 * på enhetens egen röst (Web Speech) om klippet saknas eller inte kan spelas.
 */

function audioUrl(code: LangCode, conceptId: string): string {
  return `${import.meta.env.BASE_URL}audio/${code}/${conceptId}.mp3`;
}

const audioCache = new Map<string, HTMLAudioElement>();
let currentAudio: HTMLAudioElement | null = null;

function playClip(url: string, rate: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let el = audioCache.get(url);
    if (!el) {
      el = new Audio(url);
      el.preload = "auto";
      audioCache.set(url, el);
    }
    if (currentAudio && currentAudio !== el) {
      try {
        currentAudio.pause();
      } catch {
        /* strunt i */
      }
    }
    currentAudio = el;
    const target = el;
    const cleanup = () => {
      target.removeEventListener("ended", onEnded);
      target.removeEventListener("error", onError);
    };
    const onEnded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("audio error"));
    };
    target.addEventListener("ended", onEnded);
    target.addEventListener("error", onError);
    target.currentTime = 0;
    try {
      // preservesPitch → ändrad hastighet utan "chipmunk"-effekt
      (target as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
      target.playbackRate = rate;
    } catch {
      /* strunt i */
    }
    const p = target.play();
    if (p && typeof p.catch === "function") {
      p.catch((e) => {
        cleanup();
        reject(e);
      });
    }
  });
}

/** Väljer en röst som matchar språket (exakt tag först, sen primär-subtag). */
function pickVoice(langTag: string): SpeechSynthesisVoice | undefined {
  const synth = window.speechSynthesis;
  if (!synth) return undefined;
  const voices = synth.getVoices();
  if (!voices.length) return undefined;
  const tag = langTag.toLowerCase();
  const primary = tag.split("-")[0];
  return (
    voices.find((v) => v.lang.toLowerCase() === tag) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(primary))
  );
}

function speakWithVoice(text: string, langTag: string, rate: number) {
  const synth = window.speechSynthesis;
  if (!synth || !text) return;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langTag;
  const voice = pickVoice(langTag);
  if (voice) utter.voice = voice;
  utter.rate = 0.9 * rate;
  synth.speak(utter);
}

export function useSpeech() {
  const lang = useSettings((s) => s.lang);
  const soundOn = useSettings((s) => s.soundOn);
  const speechRate = useSettings((s) => s.speechRate);

  const speak = useCallback(
    (text: string, code: LangCode = lang, conceptId?: string) => {
      if (!soundOn) return;
      if (!text && !conceptId) return;
      // stoppa ev. pågående talsyntes
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* strunt i */
      }
      const langTag = getLanguage(code).speechLang;
      if (conceptId) {
        playClip(audioUrl(code, conceptId), speechRate).catch(() => {
          // filen saknas/kunde inte spelas → använd enhetens röst
          try {
            speakWithVoice(text, langTag, speechRate);
          } catch (error) {
            logError("useSpeech.fallback", error);
          }
        });
        return;
      }
      try {
        speakWithVoice(text, langTag, speechRate);
      } catch (error) {
        logError("useSpeech.speak", error);
      }
    },
    [lang, soundOn, speechRate]
  );

  const stop = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch (error) {
      logError("useSpeech.stop", error);
    }
    try {
      currentAudio?.pause();
    } catch {
      /* strunt i */
    }
  }, []);

  return { speak, stop };
}
