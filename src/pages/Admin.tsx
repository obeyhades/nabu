import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GAMES } from "../data/gameRegistry";
import { CATEGORIES } from "../data/concepts";
import { LEVELS } from "../data/levels";
import { LANGUAGES } from "../data/languages";
import { DEFAULT_WEAR, NEST_ITEMS } from "../data/nestItems";
import { STICKER_IDS, TOFU_RISK, TOTAL_SLOTS } from "../data/stickers";
import { BackButton } from "../components/BackButton";
import { Button } from "../components/Button";
import { ThemeToggle } from "../components/ThemeToggle";
import { Mascot } from "../components/Mascot";
import { ItemArt } from "../components/ItemArt";
import { StarPouch } from "../components/StarPouch";
import { useSettings } from "../stores/useSettings";
import { useProfile } from "../stores/useProfile";
import { useStats, xpLevelInfo, currentStreak } from "../stores/useStats";
import { useStickers } from "../stores/useStickers";
import { useNest } from "../stores/useNest";
import { useRewards } from "../stores/useRewards";
import { starKey, pathsFor } from "../lib/progress";
import { balanceOf, isOwnedItem, spentOf } from "../lib/rewards";
import { exportBackup, importBackup, parseBackup } from "../lib/backup";
import { supportsEmoji } from "../lib/emojiSupport";
import { cn } from "../lib/cn";
import type { NestItem, WearSlot } from "../types";

const RATE_PRESETS = [
  { label: "Långsam", v: 0.8 },
  { label: "Normal", v: 1 },
  { label: "Snabb", v: 1.25 },
];
const GOAL_PRESETS = [10, 20, 30, 50];
const TEST_STARS = 50;

// Alla stjärn-nycklar (för "lås upp allt")
function allStarKeys(): string[] {
  const keys: string[] = [];
  for (const g of GAMES) {
    const cats = pathsFor(
      g,
      CATEGORIES.map((c) => c.id),
      LANGUAGES.map((l) => l.code)
    );
    for (const cat of cats) for (const lvl of LEVELS) keys.push(starKey(g.id, cat, lvl.level));
  }
  return keys;
}

/** Boken, boet och vinstskärmens belöning nollställs alltid tillsammans med stjärnorna (§6.8). */
function resetBookAndNest() {
  useStickers.getState().reset();
  useNest.getState().reset();
  useRewards.getState().clear();
}

