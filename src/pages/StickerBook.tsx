import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ChevronDown, ChevronRight, Volume2 } from "lucide-react";
import type { OwnedSticker, StickerId } from "../types";
import { celebrate } from "../lib/celebrate";
import { cn } from "../lib/cn";
import { playLevelUp } from "../lib/sfx";
import { trayIds } from "../lib/rewards";
import { badgeStatus, bookTitle, heldParty, holdParty, pageCount, posterLangs, type BadgeStatus } from "../lib/stickerBook";
import { ALPHABETS } from "../data/alphabets";
import { getLanguage } from "../data/languages";
import { ITEM_BY_ID } from "../data/nestItems";
import { BOOK_PAGES, PAGE_BY_ID, PAGE_OF_STICKER, type BookPage } from "../data/stickers";
import { useSpeech } from "../hooks/useSpeech";
import { useProfile } from "../stores/useProfile";
import { useSettings } from "../stores/useSettings";
import { useStickers } from "../stores/useStickers";
import { BackButton } from "../components/BackButton";
import { BottomNav } from "../components/BottomNav";
import { EnvelopeArt } from "../components/book/Kuvertet";
import { GiftArt } from "../components/book/GiftArt";
import { NabuSays } from "../components/book/NabuSays";
import { PageParty } from "../components/book/PageParty";
import { ProgressRing } from "../components/book/ProgressRing";

type Owned = Record<StickerId, OwnedSticker>;

const WORD_PAGES = BOOK_PAGES.filter((p) => p.group === "ord");
const POSTERS = BOOK_PAGES.filter((p) => p.group === "bokstaver");
const COUNT_PAGES = BOOK_PAGES.filter((p) => p.group === "rakna");
const BADGE_PAGES = BOOK_PAGES.filter((p) => p.group === "marken");

/**
 * Klistermärkesboken – indexet (/stickers). Bokens omslag med barnets avatar,
 * Nabus välkomst (en gång), kuvertet med väntande märken och alla sidor i
 * grupper: Ord, Bokstäver (affischer för språken barnet använder, resten under
 * "Fler språk"), Räkna och Märken. Allt är stilla: inga pulserande märken.
 * Lämnades en sida precis när den blev klar visas dess fest här.
 */
