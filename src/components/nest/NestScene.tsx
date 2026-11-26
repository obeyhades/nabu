import { AnimatePresence, motion } from "framer-motion";
import {
  Fragment,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import type { Concept, ItemId, LangCode, NestItem, NestSlot, StickerId } from "../../types";
import { cn } from "../../lib/cn";
import { showsEmoji } from "../../lib/emojiSupport";
import { playChirp, playDrum, playLamp, playNote } from "../../lib/sfx";
import { wornItem } from "../../lib/rewards";
import { numberOf } from "../../lib/stickerArt";
import { CONCEPTS, labelOf } from "../../data/concepts";
import { LANGUAGES, getLanguage } from "../../data/languages";
import { NABU_PERCH, NEST_SLOTS, slotsFor, type SceneSlot, type SlotDef } from "../../data/nestItems";
import { CONCEPT_BY_ID, OWL_STICKER, PAGE_OF_STICKER, parseStickerId } from "../../data/stickers";
import { useSpeech } from "../../hooks/useSpeech";
import { useNest } from "../../stores/useNest";
import { useSettings } from "../../stores/useSettings";
import { recentPlacedWords, useStickers } from "../../stores/useStickers";
import { useTheme } from "../../stores/useTheme";
import { ItemArt } from "../ItemArt";
import { Mascot } from "../Mascot";
import { Sticker } from "../Sticker";
import { Hollow, Perch, Planks, Shutters } from "./NestArt";
import { isSceneSlot, isWear, itemAt, type NestMode, type NestSceneHandle } from "./nestUi";

/**
 * Nabus bo: ett mysigt ekträdshål som barnet pyntar.
 *
 * Koordinater är logiska, 400 × 300, och speglas aldrig (dir="ltr"). En
 * ResizeObserver sätter `--u` = bredd/400 px på behållaren och allt ritas i
 * `calc(var(--u) * n)` – inget beroende av container-enheter (iOS 15 funkar).
 *
 * Lager, bakifrån: väggar (årsringar) → fönster → girlang → väggsaker/lampa →
 * fönsterbräda/hylla (saker, sedan plankan framför) → golvsaker → matta →
 * vänner → Nabu (med hatt/hals) → lampans sken. Mörkt läge följer html.dark.
 *
 * Titta: en sak säger sitt namn och gör sitt trick; Nabu frågar "Minns du?"
 * om ett ord barnet har. Pynta: med en vald sak lyser dess platser (tryck för
 * att ställa dit), annars ger ett tryck på en sak [Ställ undan]. Inget kan
 * förfalla och Nabu är aldrig ledsen – inte heller i mörkret.
 */

type Props = {
  mode: NestMode;
  /** false under första besöket (introt styr). */
  interactive?: boolean;
  /** Pynta: saken barnet valt i lådan – dess giltiga platser lyser. */
  selected?: NestItem | null;
  /** Stjärnboden: gratis förhandsvisning (70 % spöke på platsen, hatt/hals på Nabu). */
  preview?: { item: NestItem; slot: NestSlot } | null;
  /** Något sidan vill att Nabu säger (t.ex. ett tack efter introt). */
  nabuLine?: string | null;
  onPlace: (slot: SceneSlot) => void;
  onStow: (slot: SceneSlot) => void;
  announce: (msg: string) => void;
  ref?: Ref<NestSceneHandle>;
};

/** Längd i scenens enhet. */
const U = (n: number) => `calc(var(--u) * ${n})`;

// Ritordning (fönstret ritas för sig, längst bak)
const BACK_ROW: SceneSlot[] = ["garland", "wallL", "wallR", "lamp", "sill", "shelf"];
const FRONT_ROW: SceneSlot[] = ["floorL", "floorR", "rug", "friend3", "friend1", "friend2"];

/** Breda, platta saker landar med en "smack", resten studsar. */
const FLAT: SceneSlot[] = ["window", "rug", "garland"];

const TRICK_CLASS: Record<NonNullable<NestItem["trick"]>, string> = {
  bounce: "animate-item-bounce",
  lamp: "animate-item-bounce",
  piano: "animate-item-bounce",
  globe: "animate-sticker-spin",
  abacus: "animate-sticker-wobble",
  drum: "animate-item-bounce",
  grow: "",
  clock: "animate-sticker-wiggle",
  telescope: "animate-sticker-wobble",
  frame: "animate-wiggle-soft",
  friend: "animate-sticker-hop",
};

const ALIGN: Record<SlotDef["anchor"], string> = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
};

