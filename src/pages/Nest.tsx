import { MotionConfig } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ItemId, NestItem, NestSlot } from "../types";
import { cn } from "../lib/cn";
import { balanceOf, isOwnedItem } from "../lib/rewards";
import { playBuy, playPlace } from "../lib/sfx";
import { ITEM_BY_ID, slotsFor, type SceneSlot } from "../data/nestItems";
import { useSpeech } from "../hooks/useSpeech";
import { useNest } from "../stores/useNest";
import { useSettings } from "../stores/useSettings";
import { BackButton } from "../components/BackButton";
import { BottomNav } from "../components/BottomNav";
import { StarPouch } from "../components/StarPouch";
import { ItemSheet } from "../components/nest/ItemSheet";
import { NestDrawer } from "../components/nest/NestDrawer";
import { NestIntro } from "../components/nest/NestIntro";
import { NestScene } from "../components/nest/NestScene";
import {
  isWear,
  itemAt,
  placedLine,
  shopSpeech,
  starsWord,
  targetSlot,
  type DrawerTab,
  type NestMode,
  type NestSceneHandle,
} from "../components/nest/nestUi";

/**
 * Nabus bo (/nest): ett ekträdshål som barnet pyntar med saker från
 * Stjärnpåsen och gåvor från klistermärkesboken.
 * - Titta: tryck på saker (de säger sitt namn och gör sitt trick) och på Nabu.
 * - Pynta: ställ fram, flytta eller ställ undan det du äger.
 * - Stjärnboden (om föräldern har den på): titta gratis, köp, ångra, lämna
 *   tillbaka eller önska. Påsen fylls bara av nya bästa stjärnor och stjärnorna
 *   på stigarna rörs aldrig.
 * Allt är dir="ltr" (koordinaterna speglas aldrig); bara ord på andra språk får
 * sin egen riktning. Rörelser följer enhetens "reducera rörelse".
 */

const MODES: { id: NestMode; label: string; icon: string }[] = [
  { id: "titta", label: "Titta", icon: "👀" },
  { id: "pynta", label: "Pynta", icon: "🎨" },
  // mjukt bindestreck: på en smal mobil "Stjärn-/boden" på två rader i stället för att klippas
  { id: "bod", label: "Stjärn\u00ADboden", icon: "🌟" },
];

/** Det senaste köpet, så att Ångra kan ställa allt som det var (även önskan). */
type LastBuy = { id: ItemId; slot: NestSlot; displaced: ItemId | null; wished: boolean };

const reducedMotion = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

