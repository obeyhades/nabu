import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion, type PanInfo } from "framer-motion";
import type { StickerId, StickerPageId } from "../types";
import { celebrate } from "../lib/celebrate";
import { cn } from "../lib/cn";
import { playLevelUp, playPeel, playStick } from "../lib/sfx";
import {
  badgeStatus,
  bookOrder,
  capitalize,
  centerOf,
  giftLine,
  heldParty,
  holdParty,
  isWordSticker,
  neighbours,
  pageCount,
  pageSlots,
  prefersReducedMotion,
  stickerVoice,
  trayFor,
  turnDir,
  type Pulse,
  type ShelfView,
} from "../lib/stickerBook";
import { ITEM_BY_ID } from "../data/nestItems";
import { PAGE_BY_ID, PAGE_OF_STICKER, stickerName, type BookPage } from "../data/stickers";
import { useSpeech } from "../hooks/useSpeech";
import { useProfile } from "../stores/useProfile";
import { useSettings } from "../stores/useSettings";
import { useStickers } from "../stores/useStickers";
import { BottomNav } from "../components/BottomNav";
import { BadgeShelf } from "../components/book/BadgeShelf";
import { FlyingSticker } from "../components/book/FlyingSticker";
import { Kuvertet } from "../components/book/Kuvertet";
import { NabuSays } from "../components/book/NabuSays";
import { PageHeader, type StripGroup } from "../components/book/PageHeader";
import { PageNav } from "../components/book/PageNav";
import { PageParty } from "../components/book/PageParty";
import { StickerShelf } from "../components/book/StickerShelf";
import { WordCardSheet } from "../components/book/WordCardSheet";

const HINT = "Titta efter formen!";

type Point = { x: number; y: number };
type Flight = { id: StickerId; from: Point; to: Point; n: number };
/** Vart fokus ska efter en bläddring (sidan monteras om, så fokus annars hamnar på <body>). */
type TurnFocus = "next" | "prev" | "tray";
type TurnState = { turn?: number; focus?: TurnFocus } | null;

const SWIPE_SLOP = 10; // px innan ett drag räknas som svep (små barnfingrar glider)
const SWIPE_MIN = 40; // px som ett snabbt svep minst måste gå för att bläddra
const CARD_MS = 6000; // så länge 🔍-knappen till ordkortet visas

/**
 * En sida i klistermärkesboken (/stickers/:pageId). Varje sida får en egen
 * instans (key = sidan), så allt lyft/miss/fest börjar om när man bläddrar.
 */
export default function StickerPage() {
  const { pageId = "" } = useParams();
  const page = PAGE_BY_ID.get(pageId);
  if (!page) return <Navigate to="/stickers" replace />;
  return <BookPageView key={page.id} page={page} />;
}

/**
 * Inklistringen (bara tryck behövs, WCAG 2.5.7):
 * 1. Tryck på ett märke i kuvertet: det lyfts, ordet sägs, dess hylla tonas och
 *    tomma platser ljusnar (stilla, ingen puls).
 * 2. Rätt plats: märket flyger dit, smackar fast, ordet sägs och `place()` körs.
 * 3. Fel plats: den vickar och säger sitt eget ord; lyftet ligger kvar. Efter
 *    2 miss får rätt plats en guldring och Nabu säger "Titta efter formen!".
 * 4. Tryck på det lyfta märket igen eller Esc: släpp.
 * 5. "Sätt in alla" (≥3 väntar): en kaskad, 120 ms mellan märkena, bara smackljud.
 * Ett inklistrat märke gör sitt trick och säger sitt ord; ord får en knapp till ordkortet.
 * Bläddra med ‹ › eller svep (av medan ett märke är lyft).
 * Blev sidan just klar spelas festen innan någon bläddring går igenom – och
 * lämnas sidan ändå (tillbaka, menyn) visas festen nästa gång boken öppnas.
 */