const WINDOW_RADIUS = "50% 50% 5% 5% / 40% 40% 6% 6%";
const ARCH = "rounded-[50%_50%_7%_7%/22%_22%_9%_9%]";

/** Rutan en sak ritas i (logiska enheter). */
function boxOf(def: SlotDef): { w: number; h: number } {
  if (def.span) return { w: def.span[1] - def.span[0], h: 52 };
  if (def.w && def.h) return { w: def.w, h: def.h };
  const s = def.size ?? 40;
  return { w: s, h: s };
}

/** Var ljuset kommer ifrån: den hängande lampan lyser nedtill, lampan på hyllan i mitten. */
function lightCenter(def: SlotDef): number {
  const size = def.size ?? 32;
  return def.anchor === "top" ? def.y + size * 0.65 : def.y - size / 2;
}

/** Rutans övre och nedre kant (logiska enheter). */
function edgesOf(def: SlotDef): { top: number; bottom: number } {
  const { h } = boxOf(def);
  if (def.anchor === "bottom") return { top: def.y - h, bottom: def.y };
  if (def.anchor === "center") return { top: def.y - h / 2, bottom: def.y + h / 2 };
  return { top: def.y, bottom: def.y + h };
}

function placeStyle(def: SlotDef): CSSProperties {
  const ty = def.anchor === "bottom" ? "-100%" : def.anchor === "center" ? "-50%" : "0%";
  const { w, h } = boxOf(def);
  // Minst 44 px att trycka på även på en liten telefon
  return {
    left: U(def.x),
    top: U(def.y),
    width: U(w),
    height: U(h),
    minWidth: 44,
    minHeight: 44,
    transform: `translate(-50%, ${ty})`,
  };
}

const LANG_CODES: LangCode[] = LANGUAGES.filter((l) => l.available).map((l) => l.code);
const OWL = CONCEPT_BY_ID.get("owl");
// Kulramen räknar 1–10 med sifferordens inspelningar
const ONE_TO_TEN: Concept[] = CONCEPTS.filter((c) => (numberOf(c.id) ?? 99) <= 10).sort(
  (a, b) => (numberOf(a.id) ?? 0) - (numberOf(b.id) ?? 0)
);

// "Minns du?" fortsätter där den var, även om barnet går ut och in igen (bara i minnet)
let quizTurn = 0;

type Play = { id: ItemId; n: number; cls: string };
type Quiz = { step: "ask" | "tell" | "cheer"; id: StickerId } | { step: "hello" };
type Bubble = { slot: SceneSlot; node: ReactNode; n: number };