export default function Admin() {
  const navigate = useNavigate();

  const speechRate = useSettings((s) => s.speechRate);
  const setSpeechRate = useSettings((s) => s.setSpeechRate);
  const adminPin = useSettings((s) => s.adminPin);
  const setAdminPin = useSettings((s) => s.setAdminPin);
  const soundOn = useSettings((s) => s.soundOn);
  const toggleSound = useSettings((s) => s.toggleSound);
  const shopOn = useSettings((s) => s.shopOn);
  const setShopOn = useSettings((s) => s.setShopOn);
  const hatInGames = useSettings((s) => s.hatInGames);
  const setHatInGames = useSettings((s) => s.setHatInGames);

  const name = useProfile((s) => s.name);
  const stars = useProfile((s) => s.stars);
  const resetProgress = useProfile((s) => s.resetProgress);
  const unlockAll = useProfile((s) => s.unlockAll);
  const resetProfile = useProfile((s) => s.reset);

  const xp = useStats((s) => s.xp);
  const streak = useStats((s) => currentStreak(s.streak, s.lastPlayDate));
  const bestStreak = useStats((s) => s.bestStreak);
  const dailyGoal = useStats((s) => s.dailyGoal);
  const setDailyGoal = useStats((s) => s.setDailyGoal);
  const resetStats = useStats((s) => s.reset);

  const stickersOwned = useStickers((s) => s.owned);
  const nestEarned = useNest((s) => s.earned);
  const nestOwned = useNest((s) => s.owned);

  const [entered, setEntered] = useState("");
  const [err, setErr] = useState(false);
  const [ok, setOk] = useState(false);
  const [confirm, setConfirm] = useState<null | "progress" | "everything" | "import">(null);
  const [flash, setFlash] = useState<{ m: string; warn: boolean } | null>(null);
  const [newPin, setNewPin] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Beskedet försvinner av sig självt
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 4000);
    return () => window.clearTimeout(t);
  }, [flash]);

  const keys = allStarKeys();
  const pathStars = keys.reduce((sum, k) => sum + (stars[k] ?? 0), 0);
  const { level } = xpLevelInfo(xp);
  const stickerCount = Object.keys(stickersOwned).filter((id) => STICKER_IDS.has(id)).length;
  const balance = balanceOf({ earned: nestEarned, owned: nestOwned });
  const spent = spentOf({ owned: nestOwned });
  const itemCount = NEST_ITEMS.filter((i) => isOwnedItem({ owned: nestOwned }, i.id)).length;

  const say = (m: string, warn = false) => setFlash({ m, warn });

  // Säkerhetskopia, steg 1: välj fil (kontrolleras direkt), steg 2: bekräfta.
  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // samma fil ska kunna väljas igen
    if (!file) return;
    let valid = false;
    try {
      valid = parseBackup(await file.text()) !== null;
    } catch {
      valid = false;
    }
    if (!valid) {
      say("Det där är ingen säkerhetskopia från Nabu – inget ändrades.", true);
      return;
    }
    setImportFile(file);
    setConfirm("import");
  };

  const runImport = async () => {
    if (!importFile) return;
    setBusy(true);
    const done = await importBackup(importFile); // laddar om appen när det gick
    if (done) return;
    setBusy(false);
    setImportFile(null);
    setConfirm(null);
    say("Säkerhetskopian gick inte att läsa in – inget ändrades.", true);
  };

  const cancelConfirm = () => {
    setConfirm(null);
    setImportFile(null);
  };

  // ── PIN-spärr ──────────────────────────────────────────
  if (!ok) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-6xl">🔒</div>
        <div>
          <h1 className="text-2xl font-bold">Föräldrar</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Skriv PIN för att fortsätta</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (entered === adminPin) setOk(true);
            else {
              setErr(true);
              setEntered("");
            }
          }}
          className="flex w-full flex-col items-center gap-4"
        >
          <input
            autoFocus
            value={entered}
            onChange={(e) => {
              setEntered(e.target.value.replace(/\D/g, "").slice(0, 8));
              setErr(false);
            }}
            inputMode="numeric"
            placeholder="PIN"
            className={cn(
              "w-40 rounded-2xl border-2 bg-white px-5 py-3 text-center text-3xl font-bold tracking-widest outline-none dark:bg-zinc-800",
              err
                ? "border-red-400 text-red-500"
                : "border-purple-300 text-purple-600 focus:border-purple-500 dark:border-purple-800 dark:text-purple-300"
            )}
          />
          {err && <p className="text-sm text-red-500">Fel PIN, försök igen</p>}
          <Button type="submit" className="bg-purple-500 text-white">
            Lås upp
          </Button>
        </form>
        <Link to="/dashboard" className="inline-flex min-h-11 items-center px-3 text-sm text-zinc-400">
          ← Tillbaka
        </Link>
      </main>
    );
  }

  // ── Admin-panel ────────────────────────────────────────
  const chip = (active: boolean) =>
    cn(
      "rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition active:scale-95",
      active
        ? "border-purple-500 bg-purple-500 text-white"
        : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
    );

  const toggle = (label: string, on: boolean, set: (on: boolean) => void) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{label}</span>
      <button onClick={() => set(!on)} aria-pressed={on} aria-label={label} className={chip(on)}>
        {on ? "På" : "Av"}
      </button>
    </div>
  );

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6 pb-16">
      <div className="mb-2 flex items-center gap-3">
        <BackButton to="/dashboard" />
        <h1 className="text-2xl font-bold">Föräldrar &amp; admin</h1>
      </div>

      {flash && (
        <div
          role="status"
          className={cn(
            "sticky top-3 z-20 rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-lg",
            flash.warn ? "bg-amber-600" : "bg-emerald-500"
          )}
        >
          {flash.m}
        </div>
      )}

      {/* Framsteg */}
      <Card title={`Framsteg${name ? ` – ${name}` : ""}`}>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Nivå" value={`🎓 ${level}`} />
          <Stat label="XP" value={xp} />
          <Stat label="Streak" value={`🔥 ${streak}`} />
          <Stat label="Bästa streak" value={`🏆 ${bestStreak}`} />
          <Stat label="Stjärnor på stigarna" value={`${pathStars} / ${keys.length * 3}`} />
          <Stat label="Klistermärken" value={`${stickerCount} / ${TOTAL_SLOTS}`} />
          <Stat
            label="I påsen"
            value={
              <span className="inline-flex items-center gap-1">
                <StarPouch /> {balance}
              </span>
            }
            sub={`intjänat ${nestEarned} · i saker ${spent}`}
          />
          <Stat label="Saker i boet" value={`${itemCount} / ${NEST_ITEMS.length}`} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <Link to="/collection" className="inline-flex min-h-11 items-center text-sm font-semibold text-purple-600 dark:text-purple-300">
            Se detaljerad samling →
          </Link>
          <Link to="/stickers" className="text-sm font-semibold text-purple-600 dark:text-purple-300">
            Klistermärkesboken →
          </Link>
          <Link to="/nest" className="text-sm font-semibold text-purple-600 dark:text-purple-300">
            Nabus bo →
          </Link>
        </div>
      </Card>

      {/* Inställningar */}
      <Card title="Inställningar">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">Röst-hastighet</p>
            <div className="flex flex-wrap gap-2">
              {RATE_PRESETS.map((r) => (
                <button
                  key={r.v}
                  onClick={() => setSpeechRate(r.v)}
                  className={chip(Math.abs(speechRate - r.v) < 0.01)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">Dagligt XP-mål</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_PRESETS.map((g) => (
                <button key={g} onClick={() => setDailyGoal(g)} className={chip(dailyGoal === g)}>
                  {g} XP
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Ljud</span>
            <button onClick={toggleSound} className={chip(soundOn)}>
              {soundOn ? "På" : "Av"}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Tema</span>
            <ThemeToggle />
          </div>

          {toggle("Stjärnboden (köpa saker)", shopOn, setShopOn)}
          {toggle("Visa Nabus hatt i spelen", hatInGames, setHatInGames)}
        </div>
      </Card>

      {/* PIN */}
      <Card title="Byt PIN">
        <div className="flex items-center gap-3">
          <input
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            placeholder="Ny PIN"
            className="w-32 rounded-xl border-2 border-zinc-200 bg-white px-4 py-2 text-center font-bold tracking-widest outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <Button
            onClick={() => {
              if (newPin.length >= 4) {
                setAdminPin(newPin);
                setNewPin("");
                say("PIN uppdaterad ✓");
              } else {
                say("PIN måste vara minst 4 siffror", true);
              }
            }}
            className="bg-purple-500 text-white"
          >
            Spara
          </Button>
        </div>
      </Card>

      {/* Verktyg */}
      <Card title="Verktyg">
        <div className="space-y-3">
          <ToolButton
            title="💾 Spara säkerhetskopia"
            sub="Boken, boet, stjärnorna och inställningarna i en fil"
            onClick={() => {
              exportBackup();
              say("Säkerhetskopian sparas ✓");
            }}
          />

          {confirm === "import" && importFile ? (
            <ConfirmBox
              text="Ersätt allt på den här enheten?"
              detail={`Allt Nabu sparat här byts mot ${importFile.name}. Appen startar om.`}
              yes={busy ? "Läser in …" : "Ja, ersätt"}
              disabled={busy}
              onYes={runImport}
              onNo={cancelConfirm}
            />
          ) : (
            <ToolButton
              title="📂 Läs in säkerhetskopia"
              sub="Välj en fil från Nabu – du får bekräfta innan något ersätts"
              onClick={() => fileRef.current?.click()}
            />
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            tabIndex={-1}
            onChange={pickFile}
          />

          <ToolButton
            title="🗝️ Lås upp alla nivåer"
            sub="För att testa. Ger inga klistermärken och inga stjärnor i påsen. Märkeshyllans ramar visas som klara."
            onClick={() => {
              unlockAll(keys);
              say("Alla nivåer upplåsta ✓");
            }}
          />

          <ToolButton
            title={`+ ${TEST_STARS} ⭐ i påsen (test)`}
            sub="Bara för att prova Stjärnboden"
            onClick={() => {
              useNest.getState().addTestStars(TEST_STARS);
              say(`${TEST_STARS} stjärnor lades i påsen ✓`);
            }}
          />

          {confirm === "progress" ? (
            <ConfirmBox
              text="Börja om från början? Stjärnorna på stigarna, XP och streak, klistermärkesboken och Nabus bo nollställs."
              yes="Ja, börja om"
              onYes={() => {
                resetProgress();
                resetStats();
                resetBookAndNest();
                setConfirm(null);
                say("Börjat om! 🌱");
              }}
              onNo={cancelConfirm}
            />
          ) : (
            <ToolButton
              title="🔄 Börja om"
              sub="Nollställ stjärnor, XP, streak, boken och boet"
              danger
              onClick={() => setConfirm("progress")}
            />
          )}

          {confirm === "everything" ? (
            <ConfirmBox
              text="Rensa allt – namn, avatar, stjärnor, XP, klistermärkesboken och Nabus bo? Appen börjar om från start."
              yes="Ja, rensa"
              onYes={() => {
                resetProfile();
                resetStats();
                resetBookAndNest();
                navigate("/");
              }}
              onNo={cancelConfirm}
            />
          ) : (
            <ToolButton
              title="🧹 Rensa allt"
              sub="Även namn och avatar – appen börjar om helt"
              danger
              onClick={() => setConfirm("everything")}
            />
          )}

          {import.meta.env.DEV && (
            <ToolButton
              title={devOpen ? "🙈 Dölj hattar & saker (DEV)" : "🎩 Visa alla hattar & saker (DEV)"}
              sub="Hattar och hals på Nabu i två storlekar, all konst i boet och emoji-stödet här"
              onClick={() => setDevOpen((v) => !v)}
            />
          )}
        </div>
      </Card>

      {import.meta.env.DEV && devOpen && <DevGallery />}

      <p className="px-1 text-xs text-zinc-400">
        PIN-spärren är en barnspärr – inte riktig säkerhet. Allt sparas lokalt på enheten.
      </p>
    </main>
  );
}

// ── Delar ────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow dark:bg-zinc-800">
      <h2 className="mb-3 font-semibold text-zinc-600 dark:text-zinc-300">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl bg-zinc-100 p-3 text-center dark:bg-zinc-900">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] leading-tight text-zinc-400">{sub}</div>}
    </div>
  );
}

function ToolButton({
  title,
  sub,
  danger = false,
  onClick,
}: {
  title: string;
  sub: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-left dark:bg-zinc-700">
      <span className={cn("font-semibold", danger && "text-red-600 dark:text-red-400")}>{title}</span>
      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{sub}</span>
    </button>
  );
}

/** Andra steget före något som inte går att ångra. */
function ConfirmBox({
  text,
  detail,
  yes,
  disabled = false,
  onYes,
  onNo,
}: {
  text: string;
  detail?: string;
  yes: string;
  disabled?: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-red-50 p-4 dark:bg-red-950/40">
      <p className="text-sm font-medium">{text}</p>
      {detail && <p className="text-xs text-zinc-600 dark:text-zinc-300">{detail}</p>}
      <div className="flex gap-2">
        <Button
          onClick={onYes}
          disabled={disabled}
          className="flex-1 whitespace-nowrap bg-red-500 text-sm text-white"
        >
          {yes}
        </Button>
        <Button
          onClick={onNo}
          disabled={disabled}
          className="flex-1 whitespace-nowrap bg-white text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          Avbryt
        </Button>
      </div>
    </div>
  );
}

// ── DEV: hattrutnätet (trimma `wear` i nestItems.ts) ─────

/** Storlek så att breda saker (mattor, girlanger, fönster) syns ordentligt. */
function artSize(item: NestItem): string {
  if (item.kind === "window") return "text-[88px]";
  if (item.kind === "floor" || item.kind === "garland") return "text-[140px]";
  return "text-5xl";
}

function DevGallery() {
  const wearables = NEST_ITEMS.filter((i) => i.kind === "hat" || i.kind === "neck");
  const tofu = useMemo(() => [...TOFU_RISK].map((e) => ({ e, ok: supportsEmoji(e) })), []);

  return (
    <Card title="DEV: hattar, saker och emoji">
      <h3 className="mb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
        På Nabu (text-5xl och text-8xl) – ska sitta inom ±0,1 em
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {wearables.map((item) => {
          const slot: WearSlot = item.kind === "hat" ? "hat" : "neck";
          const fit = item.wear ?? DEFAULT_WEAR[slot];
          const wear = slot === "hat" ? { hat: item.id, neck: null } : { hat: null, neck: item.id };
          return (
            <div key={item.id} className="rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-900">
              <div className="flex items-end justify-center gap-4 pt-8">
                <Mascot mood="still" wear={wear} className="text-5xl" />
                <Mascot mood="still" wear={wear} className="text-8xl" />
              </div>
              <p className="mt-2 text-center text-sm font-semibold">{item.name}</p>
              <p dir="ltr" className="text-center font-mono text-[11px] text-zinc-500">
                size {fit.size} · dy {fit.dy} · dx {fit.dx ?? 0} · rot {fit.rot ?? 0}
              </p>
            </div>
          );
        })}
      </div>

      <h3 className="mb-2 mt-5 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
        All konst i boet ({NEST_ITEMS.length})
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {NEST_ITEMS.map((item) => (
          <div key={item.id} className="flex flex-col items-center gap-1 rounded-2xl bg-zinc-100 p-2 dark:bg-zinc-900">
            <div className={cn("flex h-24 w-full items-center justify-center gap-1 overflow-hidden", artSize(item))}>
              {item.trick === "grow" ? (
                ([0, 1, 2] as const).map((g) => <ItemArt key={g} art={item.art} grow={g} />)
              ) : (
                <ItemArt art={item.art} />
              )}
            </div>
            <span className="text-center text-[11px] leading-tight">{item.name}</span>
            <span className="font-mono text-[10px] text-zinc-400">{item.price ? `${item.price} ⭐` : item.via}</span>
          </div>
        ))}
      </div>

      <h3 className="mb-2 mt-5 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
        TOFU_RISK på den här enheten (✗ = visas som WordBlob)
      </h3>
      <div className="flex flex-wrap gap-2">
        {tofu.map((t) => (
          <span
            key={t.e}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-semibold",
              t.ok
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
            )}
          >
            {t.e} {t.ok ? "✓" : "✗"}
          </span>
        ))}
      </div>
    </Card>
  );
}