function BookPageView({ page }: { page: BookPage }) {
  const owned = useStickers((s) => s.owned);
  const met = useStickers((s) => s.met);
  const donePages = useStickers((s) => s.donePages);
  const place = useStickers((s) => s.place);
  const placeAll = useStickers((s) => s.placeAll);
  const stars = useProfile((s) => s.stars);
  const lang = useSettings((s) => s.lang);
  const { speak } = useSpeech();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const { here, others } = useMemo(() => trayFor(owned, page.id), [owned, page.id]);
  const order = useMemo(() => bookOrder(owned, lang, page.id), [owned, lang, page.id]);
  const { prev, next } = neighbours(order, page.id);
  const badges = useMemo(() => (page.derived ? badgeStatus(stars) : []), [page.derived, stars]);
  const count = pageCount(page, owned, badges);
  const gift = page.gift ? ITEM_BY_ID.get(page.gift) : undefined;
  const complete = donePages.includes(page.id);
  const turnState = location.state as TurnState;
  const turn = turnState?.turn ?? 0;

  // ?place=id: märket kom från kuvertet på en annan sida (eller indexet) – lyft det direkt
  const placeParam = params.get("place");
  const [lifted, setLifted] = useState<StickerId | null>(() =>
    placeParam && trayFor(useStickers.getState().owned, page.id).here.includes(placeParam) ? placeParam : null
  );
  const [misses, setMisses] = useState(0);
  const [wiggle, setWiggle] = useState<Pulse | null>(null);
  const [landed, setLanded] = useState<Pulse | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [cascade, setCascade] = useState<ReadonlyMap<StickerId, number> | null>(null);
  const [wave, setWave] = useState(0);
  const [plays, setPlays] = useState<Record<StickerId, number>>({});
  const [card, setCard] = useState<StickerId | null>(null); // knappen till ordkortet
  const [sheet, setSheet] = useState<StickerId | null>(null); // öppet ordkort
  const [party, setParty] = useState(false);
  const [announce, setAnnounce] = useState("");

  const spots = useRef(new Map<StickerId, HTMLElement>());
  const trayEls = useRef(new Map<StickerId, HTMLElement>());
  const main = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const cardTimer = useRef<number | undefined>(undefined);
  const sheetOpen = useRef(false);
  const pulse = useRef(0);
  const swiped = useRef(false);
  const partyDue = useRef(false); // sidan blev klar, festen har inte börjat än
  const consumedPlace = useRef(false);
  const turnFocus = useRef<TurnFocus | null>(turnState?.focus ?? null);
  const [hintSide, setHintSide] = useState<"left" | "right">("left");

  // Ett lyft gäller bara så länge märket fortfarande väntar på den här sidan
  const liftedId = lifted && here.includes(lifted) ? lifted : null;
  const hintId = misses >= 2 ? liftedId : null;

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(cardTimer.current);
      // Sidan lämnades innan festen hann börja: den väntar till nästa gång
      if (partyDue.current) holdParty(page.id);
    },
    [page.id]
  );

  // Varje sida börjar överst (bläddringsknapparna sitter längst ner, och
  // routern behåller annars scrollen). ?place-märket visar sin plats efteråt.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const nextN = () => ++pulse.current;

  const say = (id: StickerId) => {
    const v = stickerVoice(id, lang);
    if (v) speak(v.text, v.lang, v.conceptId);
  };

  const registerSpot = (id: StickerId, el: HTMLElement | null) => {
    if (el) spots.current.set(id, el);
    else spots.current.delete(id);
  };
  const registerTray = (id: StickerId, el: HTMLElement | null) => {
    if (el) trayEls.current.set(id, el);
    else trayEls.current.delete(id);
  };

  /** Visa platsen (kuvertet täcker nederkanten; platserna har scroll-marginal för det). */
  const showSlot = (id: StickerId, block: ScrollLogicalPosition) => {
    spots.current
      .get(id)
      ?.closest("button")
      ?.scrollIntoView({ block, inline: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const turnTo = (target: StickerPageId, placeId?: StickerId, focus?: TurnFocus) => {
    // Sidan blev nyss klar: festen först (den skulle annars försvinna med sidan)
    if (partyDue.current) {
      startParty();
      return;
    }
    const q = placeId ? `?place=${encodeURIComponent(placeId)}` : "";
    const state: TurnState = { turn: turnDir(page.id, target), focus };
    navigate(`/stickers/${target}${q}`, { replace: true, state });
  };

  const drop = () => {
    setLifted(null);
    setMisses(0);
  };

  const announcePlaced = (what: string) => {
    const after = pageCount(page, useStickers.getState().owned, badges);
    setAnnounce(`${what} på ${page.title}, ${after.done} av ${after.total}`);
  };

  // ── Festen ──
  // Bara en gång per klar sida. Gamla pulser töms först: vågen monterar om
  // märkena, och då skulle hopp, smack och vickningar spelas om.
  const startParty = () => {
    if (!partyDue.current) return;
    partyDue.current = false;
    setPlays({});
    setLanded(null);
    setWiggle(null);
    setCascade(null);
    setWave((w) => w + 1);
    setParty(true);
    celebrate();
    playLevelUp();
    speak(page.praise, "sv");
    setAnnounce(`Sidan ${page.title} är klar! ${page.praise}${gift ? ` ${giftLine(gift)}` : ""}`);
  };

  // ── Kuvertet ──
  const pick = (id: StickerId) => {
    const target = PAGE_OF_STICKER.get(id);
    if (!target) return;
    if (target !== page.id) {
      turnTo(target, id, "tray"); // sidan bläddrar själv innan matchningen
      return;
    }
    if (liftedId === id) {
      drop();
      return;
    }
    setLifted(id);
    setMisses(0);
    setCard(null);
    playPeel();
    say(id);
    showSlot(id, "nearest");
  };

  const pickOthers = () => {
    const first = others[0];
    const target = first ? PAGE_OF_STICKER.get(first) : undefined;
    if (first && target) turnTo(target, first, "tray");
  };

  // ── Platserna ──
  const land = (id: StickerId) => {
    setFlight((f) => (f?.id === id ? null : f));
    setLanded({ id, n: nextN() });
    playStick();
    if (partyDue.current) later(380, startParty);
  };

  const placeHere = (id: StickerId) => {
    // mät före inklistringen: märket i kuvertet och platsens mitt
    const from = centerOf(trayEls.current.get(id));
    const to = centerOf(spots.current.get(id));
    const n = nextN();
    if (from && to) setFlight({ id, from, to, n });
    const done = place(id);
    if (done) partyDue.current = true; // direkt: en bläddring under flygturen får inte tappa festen
    drop();
    setCard(null);
    say(id);
    announcePlaced(`${capitalize(stickerName(id))} sitter nu`);
    if (!from || !to) land(id);
  };

  const miss = (id: StickerId) => {
    setWiggle({ id, n: nextN() });
    say(id);
    const m = misses + 1;
    setMisses(m);
    if (m === 2 && liftedId) {
      setAnnounce(HINT);
      // Nabus bubbla på andra sidan om platsen, så att den aldrig täcker den
      const r = spots.current.get(liftedId)?.getBoundingClientRect();
      setHintSide(r && r.left + r.width / 2 < window.innerWidth / 2 ? "right" : "left");
      showSlot(liftedId, "center");
      later(1100, () => speak(HINT, "sv"));
    }
  };

  const tapSlot = (id: StickerId) => {
    if (swiped.current) return; // ett svep är inget tryck
    if (liftedId) {
      if (id === liftedId) placeHere(id);
      else miss(id);
      return;
    }
    say(id);
    if (owned[id]?.p !== 1) return;
    // levande klistermärke: tricket, och för ord en knapp till ordkortet en stund
    setPlays((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
    if (isWordSticker(id)) {
      setCard(id);
      armCard(id);
    }
  };

  // ── Knappen till ordkortet ──
  // Försvinner efter en stund – men aldrig medan den har fokus eller pekaren,
  // och inte medan ordkortet är öppet (fokus ska kunna gå tillbaka till den).
  const armCard = (id: StickerId) => {
    window.clearTimeout(cardTimer.current);
    cardTimer.current = window.setTimeout(() => setCard((c) => (c === id ? null : c)), CARD_MS);
  };
  const holdCard = () => window.clearTimeout(cardTimer.current);
  const releaseCard = (id: StickerId) => {
    if (!sheetOpen.current) armCard(id);
  };
  const openCard = (id: StickerId) => {
    holdCard();
    sheetOpen.current = true;
    setSheet(id);
  };
  const closeCard = () => {
    sheetOpen.current = false;
    if (sheet) armCard(sheet);
    setSheet(null);
  };
  // Fanns 🔍-knappen inte kvar: tillbaka till märkets plats
  const restoreCardFocus = () => {
    const id = sheet;
    if (id) spots.current.get(id)?.closest("button")?.focus({ preventScroll: true });
  };

  const placeAllHere = () => {
    const ids = pageSlots(page).filter((id) => here.includes(id));
    if (ids.length < 3) return;
    // "Sätt in alla" försvinner med märkena: fokus till första platsen i stället för <body>
    if (document.activeElement?.closest("[data-place-all]"))
      spots.current.get(ids[0])?.closest("button")?.focus({ preventScroll: true });
    // kaskaden sätts före skrivningen så att märkena föds osynliga och landar i tur och ordning
    setCascade(new Map(ids.map((id, i) => [id, i])));
    setFlight(null);
    drop();
    setCard(null);
    const done = placeAll(page.id);
    if (done) partyDue.current = true;
    ids.forEach((_, i) => later(i * 120 + 80, playStick));
    announcePlaced(`${ids.length} klistermärken sitter nu`);
    later(ids.length * 120 + 450, () => {
      setCascade(null);
      startParty(); // gör inget om sidan inte blev klar (eller festen redan började)
    });
  };

  // ── Svep ──
  // Ett drag blir ett svep först efter några px (annars är det ett tryck som
  // gled lite), och ett snabbt svep måste ändå gå en bit för att bläddra.
  const onSwipe = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE_SLOP) swiped.current = true;
  };
  const onSwipeEnd = (_: unknown, info: PanInfo) => {
    const w = body.current?.offsetWidth || window.innerWidth;
    const dx = info.offset.x;
    const vx = info.velocity.x;
    const far = Math.abs(dx) >= SWIPE_MIN;
    if ((dx < -w * 0.25 || (far && vx < -500 && dx < 0)) && next) turnTo(next.id);
    else if ((dx > w * 0.25 || (far && vx > 500 && dx > 0)) && prev) turnTo(prev.id);
    if (swiped.current)
      later(60, () => {
        swiped.current = false;
      });
  };

  // En fest som inte hann visas (sidan lämnades) spelas när sidan öppnas igen
  useEffect(() => {
    if (heldParty() !== page.id) return;
    holdParty(null);
    partyDue.current = true;
    startParty();
    // bara när sidan monteras
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efter en bläddring: fokus till samma knapp på den nya sidan (eller det
  // upplyfta märket i kuvertet), annars sidans rubrik – aldrig <body>
  useEffect(() => {
    const f = turnFocus.current;
    if (!f) return;
    turnFocus.current = null;
    const root = main.current;
    const heading = root?.querySelector<HTMLElement>("[data-page-heading]");
    const el =
      f === "tray"
        ? (placeParam ? trayEls.current.get(placeParam) : null)
        : (root?.querySelector<HTMLElement>(`[data-turn="${f}"]`) ?? root?.querySelector<HTMLElement>("[data-turn]"));
    (el ?? heading)?.focus({ preventScroll: true });
    // bara när sidan monteras
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Märket från ?place: säg ordet, visa platsen och städa adressen (en gång)
  useEffect(() => {
    if (!placeParam || consumedPlace.current) return;
    consumedPlace.current = true;
    setParams(
      (p) => {
        p.delete("place");
        return p;
      },
      { replace: true, state: location.state }
    );
    if (lifted !== placeParam) return;
    const id = placeParam;
    playPeel();
    const v = stickerVoice(id, lang);
    if (v) speak(v.text, v.lang, v.conceptId);
    requestAnimationFrame(() => {
      showSlot(id, "nearest");
      trayEls.current.get(id)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    // spärren gör att det bara händer en gång, även i StrictMode
  }, [placeParam, lifted, lang, speak, setParams, location.state]);

  // Esc släpper det lyfta märket (ordkortet och festen har egen Esc)
  useEffect(() => {
    if (!liftedId || sheet || party) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLifted(null);
        setMisses(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [liftedId, sheet, party]);

  const view: ShelfView = {
    lifted: liftedId,
    hint: hintId,
    flying: flight?.id ?? null,
    landed,
    wiggle,
    cascade,
    wave,
    plays,
    card,
  };

  const strip: StripGroup[] = page.derived
    ? [{ key: "marken", filled: badges.map((b) => b.lit) }]
    : page.shelves.map((s, i) => ({ key: `${i}`, band: s.band, filled: s.ids.map((id) => owned[id]?.p === 1) }));

  const poster = page.group === "bokstaver";
  const hasTray = here.length + others.length > 0;
  let offset = 0;

  return (
    <MotionConfig reducedMotion="user">
      <main ref={main} dir="ltr" className={cn("mx-auto max-w-3xl px-2 pt-6 sm:px-6", hasTray ? "pb-[190px]" : "pb-28")}>
        <div className="px-2 sm:px-0">
          <PageHeader page={page} done={count.done} total={count.total} strip={strip} gift={gift} complete={complete} />
        </div>

        {/* sidan bläddras in från rätt håll; innehållet går att svepa */}
        <motion.div
          initial={{ opacity: 0, x: turn * 56 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ x: { type: "spring", stiffness: 260, damping: 26 }, opacity: { duration: 0.2 } }}
        >
          <motion.div
            ref={body}
            drag={liftedId ? false : "x"}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDrag={onSwipe}
            onDragEnd={onSwipeEnd}
            style={{ touchAction: "pan-y" }}
            className={cn(
              "mt-4 space-y-3 rounded-3xl p-2 shadow-inner ring-1 ring-black/5 sm:p-4 dark:ring-white/10",
              `scene-${page.scene}`
            )}
          >
            {page.derived ? (
              <BadgeShelf badges={badges} onSay={setAnnounce} />
            ) : (
              page.shelves.map((shelf, i) => {
                const start = offset;
                offset += shelf.ids.length;
                return (
                  <StickerShelf
                    key={i}
                    shelf={shelf}
                    offset={start}
                    owned={owned}
                    met={met}
                    lang={lang}
                    poster={poster}
                    rtl={poster && page.lang === "ar" && !!shelf.ids[0]?.startsWith("l:")}
                    view={view}
                    onSlot={tapSlot}
                    onCard={openCard}
                    onCardHold={holdCard}
                    onCardRelease={releaseCard}
                    registerSpot={registerSpot}
                  />
                );
              })
            )}
          </motion.div>
        </motion.div>

        <PageNav prev={prev} next={next} onTurn={(id) => turnTo(id, undefined, id === next?.id ? "next" : "prev")} />

        <p role="status" aria-live="polite" className="sr-only">
          {announce}
        </p>
      </main>

      <Kuvertet
        here={here}
        others={others}
        owned={owned}
        lang={lang}
        lifted={liftedId}
        canPlaceAll={!page.derived && here.length >= 3}
        onPick={pick}
        onOthers={pickOthers}
        onPlaceAll={placeAllHere}
        register={registerTray}
      />

      <AnimatePresence>
        {hintId && (
          <motion.div
            key="ledtrad"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              // ovanför kuvertet, på andra sidan om platsen; på en liggande telefon högst upp
              // (platsen centreras då i den låga skärmen och bubblan skulle annars täcka den)
              "pointer-events-none fixed bottom-[184px] z-30 max-w-[75%] [@media(max-height:500px)]:bottom-auto [@media(max-height:500px)]:top-2",
              hintSide === "right" ? "right-2" : "left-2"
            )}
          >
            <NabuSays size="text-4xl">
              <p>{HINT}</p>
            </NabuSays>
          </motion.div>
        )}
      </AnimatePresence>

      {flight && (
        <FlyingSticker
          key={flight.n}
          id={flight.id}
          from={flight.from}
          to={flight.to}
          o={owned[flight.id]}
          lang={lang}
          onLand={() => land(flight.id)}
        />
      )}

      <AnimatePresence>
        {sheet && (
          <WordCardSheet
            key={sheet}
            id={sheet}
            o={owned[sheet]}
            m={met[sheet.slice(2)]}
            lang={lang}
            onClose={closeCard}
            restoreFocus={restoreCardFocus}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{party && <PageParty key="fest" page={page} gift={gift} onClose={() => setParty(false)} />}</AnimatePresence>

      <BottomNav />
    </MotionConfig>
  );
}