export function NestScene({
  mode,
  interactive = true,
  selected = null,
  preview = null,
  nabuLine = null,
  onPlace,
  onStow,
  announce,
  ref,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const { speak, stop } = useSpeech();
  const lang = useSettings((s) => s.lang);
  const dark = useTheme((s) => s.theme === "dark");
  const slots = useNest((s) => s.slots);
  const nestOwned = useNest((s) => s.owned);
  const lampOn = useNest((s) => s.lampOn);
  const grow = useNest((s) => s.grow);
  const wornHat = useNest((s) => wornItem(s, "hat"));
  const toggleLamp = useNest((s) => s.toggleLamp);
  const water = useNest((s) => s.water);
  const stickers = useStickers((s) => s.owned);

  // ── Skala: --u = bredd/400 px ──
  const boxRef = useRef<HTMLDivElement>(null);
  const [u, setU] = useState(0);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    // --u sätts direkt på elementet (ingen ram med fel skala när skärmen vrids)
    const measure = (w: number) => {
      el.style.setProperty("--u", `${w / 400}px`);
      setU(w / 400);
    };
    measure(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) measure(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Trick-tillstånd (bara i minnet) ──
  const [play, setPlay] = useState<Partial<Record<SceneSlot, Play>>>({});
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [cheer, setCheer] = useState(0); // > 0 = Nabu jublar just nu (nyckeln spelar om)
  const [shooting, setShooting] = useState<number[]>([]);
  const [menu, setMenu] = useState<SceneSlot | null>(null);
  const counter = useRef(0);
  const drops = useRef<Record<ItemId, number>>({});
  const named = useRef({ id: "", t: 0 });
  const seq = useRef<number[]>([]); // sekvenser som avbryts av nästa tryck
  const misc = useRef<number[]>([]); // städtimrar (stjärnfall)
  const cheerTimer = useRef<number | undefined>(undefined);

  const later = (ms: number, fn: () => void) => {
    seq.current.push(window.setTimeout(fn, ms));
  };
  const cancelSeq = () => {
    seq.current.forEach((t) => window.clearTimeout(t));
    seq.current = [];
  };
  useEffect(
    () => () => {
      seq.current.forEach((t) => window.clearTimeout(t));
      misc.current.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(cheerTimer.current);
      stop();
    },
    [stop]
  );

  /** Nabu jublar en gång och guppar sedan vidare. */
  const cheerOnce = () => {
    window.clearTimeout(cheerTimer.current);
    setCheer((c) => c + 1);
    cheerTimer.current = window.setTimeout(() => setCheer(0), 1000);
  };

  const animate = (slot: SceneSlot, id: ItemId, cls: string) =>
    setPlay((p) => ({ ...p, [slot]: { id, n: ++counter.current, cls } }));

  const showBubble = (slot: SceneSlot, node: ReactNode, ms = 2600) => {
    setBubble({ slot, node, n: ++counter.current });
    if (ms > 0) later(ms, () => setBubble(null));
  };

  // Sidan kan be om en studs när något just ställts dit (köp, Pynta, introt),
  // och om tystnad: Tittas sekvenser (kulramen 1–10, globen, tavlan) får inte
  // prata över Stjärnbodens pris eller Pyntas namn.
  useImperativeHandle(
    ref,
    () => ({
      quiet: () => {
        seq.current.forEach((t) => window.clearTimeout(t));
        seq.current = [];
        stop();
        setBubble(null);
        setQuiz(null);
      },
      bump: (slot: NestSlot) => {
        if (!isSceneSlot(slot)) {
          cheerOnce(); // ny hatt eller halssak: Nabu blir glad
          return;
        }
        const id = useNest.getState().slots[slot];
        if (id)
          setPlay((p) => ({
            ...p,
            [slot]: {
              id,
              n: ++counter.current,
              cls: FLAT.includes(slot) ? "animate-sticker-slap" : "animate-item-bounce",
            },
          }));
      },
    }),
    [stop]
  );

  const nest = { owned: nestOwned, slots };
  const at = (slot: SceneSlot) => itemAt(nest, slot);

  // Ord barnet har, äldst först (Nabus uggla räknas inte – det är ju hen själv)
  const quizWords = useMemo(
    () =>
      Object.entries(stickers)
        .filter(([id]) => id !== OWL_STICKER && id.startsWith("w:") && PAGE_OF_STICKER.has(id))
        .sort(([, a], [, b]) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
        .map(([id]) => id),
    [stickers]
  );

  // ── Popover [Ställ undan]: stängs av Esc eller ett tryck utanför ──
  const popRef = useRef<HTMLDivElement>(null);
  const menuOpen = menu !== null && mode === "pynta" && !selected && interactive;
  useEffect(() => {
    if (!menuOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    const pop = popRef.current;
    pop?.querySelector("button")?.focus();
    const onDown = (e: PointerEvent) => {
      if (!pop?.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      // Tillbaka till saken man öppnade från (om den finns kvar och fokus inte flyttats)
      const at = document.activeElement;
      if (opener?.isConnected && (!at || at === document.body || pop?.contains(at)))
        opener.focus({ preventScroll: true });
    };
  }, [menuOpen]);

  // ── Titta: namn + trick ──
  const sayName = (item: NestItem, always = false) => {
    const now = Date.now();
    if (!always && named.current.id === item.id && now - named.current.t < 3000) return;
    named.current = { id: item.id, t: now };
    speak(item.name, "sv");
  };

  const speakWord = (c: Concept) => speak(labelOf(c, lang), lang, c.id);

  const runTrick = (slot: SceneSlot, item: NestItem) => {
    cancelSeq();
    setBubble(null);
    setQuiz(null);
    const trick = item.trick;
    if (trick && trick !== "grow")
      animate(slot, item.id, slot === "lamp" && trick === "lamp" ? "animate-pouch-shake" : TRICK_CLASS[trick]);

    switch (trick) {
      case "lamp": {
        toggleLamp();
        playLamp();
        sayName(item);
        announce(useNest.getState().lampOn ? "Lampan lyser." : "Lampan är släckt.");
        return;
      }
      case "piano":
        [261.63, 329.63, 392].forEach((f, i) => later(i * 230, () => playNote(f)));
        later(800, () => sayName(item));
        return;
      case "globe": {
        // "uggla" på alla fem språken, 900 ms mellan varje
        if (!OWL) return sayName(item);
        LANG_CODES.forEach((code, i) =>
          later(i * 900, () => {
            const word = OWL.labels[code] ?? "";
            speak(word, code, OWL.id);
            showBubble(
              slot,
              <span lang={code} dir={getLanguage(code).dir} className="text-lg font-black">
                {word}
              </span>,
              0
            );
          })
        );
        later(LANG_CODES.length * 900 + 600, () => setBubble(null));
        return;
      }
      case "abacus":
        ONE_TO_TEN.forEach((c, i) =>
          later(i * 800, () => {
            speakWord(c);
            showBubble(
              slot,
              <span dir="ltr" className="text-2xl font-black text-indigo-600 dark:text-indigo-300">
                {i + 1}
              </span>,
              0
            );
          })
        );
        later(ONE_TO_TEN.length * 800 + 700, () => setBubble(null));
        return;
      case "drum":
        playDrum();
        sayName(item);
        return;
      case "grow": {
        // Tre tryck vattnar ett steg. Plantan vissnar aldrig.
        const stage = useNest.getState().grow[item.id] ?? 0;
        sayName(item);
        if (stage >= 2) {
          animate(slot, item.id, "animate-item-bounce");
          showBubble(slot, <span className="text-xl">🌳💚</span>);
          return;
        }
        const d = (drops.current[item.id] ?? 0) + 1;
        if (d < 3) {
          drops.current[item.id] = d;
          animate(slot, item.id, "animate-wiggle-soft");
          showBubble(slot, <span className="text-xl tracking-widest">{"💧".repeat(d)}</span>, 1600);
          return;
        }
        drops.current[item.id] = 0;
        water(item.id);
        playChirp();
        animate(slot, item.id, "animate-item-bounce");
        showBubble(slot, <span className="text-xl">💧💧💧 💚</span>);
        announce(`${item.name} växte!`);
        return;
      }
      case "clock": {
        const time = new Date().toLocaleTimeString("sv-SE", {
          hour: "2-digit",
          minute: "2-digit",
        });
        sayName(item);
        showBubble(
          slot,
          <span dir="ltr" className="font-mono text-lg font-black tabular-nums">
            {time}
          </span>,
          3200
        );
        announce(`Klockan är ${time}.`);
        return;
      }
      case "telescope": {
        sayName(item);
        const n = ++counter.current;
        setShooting((s) => [...s, n]);
        misc.current.push(window.setTimeout(() => setShooting((s) => s.filter((x) => x !== n)), 1300));
        return;
      }
      case "frame": {
        // Läser de fyra senaste orden på tavlan, ett i taget
        const words = recentPlacedWords(useStickers.getState().owned, 4)
          .map((id) => parseStickerId(id))
          .flatMap((p) => (p?.family === "word" ? [p.concept] : []));
        if (!words.length) return sayName(item, true);
        words.forEach((c, i) =>
          later(i * 950, () => {
            speakWord(c);
            showBubble(
              slot,
              <span lang={lang} dir={getLanguage(lang).dir} className="text-lg font-black">
                {labelOf(c, lang)}
              </span>,
              0
            );
          })
        );
        later(words.length * 950 + 500, () => setBubble(null));
        return;
      }
      case "friend":
        playChirp();
        sayName(item, true);
        return;
      default:
        sayName(item, true);
    }
  };

  // ── Nabu: "Minns du?" – bild, sedan ordet, sedan jubel. Inga poäng. ──
  const tapNabu = () => {
    cancelSeq();
    setBubble(null);
    if (!quizWords.length) {
      setQuiz({ step: "hello" });
      cheerOnce();
      playChirp();
      speak("Hoo-hoo! Vad mysigt det är här!", "sv");
      return;
    }
    if (quiz && quiz.step === "ask") {
      const c = parseStickerId(quiz.id);
      if (c?.family === "word") speakWord(c.concept);
      setQuiz({ step: "tell", id: quiz.id });
      return;
    }
    if (quiz && quiz.step === "tell") {
      setQuiz({ step: "cheer", id: quiz.id });
      cheerOnce();
      playChirp();
      return;
    }
    const id = quizWords[quizTurn++ % quizWords.length];
    setQuiz({ step: "ask", id });
    speak("Minns du?", "sv");
  };

  // ── Vad som visas på en plats (förhandsvisning går före det som står där) ──
  const shown = (slot: SceneSlot): { item: NestItem; ghost: boolean } | null => {
    if (preview && preview.slot === slot) return { item: preview.item, ghost: true };
    const item = at(slot);
    return item ? { item, ghost: false } : null;
  };

  const validFor = selected ? new Set(slotsFor(selected).filter(isSceneSlot)) : null;
  const placing = mode === "pynta" && !!selected && interactive;

  const press = (slot: SceneSlot, item: NestItem) => {
    if (!interactive) return;
    if (mode === "pynta") {
      if (selected) onPlace(slot);
      else setMenu(slot);
      return;
    }
    runTrick(slot, item);
  };

  const animOf = (slot: SceneSlot, id: ItemId) => {
    const p = play[slot];
    return p && p.id === id ? p : null;
  };

  // ── En sak på sin plats ──
  const renderSlot = (slot: SceneSlot) => {
    const def = NEST_SLOTS[slot];
    const thing = shown(slot);
    const valid = !!validFor?.has(slot);
    const { w } = boxOf(def);

    if (!thing) {
      if (!placing || !valid || !selected) return null;
      // Tom plats som lyser: silhuetten av den valda saken visar formen.
      // Samma form som en fylld plats (Fragment → [sken], knapp), så att React
      // behåller knappen när saken ställs dit – fokus stannar på platsen.
      return (
        <Fragment key={slot}>
          {null}
          <button
            type="button"
            aria-label={`${def.aria}: tom`}
            onClick={() => onPlace(slot)}
            className={cn(
              "absolute flex justify-center rounded-2xl border-2 border-dashed border-amber-500 bg-white/55 shadow-[0_0_16px_4px_rgb(253_224_71/0.6)] outline-none ring-4 ring-amber-300/70 focus-visible:ring-purple-400 dark:border-amber-300 dark:bg-zinc-900/45",
              ALIGN[def.anchor]
            )}
            style={placeStyle(def)}
          >
            <span className="block leading-none opacity-35" style={{ fontSize: U(w * 0.85) }}>
              <ItemArt art={selected.art} />
            </span>
          </button>
        </Fragment>
      );
    }

    const { item, ghost } = thing;
    const anim = ghost ? null : animOf(slot, item.id);
    const flip = slot === "lamp" && item.id === "light-bulb"; // glödlampan hänger upp och ner
    const stage = item.trick === "grow" ? (grow[item.id] ?? 0) : undefined;
    // Tricket på ett eget inre lager (platsen har redan en translate); vändningen innerst,
    // så att den hängande lampan gungar kring sin krok
    const art = (
      <span key={anim?.n ?? 0} className={cn("block leading-none", anim?.cls)} style={{ fontSize: U(w) }}>
        <span className={cn("block", flip && "rotate-180")}>
          <ItemArt art={item.art} grow={stage} />
        </span>
      </span>
    );

    if (ghost)
      return (
        <span
          key={slot}
          aria-hidden
          className={cn(
            "pointer-events-none absolute flex justify-center rounded-2xl opacity-70 outline-2 outline-offset-2 outline-dashed outline-amber-400",
            ALIGN[def.anchor]
          )}
          style={placeStyle(def)}
        >
          {art}
        </span>
      );

    const dim = placing && !valid;
    // En tänd lampa får en varm gloria precis runt sig – tydligt även i ljust läge
    const lit = lampOn && item.kind === "light";
    const halo = lit ? lightCenter(def) : null;
    return (
      <Fragment key={slot}>
        {halo !== null && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute rounded-full",
              item.id === "light-moon"
                ? "bg-[radial-gradient(circle,rgb(191_219_254/0.85),rgb(147_197_253/0.3)_42%,transparent_70%)]"
                : "bg-[radial-gradient(circle,rgb(255_236_170/0.95),rgb(255_214_120/0.4)_42%,transparent_70%)]"
            )}
            style={{
              left: U(def.x),
              top: U(halo),
              width: U(w * 2.4),
              height: U(w * 2.4),
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
        <button
          type="button"
          aria-label={`${def.aria}: ${item.name}`}
          aria-expanded={mode === "pynta" && !selected ? menu === slot : undefined}
          disabled={!interactive || dim}
          onClick={() => press(slot, item)}
          className={cn(
            "absolute flex justify-center rounded-2xl outline-none transition-opacity focus-visible:ring-4 focus-visible:ring-purple-400",
            ALIGN[def.anchor],
            placing && valid && "bg-amber-200/30 shadow-[0_0_16px_4px_rgb(253_224_71/0.6)] ring-4 ring-amber-300",
            dim && "opacity-40",
            menuOpen && menu === slot && "ring-4 ring-amber-300"
          )}
          style={placeStyle(def)}
        >
          {art}
        </button>
      </Fragment>
    );
  };

  // ── Fönstret (alltid med ram; tomt = stängda luckor) ──
  const win = shown("window");
  const winAnim = win && !win.ghost ? animOf("window", win.item.id) : null;
  const winDef = NEST_SLOTS.window;
  const winDim = placing; // inga flerplatssaker passar i fönstret
  const windowInner = (
    <>
      {win ? (
        <span key={winAnim?.n ?? 0} className={cn("absolute inset-0 block", winAnim?.cls)}>
          <ItemArt art={win.item.art} fill />
        </span>
      ) : (
        <Shutters />
      )}
      {shooting.map((n) => (
        <span
          key={n}
          aria-hidden
          className="shooting-star animate-shooting-star shadow-[0_0_6px_2px_rgb(253_224_71/0.75)]"
          style={{ left: "4%", top: "12%" }}
        />
      ))}
    </>
  );

  // ── Ljus: skenet när lampan är tänd och en lampa sitter i kroken eller på hyllan ──
  const lights = lampOn ? (["lamp", "shelf"] as const).filter((s) => at(s)?.kind === "light") : [];
  const stringLit = lampOn && at("garland")?.id === "garland-lights";

  // ── Nabu ──
  const wear = preview && isWear(preview.item) ? { [preview.item.kind]: preview.item.id } : undefined;
  const nabuTalks = !!nabuLine || (mode !== "pynta" && interactive && quiz !== null);
  // Bubblans spets pekar på hattens topp (eller huvudet utan hatt)
  const hatOn = preview?.item.kind === "hat" ? preview.item : wornHat;
  const headTop = NABU_PERCH.y - NABU_PERCH.size + Math.min(0, hatOn?.wear?.dy ?? 0) * NABU_PERCH.size - 3;
  const cheering = cheer > 0;

  const sceneStyle = { "--u": `${u}px` } as CSSProperties;

  return (
    <div
      ref={boxRef}
      dir="ltr"
      role="group"
      aria-label="Nabus bo"
      data-scene
      tabIndex={-1}
      className="relative mx-auto aspect-[4/3] w-full max-w-xl select-none outline-none"
      style={sceneStyle}
    >
      {/* Själva trädhålet (allt klipps i bågen) */}
      <div className={cn("absolute inset-0 overflow-hidden shadow-[0_10px_30px_-8px_rgb(60_30_0/0.45)]", ARCH)}>
        <Hollow uid={uid} />

        {/* Fönstret */}
        <div
          className="absolute"
          style={{
            left: U(winDef.x - (winDef.w ?? 110) / 2),
            top: U(winDef.y - (winDef.h ?? 80) / 2),
            width: U(winDef.w ?? 110),
            height: U(winDef.h ?? 80),
          }}
        >
          {win && !win.ghost ? (
            <button
              type="button"
              aria-label={`${winDef.aria}: ${win.item.name}`}
              aria-expanded={mode === "pynta" && !selected ? menu === "window" : undefined}
              disabled={!interactive || winDim}
              onClick={() => press("window", win.item)}
              className={cn(
                // z-10 vid fokus: annars täcker karmen (ritad efteråt, 5u bred) hela fokusringen
                "absolute inset-0 overflow-hidden outline-none transition-opacity focus-visible:z-10 focus-visible:ring-4 focus-visible:ring-purple-400",
                winDim && "opacity-40"
              )}
              style={{ borderRadius: WINDOW_RADIUS }}
            >
              {windowInner}
            </button>
          ) : (
            <span
              aria-hidden={!!win}
              aria-label={win ? undefined : `${winDef.aria}: tom`}
              role={win ? undefined : "img"}
              className={cn("absolute inset-0 overflow-hidden", win?.ghost && "opacity-70")}
              style={{ borderRadius: WINDOW_RADIUS }}
            >
              {windowInner}
            </span>
          )}
          {/* fönsterkarmen */}
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute border-solid border-[#7a4a24] shadow-[0_2px_4px_rgb(0_0_0/0.25)] dark:border-[#4b2f19]",
              win?.ghost && "outline-2 outline-offset-2 outline-dashed outline-amber-400"
            )}
            style={{
              inset: U(-5),
              borderWidth: U(5),
              borderRadius: WINDOW_RADIUS,
            }}
          />
        </div>

        {BACK_ROW.map(renderSlot)}
        <Planks />
        {FRONT_ROW.map(renderSlot)}

        {/* Nabu på sin stubbe */}
        <Perch />
        <button
          type="button"
          aria-label={quizWords.length ? "Nabu – tryck så frågar jag något" : "Nabu"}
          disabled={!interactive || mode === "pynta"}
          onClick={tapNabu}
          className={cn(
            "absolute flex items-end justify-center rounded-full leading-none outline-none transition-opacity focus-visible:ring-4 focus-visible:ring-purple-400",
            placing && "opacity-60"
          )}
          style={{
            left: U(NABU_PERCH.x),
            top: U(NABU_PERCH.y),
            width: U(NABU_PERCH.size),
            height: U(NABU_PERCH.size * 1.05),
            transform: "translate(-50%, -100%)",
          }}
        >
          <span className="block leading-none" style={{ fontSize: U(NABU_PERCH.size) }}>
            <Mascot key={cheering ? `c${cheer}` : "idle"} mood={cheering ? "cheer" : "idle"} wear={wear} />
          </span>
        </button>

        {/* Barken runt öppningen */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 shadow-[inset_0_0_0_calc(var(--u)*7)_#5b391b,inset_0_0_0_calc(var(--u)*9)_#a46c38,inset_0_calc(var(--u)*8)_calc(var(--u)*26)_rgb(0_0_0/0.32)] dark:shadow-[inset_0_0_0_calc(var(--u)*7)_#33200f,inset_0_0_0_calc(var(--u)*9)_#6b4526,inset_0_calc(var(--u)*8)_calc(var(--u)*26)_rgb(0_0_0/0.5)]",
            ARCH
          )}
        />
        {/* Lampans sken – efter barken, så att lampan lyser upp hela hålet (går inte att trycka på) */}
        {lights.map((slot) => {
          const def = NEST_SLOTS[slot];
          const cy = lightCenter(def);
          const pos = {
            "--gx": `${(def.x / 400) * 100}%`,
            "--gy": `${(cy / 300) * 100}%`,
          } as CSSProperties;
          const moon = at(slot)?.id === "light-moon";
          return (
            <span
              key={slot}
              aria-hidden
              className="nest-glow absolute inset-0"
              style={
                moon
                  ? {
                      ...pos,
                      background: `radial-gradient(circle at var(--gx) var(--gy), rgb(147 197 253 / ${dark ? 0.42 : 0.2}), transparent 60%)`,
                    }
                  : pos
              }
            />
          );
        })}
        {stringLit && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 mix-blend-screen"
            style={{
              background: `radial-gradient(ellipse 48% 16% at 50% 13%, rgb(255 214 120 / ${dark ? 0.4 : 0.16}), transparent)`,
            }}
          />
        )}
      </div>

      {/* Pratbubblor och popover ligger utanför klippningen */}
      <AnimatePresence>
        {nabuTalks && (
          <SpeechBubble
            key={nabuLine ?? `q${quiz?.step}${quiz && "id" in quiz ? quiz.id : ""}`}
            x={NABU_PERCH.x}
            y={headTop}
          >
            {nabuLine ? (
              <span className="text-base font-bold">{nabuLine}</span>
            ) : quiz ? (
              <QuizBubble quiz={quiz} lang={lang} />
            ) : null}
          </SpeechBubble>
        )}
        {bubble && mode !== "pynta" && (
          <SpeechBubble key={bubble.n} x={NEST_SLOTS[bubble.slot].x} y={edgesOf(NEST_SLOTS[bubble.slot]).top - 2}>
            {bubble.node}
          </SpeechBubble>
        )}
      </AnimatePresence>

      {menuOpen && menu && (
        <StowMenu
          popRef={popRef}
          slot={menu}
          item={at(menu)}
          u={u}
          onStow={() => {
            setMenu(null);
            onStow(menu);
          }}
          onLeave={() => setMenu(null)}
        />
      )}
    </div>
  );
}

// ── Delar ───────────────────────────────────────────────────────────────

/** En pratbubbla vars spets pekar ner på (x, y). Rörelsen blir bara toning vid reducerad rörelse. */
function SpeechBubble({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  const cx = Math.min(352, Math.max(48, x));
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className="pointer-events-none absolute z-20"
      style={{ left: U(cx), top: U(y) }}
    >
      <div className="-translate-x-1/2 -translate-y-full">
        <div className="relative max-w-[12rem] rounded-2xl bg-white px-3 py-2 text-center text-zinc-800 shadow-lg ring-1 ring-black/5 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10">
          {children}
          <span
            aria-hidden
            className="absolute -bottom-1.5 h-3 w-3 -translate-x-1/2 rotate-45 bg-white dark:bg-zinc-800"
            style={{ left: `calc(50% + ${U(x - cx)})` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/** Bilden som ledtråd: emoji, siffra (aldrig keycap) eller ordklicken om enheten saknar emojin. */
function Cue({ concept, big }: { concept: Concept; big: boolean }) {
  const n = numberOf(concept.id);
  if (n !== null)
    return (
      <span
        dir="ltr"
        className={cn("font-black leading-none text-indigo-600 dark:text-indigo-300", big ? "text-5xl" : "text-3xl")}
      >
        {n}
      </span>
    );
  if (showsEmoji(concept.emoji))
    return <span className={cn("leading-none", big ? "text-5xl" : "text-3xl")}>{concept.emoji}</span>;
  return <Sticker id={`w:${concept.id}`} decorative className={big ? "text-5xl" : "text-3xl"} />;
}

function QuizBubble({ quiz, lang }: { quiz: Quiz; lang: LangCode }) {
  if (quiz.step === "hello") return <span className="text-base font-bold">Hoo-hoo! Vad mysigt det är här!</span>;
  const p = parseStickerId(quiz.id);
  if (p?.family !== "word") return null;
  const c = p.concept;
  if (quiz.step === "ask")
    return (
      <span className="flex flex-col items-center gap-1">
        <span className="text-sm font-bold text-purple-600 dark:text-purple-300">Minns du?</span>
        <Cue concept={c} big />
      </span>
    );
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span className="flex items-center gap-2">
        <Cue concept={c} big={false} />
        {quiz.step === "cheer" && <span className="text-3xl leading-none">🎉</span>}
      </span>
      <span lang={lang} dir={getLanguage(lang).dir} className="text-2xl font-black">
        {labelOf(c, lang)}
      </span>
      {lang !== "sv" && <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{c.labels.sv}</span>}
      {quiz.step === "cheer" && (
        <span className="text-sm font-bold text-purple-600 dark:text-purple-300">Hoo-hoo!</span>
      )}
    </span>
  );
}

/** Popover i Pynta: [Ställ undan] för saken man tryckt på. */
function StowMenu({
  popRef,
  slot,
  item,
  u,
  onStow,
  onLeave,
}: {
  popRef: Ref<HTMLDivElement>;
  slot: SceneSlot;
  item: NestItem | null;
  u: number;
  onStow: () => void;
  /** Fokus lämnade popovern (Tab) – den stängs, så att den aldrig står öppen bakom fokus. */
  onLeave: () => void;
}) {
  if (!item || !u) return null;
  const def = NEST_SLOTS[slot];
  const { top, bottom } = edgesOf(def);
  const above = top > 120;
  const half = 92 / u; // halva popoverns bredd (184 px) i scenens enheter
  const cx = Math.min(400 - half, Math.max(half, def.x));
  return (
    <div
      ref={popRef}
      role="dialog"
      aria-label={item.name}
      onBlur={(e) => {
        // bara när fokus faktiskt flyttar till något annat (Tab); ett tryck utanför sköts av pointerdown
        const to = e.relatedTarget as Node | null;
        if (to && !e.currentTarget.contains(to)) onLeave();
      }}
      className="absolute z-30 w-[184px] rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10"
      style={{
        left: U(cx),
        top: U(above ? top - 4 : bottom + 4),
        transform: `translate(-50%, ${above ? "-100%" : "0"})`,
      }}
    >
      <p className="px-1 pb-1.5 text-center text-sm font-bold">{item.name}</p>
      <button
        type="button"
        onClick={onStow}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-100 font-bold text-amber-900 outline-none focus-visible:ring-4 focus-visible:ring-purple-400 motion-safe:active:scale-95 dark:bg-amber-900/40 dark:text-amber-100"
      >
        📦 Ställ undan
      </button>
    </div>
  );
}