export default function StickerBook() {
  const name = useProfile((s) => s.name);
  const avatar = useProfile((s) => s.avatar);
  const stars = useProfile((s) => s.stars);
  const owned = useStickers((s) => s.owned);
  const intro = useStickers((s) => s.intro);
  const donePages = useStickers((s) => s.donePages);
  const markIntroSeen = useStickers((s) => s.markIntroSeen);
  const lang = useSettings((s) => s.lang);
  const { speak } = useSpeech();
  const [moreLangs, setMoreLangs] = useState(false);
  // En sidfest som inte hann visas (barnet gick tillbaka direkt när sidan blev klar)
  const [partyPage, setPartyPage] = useState<BookPage | null>(() => {
    const id = heldParty();
    return id ? (PAGE_BY_ID.get(id) ?? null) : null;
  });
  const cheered = useRef(false);

  // Indexet börjar alltid överst (routern behåller annars förra sidans scroll)
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!partyPage || cheered.current) return;
    cheered.current = true;
    holdParty(null);
    celebrate();
    playLevelUp();
    speak(partyPage.praise, "sv");
  }, [partyPage, speak]);

  const badges = useMemo(() => badgeStatus(stars), [stars]);
  const tray = useMemo(() => trayIds(owned), [owned]);
  const langs = useMemo(() => posterLangs(owned, lang), [owned, lang]);
  const placed = useMemo(
    () => Object.entries(owned).filter(([id, o]) => o.p === 1 && PAGE_OF_STICKER.has(id)).length,
    [owned]
  );

  const shownPosters = POSTERS.filter((p) => !!p.lang && langs.has(p.lang));
  const hiddenPosters = POSTERS.filter((p) => !p.lang || !langs.has(p.lang));

  const introText =
    intro && intro.found > 0
      ? intro.found === 1
        ? "Nabu har sparat 1 klistermärke åt dig från allt du redan lärt dig! Klistra in det i boken."
        : `Nabu har sparat ${intro.found} klistermärken åt dig från allt du redan lärt dig! Klistra in dem en och en – eller alla på en gång.`
      : "Nabu har gett dig sitt eget klistermärke – det sitter redan i boken!";

  // Kuvertet öppnar sidan för det äldsta väntande märket, redan upplyft
  const oldest = tray[0];
  const oldestPage = oldest ? PAGE_OF_STICKER.get(oldest) : undefined;

  const tile = (page: BookPage, i: number) => (
    <PageTile
      key={page.id}
      page={page}
      owned={owned}
      badges={badges}
      done={donePages.includes(page.id)}
      index={i}
    />
  );

  return (
    <MotionConfig reducedMotion="user">
      <main dir="ltr" className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        <header className="flex items-start gap-3">
          <BackButton to="/dashboard" />
          {/* Omslaget: rygg, sydd kant och avataren som ett klistermärke */}
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500 to-fuchsia-600 py-4 pl-6 pr-4 text-white shadow-lg">
            <span aria-hidden className="absolute inset-y-0 left-0 w-3 bg-black/15" />
            <span aria-hidden className="pointer-events-none absolute inset-y-2 left-5 right-2 rounded-2xl border-2 border-dashed border-white/35" />
            <div className="relative flex items-center gap-3">
              <span aria-hidden className="sticker shrink-0 text-5xl" style={{ rotate: "-6deg" }}>
                {avatar}
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-black leading-tight [overflow-wrap:anywhere] sm:text-2xl">{bookTitle(name)}</h1>
                <p className="mt-0.5 text-sm font-medium text-white/90">
                  <span dir="ltr">{placed}</span> {placed === 1 ? "klistermärke inklistrat" : "klistermärken inklistrade"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {intro && !intro.seen && (
          <section
            aria-label="Välkommen till boken"
            className="mt-5 rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200 dark:bg-zinc-900/80 dark:ring-zinc-700"
          >
            <NabuSays>
              <p className="leading-snug">{introText}</p>
            </NabuSays>
            <div className="mt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => speak(introText, "sv")}
                aria-label="Läs upp"
                className="grid h-12 w-12 place-items-center rounded-full bg-white text-purple-600 shadow outline-none motion-safe:transition motion-safe:active:scale-95 focus-visible:ring-4 focus-visible:ring-purple-400 dark:bg-zinc-700 dark:text-purple-300"
              >
                <Volume2 size={24} aria-hidden />
              </button>
              <button
                type="button"
                onClick={markIntroSeen}
                className="min-h-14 rounded-full bg-purple-500 px-8 text-lg font-bold text-white shadow outline-none motion-safe:transition motion-safe:active:scale-95 focus-visible:ring-4 focus-visible:ring-purple-400"
              >
                Okej!
              </button>
            </div>
          </section>
        )}

        {oldest && oldestPage && (
          <Link
            to={`/stickers/${oldestPage}?place=${encodeURIComponent(oldest)}`}
            className="mt-5 flex min-h-[80px] items-center gap-3 rounded-3xl bg-amber-100 p-3 pr-4 shadow ring-1 ring-amber-300 outline-none motion-safe:transition motion-safe:active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-purple-400 dark:bg-amber-400/15 dark:ring-amber-300/30"
          >
            <EnvelopeArt ids={tray.slice(0, 3)} owned={owned} />
            <span className="min-w-0 flex-1 text-lg font-bold leading-tight">
              <span dir="ltr">{tray.length}</span> väntar i kuvertet
            </span>
            <ChevronRight size={28} aria-hidden className="shrink-0 text-amber-700 dark:text-amber-300" />
          </Link>
        )}

        <Group title="Ord" icon="📚">
          {WORD_PAGES.map(tile)}
        </Group>

        <Group title="Bokstäver" icon="✏️">
          {shownPosters.map(tile)}
        </Group>
        {hiddenPosters.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              aria-expanded={moreLangs}
              aria-controls="fler-sprak"
              onClick={() => setMoreLangs((v) => !v)}
              className="flex min-h-14 w-full items-center gap-2 rounded-2xl bg-white/70 px-4 text-left font-bold shadow-sm outline-none motion-safe:transition motion-safe:active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-purple-400 dark:bg-zinc-800/70"
            >
              <span aria-hidden>🌍</span>
              Fler språk
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                (<span dir="ltr">{hiddenPosters.length}</span>)
              </span>
              <ChevronDown size={22} aria-hidden className={cn("ml-auto motion-safe:transition-transform", moreLangs && "rotate-180")} />
            </button>
            {moreLangs && (
              <div id="fler-sprak" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {hiddenPosters.map(tile)}
              </div>
            )}
          </div>
        )}

        <Group title="Räkna" icon="🔢">
          {COUNT_PAGES.map(tile)}
        </Group>

        <Group title="Märken" icon="🏅">
          {BADGE_PAGES.map(tile)}
        </Group>

        <Link
          to="/collection"
          className="mt-8 flex min-h-[76px] items-center gap-3 rounded-3xl bg-white p-4 shadow outline-none motion-safe:transition motion-safe:active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-purple-400 dark:bg-zinc-800"
        >
          <span aria-hidden className="text-3xl">
            🗺️
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Mina stigar</span>
            <span className="block text-sm text-zinc-500 dark:text-zinc-400">Alla spel och nivåer du har klarat</span>
          </span>
          <ChevronRight size={26} aria-hidden className="shrink-0 text-zinc-400" />
        </Link>

        <BottomNav />
      </main>

      <AnimatePresence>
        {partyPage && (
          <PageParty
            key="fest"
            page={partyPage}
            gift={partyPage.gift ? ITEM_BY_ID.get(partyPage.gift) : undefined}
            onClose={() => setPartyPage(null)}
          />
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

/** En grupp sidor med rubrik. */
function Group({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section className="mt-7" aria-label={title}>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
        <span aria-hidden>{icon}</span>
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </section>
  );
}

/**
 * En sida i indexet: scenens bakgrund, ring med emoji, titel, "6 av 10" och
 * sidans gåva i ett stilla hörn (gåvan står på sidan från första dagen).
 */
function PageTile({
  page,
  owned,
  badges,
  done,
  index,
}: {
  page: BookPage;
  owned: Owned;
  badges: BadgeStatus[];
  done: boolean;
  index: number;
}) {
  const { done: n, total, waiting } = pageCount(page, owned, badges);
  const complete = !page.derived && (done || (total > 0 && n === total));
  const gift = page.gift ? ITEM_BY_ID.get(page.gift) : undefined;
  const label = [
    page.title,
    page.derived ? `${n} av ${total} spelmärken tända` : `${n} av ${total}`,
    waiting > 0 ? `${waiting} väntar i kuvertet` : "",
    complete ? "klar" : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.03 }}
    >
      <Link
        to={`/stickers/${page.id}`}
        aria-label={label}
        className={cn(
          "relative flex min-h-[124px] flex-col items-center justify-center gap-1.5 rounded-3xl px-2 pb-3 pt-5 text-center shadow ring-1 ring-black/5 outline-none motion-safe:transition motion-safe:active:scale-[0.97] focus-visible:ring-4 focus-visible:ring-purple-400 dark:ring-white/10",
          `scene-${page.scene}`
        )}
      >
        {gift && (
          <span className="absolute right-2 top-2 rounded-full bg-white/85 p-1 shadow-sm dark:bg-zinc-900/70">
            <GiftArt item={gift} size={20} />
          </span>
        )}
        {waiting > 0 && (
          <span
            aria-hidden
            className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-amber-700 shadow-sm dark:bg-zinc-900/80 dark:text-amber-300"
          >
            ✉️ <span dir="ltr">{waiting}</span>
          </span>
        )}
        <ProgressRing frac={total ? n / total : 0} done={complete}>
          <TileFace page={page} />
        </ProgressRing>
        <span aria-hidden className="text-sm font-bold leading-tight">
          {page.title}
        </span>
        <span
          aria-hidden
          className="rounded-full bg-white/70 px-2 text-xs font-semibold text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300"
        >
          <span dir="ltr">
            {n} av {total}
          </span>
        </span>
      </Link>
    </motion.div>
  );
}

/** Mitten av ringen: sidans emoji, eller affischens tre första bokstäver ("ΑΒΓ"). */
function TileFace({ page }: { page: BookPage }) {
  if (page.group === "bokstaver" && page.lang) {
    const lang = page.lang;
    return (
      <span lang={lang} dir={getLanguage(lang).dir} className="text-lg font-black text-violet-700 dark:text-violet-300">
        {ALPHABETS[lang].upper.slice(0, 3).join("")}
      </span>
    );
  }
  return (
    <span aria-hidden className="text-3xl">
      {page.emoji}
    </span>
  );
}