export default function Nest() {
  const { speak } = useSpeech();
  const shopOn = useSettings((s) => s.shopOn);
  const introDone = useNest((s) => s.introDone);
  const welcome = useNest((s) => s.welcome ?? 0);
  const balance = useNest((s) => balanceOf(s));
  const wish = useNest((s) => s.wish);
  const slots = useNest((s) => s.slots);
  const owned = useNest((s) => s.owned);

  const [modeChoice, setModeChoice] = useState<NestMode>("titta");
  const mode: NestMode = !introDone ? "titta" : !shopOn && modeChoice === "bod" ? "titta" : modeChoice;
  const [tab, setTab] = useState<DrawerTab>("nabu");
  const [selectedId, setSelectedId] = useState<ItemId | null>(null);
  const [sheetId, setSheetId] = useState<ItemId | null>(null);
  const [live, setLive] = useState("");
  const [nabuLine, setNabuLine] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const sceneRef = useRef<NestSceneHandle>(null);
  const sceneBox = useRef<HTMLDivElement>(null);
  const modeBox = useRef<HTMLDivElement>(null);
  const drawerBox = useRef<HTMLDivElement>(null);
  const focusModes = useRef(false); // introt är klart: fokus till lägesväljaren
  const revealDrawer = useRef(false); // barnet bytte till Pynta/Stjärnboden: visa lådans kort
  const lastBuy = useRef<LastBuy | null>(null);
  const lineTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(lineTimer.current), []);

  // Boet börjar alltid överst (sidbyten behåller annars förra sidans scroll)
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Luvan (som hade fokus) försvinner med introt – fokus till "Titta" i stället
  useEffect(() => {
    if (!introDone || !focusModes.current) return;
    focusModes.current = false;
    modeBox.current?.querySelector<HTMLButtonElement>("button[aria-pressed='true']")?.focus({ preventScroll: true });
  }, [introDone]);

  const selected = mode === "pynta" && selectedId ? (ITEM_BY_ID.get(selectedId) ?? null) : null;
  const sheetItem = mode === "bod" && sheetId ? (ITEM_BY_ID.get(sheetId) ?? null) : null;
  // Gratis förhandsvisning: bara Stjärnbodens saker som barnet inte äger
  const preview =
    sheetItem && sheetItem.via === "shop" && !isOwnedItem({ owned }, sheetItem.id)
      ? { item: sheetItem, slot: targetSlot(sheetItem, slots) }
      : null;
  const wishItem = shopOn && wish ? ITEM_BY_ID.get(wish) : undefined;

  /** Skärmläsarens rad (samma text två gånger läses ändå upp). */
  const announce = useCallback((msg: string) => setLive((s) => (s === msg ? `${msg} ` : msg)), []);

  /** Scenen ska synas när barnet väljer något (där lyser platserna/förhandsvisningen). */
  const seeScene = () =>
    sceneBox.current?.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });

  // Esc släpper den valda saken i Pynta
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  // Nytt läge: lådans första kort rullas fram ovanför menyn (liten mobil och liggande
  // mobil – annars syns bara flikarna och barnet vet inte att sidan går att rulla).
  // "nearest": står korten redan i bild (surfplatta) rör sig ingenting.
  useEffect(() => {
    if (!revealDrawer.current) return;
    revealDrawer.current = false;
    drawerBox.current
      ?.querySelector<HTMLElement>("[role='tabpanel'] li, [role='tabpanel'] > p")
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
  }, [mode]);

  const switchMode = (m: NestMode) => {
    sceneRef.current?.quiet(); // Tittas sekvenser (kulramen, globen …) pratar inte över nästa läge
    revealDrawer.current = m !== "titta" && m !== mode;
    setModeChoice(m);
    setSelectedId(null);
    setSheetId(null);
  };

  // ── Pynta ──

  const pickPynta = (item: NestItem) => {
    const s = useNest.getState();
    const valid = slotsFor(item);
    sceneRef.current?.quiet();
    speak(item.name, "sv");
    if (valid.length === 1) {
      // Hatt, hals, fönster, matta och girlang: på direkt – ett tryck till tar av
      const slot = valid[0];
      setSelectedId(null);
      if (s.slots[slot] === item.id) {
        s.stow(slot);
        playPlace();
        announce(isWear(item) ? `Nabu tog av sig ${item.name}.` : `${item.name} ligger nu i förrådet.`);
        return;
      }
      s.place(item.id, slot);
      playPlace();
      sceneRef.current?.bump(slot);
      seeScene();
      announce(placedLine(item, slot));
      return;
    }
    if (selectedId === item.id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(item.id);
    seeScene();
    announce(`Välj en plats i boet för ${item.name}.`);
  };

  const placeSelected = (slot: SceneSlot) => {
    if (!selected) return;
    const s = useNest.getState();
    const before = itemAt(s, slot);
    if (before?.id !== selected.id) s.place(selected.id, slot);
    playPlace();
    sceneRef.current?.bump(slot);
    setSelectedId(null);
    const moved = before && before.id !== selected.id ? ` ${before.name} ligger nu i förrådet.` : "";
    announce(placedLine(selected, slot) + moved);
  };

  const stowSlot = (slot: SceneSlot) => {
    const s = useNest.getState();
    const item = itemAt(s, slot);
    if (!item) return;
    s.stow(slot);
    playPlace();
    announce(`${item.name} ligger nu i förrådet.`);
    // Knappen i scenen försvann: fokus till sakens kort i lådan (annars scenen)
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active && active !== document.body) return;
      const card = drawerBox.current?.querySelector<HTMLElement>(`[data-item="${item.id}"]`);
      (card ?? sceneBox.current?.querySelector<HTMLElement>("[data-scene]"))?.focus({ preventScroll: true });
    });
  };

  // ── Stjärnboden ──

  const pickShop = (item: NestItem) => {
    const s = useNest.getState();
    lastBuy.current = null;
    setSheetId(item.id);
    seeScene();
    sceneRef.current?.quiet();
    speak(shopSpeech(item, isOwnedItem(s, item.id), balanceOf(s)), "sv");
  };

  const closeSheet = useCallback(() => setSheetId(null), []);

  const speakSheet = () => {
    if (!sheetItem) return;
    const s = useNest.getState();
    speak(shopSpeech(sheetItem, isOwnedItem(s, sheetItem.id), balanceOf(s)), "sv");
  };

  // Köpet avgörs i storen (atomiskt); sedan ställs saken fram på första lediga
  // giltiga plats (annars den första – det som stod där flyttar till förrådet).
  const buyItem = (): boolean => {
    if (!sheetItem) return false;
    const s = useNest.getState();
    const slot = targetSlot(sheetItem, s.slots);
    const displaced = s.slots[slot] ?? null;
    const wished = s.wish === sheetItem.id; // buy() tar bort önskan – Ångra ger tillbaka den
    if (!s.buy(sheetItem.id)) return false;
    useNest.getState().place(sheetItem.id, slot);
    lastBuy.current = { id: sheetItem.id, slot, displaced, wished };
    playBuy();
    sceneRef.current?.bump(slot);
    const friend = sheetItem.kind === "friend";
    speak(friend ? `${sheetItem.name} flyttar in!` : `Nu är ${sheetItem.name} din!`, "sv");
    announce(
      `Du ${friend ? "bjöd in" : "köpte"} ${sheetItem.name}. ${starsWord(balanceOf(useNest.getState()))} kvar i påsen.`
    );
    return true;
  };

  const undoBuy = () => {
    const b = lastBuy.current;
    if (!b) return;
    const s = useNest.getState();
    s.returnItem(b.id);
    if (b.displaced) s.place(b.displaced, b.slot); // det som flyttades undan kommer tillbaka
    if (b.wished) s.setWish(b.id); // och önskan, om saken var önskad
    lastBuy.current = null;
    playPlace();
    if (b.displaced) sceneRef.current?.bump(b.slot);
    announce(`Ångrat. ${starsWord(balanceOf(useNest.getState()))} i påsen.`);
  };

  const returnSheet = () => {
    if (!sheetItem) return;
    useNest.getState().returnItem(sheetItem.id);
    playPlace();
    speak(`Du fick tillbaka ${starsWord(sheetItem.price)} i påsen.`, "sv");
    announce(`${sheetItem.name} är tillbaka i Stjärnboden. ${starsWord(balanceOf(useNest.getState()))} i påsen.`);
  };

  const toggleWish = () => {
    if (!sheetItem) return;
    const on = wish === sheetItem.id;
    useNest.getState().setWish(on ? null : sheetItem.id);
    if (on) return announce("Ingen önskan just nu.");
    speak(`Du önskar dig ${sheetItem.name}.`, "sv");
    announce(`Du önskar dig ${sheetItem.name}.`);
  };

  // ── Påsen och introt ──

  const tapPouch = () => {
    setShake((n) => n + 1);
    speak(`Du har ${starsWord(balance)} i påsen.`, "sv");
  };

  const dressUp = () => {
    const s = useNest.getState();
    s.place("hat-luva", "hat");
    playPlace();
    focusModes.current = true;
    s.finishIntro();
    sceneRef.current?.bump("hat");
    const line = "Tack! Nu är jag jättefin!";
    setNabuLine(line);
    speak(line, "sv");
    announce("Nabu har på sig Nabus luva.");
    window.clearTimeout(lineTimer.current);
    lineTimer.current = window.setTimeout(() => setNabuLine(null), 3500);
  };

  const modes = MODES.filter((m) => m.id !== "bod" || shopOn);
  const wishText = wishItem && (
    <>
      💛 {wishItem.name} –{" "}
      <span dir="ltr">
        {Math.min(balance, wishItem.price)} av {wishItem.price}
      </span>
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
      <main dir="ltr" className="mx-auto max-w-3xl px-3 pb-nav pt-4 sm:px-6 sm:pt-6 side:max-w-6xl short:pt-2">
        <header className="flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-2xl font-black">Nabus bo</h1>
          {shopOn && (
            <button
              type="button"
              onClick={tapPouch}
              aria-label={`${starsWord(balance)} i påsen`}
              className="ml-auto inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-4 font-bold shadow outline-none focus-visible:ring-4 focus-visible:ring-purple-400 dark:bg-zinc-800"
            >
              <span key={shake} className={cn("inline-block", shake > 0 && "animate-pouch-shake")}>
                <StarPouch className="text-2xl" />
              </span>
              <span className="whitespace-nowrap">
                <span dir="ltr" className="font-black">
                  {balance}
                </span>{" "}
                i påsen
              </span>
            </button>
          )}
        </header>

        {/* Önskan syns bara här i boet (liggande: i spalten bredvid scenen) */}
        {wishItem && (
          <p className="mt-2 text-center text-sm font-bold text-yellow-800 side:hidden dark:text-yellow-200">
            {wishText}
          </p>
        )}

        <div className="nest-layout">
        <div ref={sceneBox} className="nest-scene mt-3 scroll-mt-3">
          <NestScene
            ref={sceneRef}
            mode={mode}
            interactive={introDone}
            selected={selected}
            preview={preview}
            nabuLine={nabuLine}
            onPlace={placeSelected}
            onStow={stowSlot}
            announce={announce}
          />
        </div>

        <div className="min-w-0">
        {wishItem && (
          <p className="mt-3 hidden text-center text-sm font-bold text-yellow-800 side:block dark:text-yellow-200">
            {wishText}
          </p>
        )}
        {!introDone ? (
          <NestIntro welcome={welcome} shopOn={shopOn} onDone={dressUp} />
        ) : (
          <>
            <div
              ref={modeBox}
              role="group"
              aria-label="Vad vill du göra?"
              className={cn(
                "mx-auto mt-4 grid max-w-xl gap-1.5 rounded-[1.75rem] bg-white/80 p-1.5 shadow dark:bg-zinc-800/80 side:mt-3",
                modes.length === 3 ? "grid-cols-3" : "grid-cols-2"
              )}
            >
              {modes.map((m) => {
                const on = m.id === mode;
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => switchMode(m.id)}
                    className={cn(
                      // Smal mobil och spalten bredvid scenen (liggande, side:): ikonen över texten,
                      // så att "Stjärnboden" ryms på en rad utan att brytas
                      "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-3xl px-1 py-1 text-sm font-bold outline-none transition-colors focus-visible:ring-4 focus-visible:ring-purple-400 sm:flex-row sm:gap-1.5 sm:px-2 sm:text-base side:flex-col side:gap-0.5 short:text-sm",
                      on ? "bg-purple-500 text-white shadow" : "text-zinc-600 dark:text-zinc-300"
                    )}
                  >
                    <span aria-hidden className="text-lg leading-none sm:text-xl short:text-lg">
                      {m.icon}
                    </span>
                    <span lang="sv" className="min-w-0 text-center leading-tight">
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div ref={drawerBox} className="mx-auto max-w-xl">
              {mode === "titta" && (
                <p className="mt-3 rounded-3xl bg-white/70 px-4 py-3 text-center text-sm font-semibold text-zinc-600 dark:bg-zinc-800/70 dark:text-zinc-300">
                  👆 Tryck på sakerna i boet – och på Nabu!
                </p>
              )}
              {mode === "pynta" && (
                <NestDrawer
                  variant="pynta"
                  tab={tab}
                  onTab={setTab}
                  active={selectedId}
                  onPick={pickPynta}
                  onCancel={() => setSelectedId(null)}
                />
              )}
              {mode === "bod" && (
                <NestDrawer variant="bod" tab={tab} onTab={setTab} active={sheetId} onPick={pickShop} />
              )}
            </div>
          </>
        )}
        </div>
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {live}
        </p>

        {sheetItem && (
          <ItemSheet
            key={sheetItem.id}
            item={sheetItem}
            onClose={closeSheet}
            onBuy={buyItem}
            onUndo={undoBuy}
            onReturn={returnSheet}
            onWish={toggleWish}
            onSpeak={speakSheet}
          />
        )}

        <BottomNav />
      </main>
    </MotionConfig>
  );
}
