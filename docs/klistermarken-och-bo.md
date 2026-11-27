# Nabu: Klistermärkesboken & Nabus bo, final build spec (v1)

Repo: `/Users/hades/Desktop/nabu-main`. The base is Proposal 2 (learning-motivation): Ordboken pages split by category and band, Kuvertet matching placement, mastery tiers and the Stjärnpåsen earned-delta wallet. Its engineering is hardened with Proposal 3 patterns, and some of Proposal 1's delight is added. Every number and line reference below was checked against the working tree on 2026-11-26.

---

## 0. Blocking items before coding

1. **`src/data/concepts.ts` has uncommitted edits** (`git status`: M concepts.ts, CountingGame, FlashcardsGame, MathGame, TraceGame). This feature needs one additive export in that file (§8). **Get the owner's OK first.** Without it, word stickers cannot know which words a lesson used.
2. **Do not touch** `TraceGame.tsx`, `CountingGame.tsx`, `MathGame.tsx`, `FlashcardsGame.tsx` or any other game page. All 11 games stay unedited.
3. Owner decisions, each a single constant or flag that can be changed later:
   - `WELCOME_CAP = 60` (pouch seed for existing saves)
   - `BACKFILL_WORD_CAP = 24`
   - BottomNav "Samling" becomes "Boken"
   - Keep the emoji owl 🦉. The SVG NabuOwl is phase 2 and changes the brand mark, so it needs the owner's decision.
4. Build gate: `tsc -b` must pass with `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` (use `import type`) and `erasableSyntaxOnly` (no enums). `oxlint` must pass; `react/only-export-components` means component files export only components, and helpers go in `lib/` or `data/`.

---

## 1. Overview and why

The **sticker book** records what the child actually practised. Every word sticker is a word from the lesson just finished, offered face-up as a choice of 2–3. Letters, train wagons and beads are fixed per level. Deeper learning upgrades a sticker instead of adding new art: "Blank" after 3 different games, "Guldkant" after a gold lesson. **Nabus bo** is a cozy oak hollow that the child decorates with items bought from a separate star pouch. The pouch fills only with new best stars, so replays cannot farm it and spending never touches the level stars.

The research behind these choices:
- **Rewards.** Expected tangible rewards undermine young children's interest, while informational and unexpected ones do not (Lepper, Greene & Nisbett 1973; Deci, Koestner & Ryan 1999). So there are no previews or promises before play, and the reward is the learning content itself (Habgood & Ainsworth 2011).
- **Choice.** 2–4 low-stakes choices raise motivation most for children (Patall et al. 2008).
- **Manipulative design.** Most apps for 3–5-year-olds use lures, parasocial pressure and fake urgency (Radesky et al. 2022), so the design has none.
- **Loss aversion.** Children from about age 5 show an endowment effect (Harbaugh et al. 2001), so path stars never drop, buying is undoable and refunds are always 100%.
- **Set size and dragging.** Sets of 8–13 per page avoid the "huge set" backfire (Barasz et al. 2017). Tap-first placement with 72 px+ targets follows NN/g and WCAG 2.5.7.

---

## 2. Earning rules

Everything is granted in exactly one place, `useLesson.finish()`. The only exceptions are page gifts, which are granted in the book's `place()` tap handler. Nothing is granted during render or in an effect. Nothing is random.

### 2.1 Per finished lesson (any game, regular or gold, any star count; finish always gives 1–3 stars)

| Event | Reward |
|---|---|
| Star income | `pouch += max(0, stars − prevBest)` for that exact `lessonKey`. First clear gives +1..3. Improving 1→3 gives +2. Matching the best gives +0. A first gold clear gives up to +3 on top, because gold keys are separate. |
| Word games (flashcards, listen, memory, spelling, abc, puzzle, balloon, catapult; every path incl. `adventure`/`blandad`) and Spåra levels 16–20 | **Word sticker** (§2.2) plus a mastery update. |
| Spåra (`trace-<lang>`) levels 1–10 | Every letter traced in the lesson. A missing letter is granted; an owned letter gains the missing form (upper → +lower = "Aa"). Arabic has one form, so its tile is complete in one step. |
| Spåra levels 11–12 | Digit stickers 0–4 / 5–9 for that language's poster, if missing. |
| Spåra levels 13–15 | Each traced letter gets the "Kluring" frame (tricky:1), and is granted first if missing. |
| Matte level L | Wagon `m:L` on Räknetåget, if missing. |
| Räkna! level L | Bead `c:L` on Pärlbandet, if missing. |
| First regular clear ever in a game | Its medallion on Märkeshyllan lights up (derived, nothing stored). |
| A band (all 5 of its levels) first fully cleared on any path of that game (any trace language counts) | That medallion gets that band's frame (derived; shown in the reveal when the before/after comparison crosses). |
| After this lesson, all 11 medallions have the 🌱 frame for the first time (before false → after true) | Gift `neck-medal` (Medaljen). |
| After this lesson, all 11 medallions have the 👑 frame for the first time | Gift `hat-crown` (Mästarkronan). |
| 3 stars | **No extra sticker.** Perfection pays only through the pouch, so the book never punishes mistakes. |
| Streak, daily goal, logins, time played | **Nothing, ever.** |

### 2.2 Word sticker rule (deterministic)

```
band       = bandOf(level)
practised  = unique(concept ids used in this lesson)          // §6.6 sources
candidates = practised
  .filter(id => !owned['w:'+id] && concept.level <= band + 1)
  .sort(by concept.level asc, then CONCEPTS index asc)         // easiest unknown word first
nOptions   = band <= 2 ? 2 : 3
```

- 0 candidates: no new sticker. On word games the reveal says "Alla orden finns redan i din bok – bra repetition!"
- 1 candidate: granted, no choice.
- 2 or more: **the default `candidates[0]` is granted inside `finish()`**. The VictoryScreen shows `candidates.slice(0, nOptions)` face-up. Tapping another card calls `choose(old, new)`, which swaps the granted sticker. A swap is allowed only while the granted sticker is unplaced (p:0) and only for ids in `options`. If the child skips the choice, nothing is lost and nothing is left half-done. There is no pending state.
- This gives at most one new word per lesson. Easy levels only offer easy words, so the book cannot be filled by farming band 1.

### 2.3 Mastery (`met`, tracked for every practised concept, owned or not)

- `g`: unique `GameId`s where the word was in a finished lesson. When the count reaches 3 the sticker becomes **Blank** (shown with ✨; ✨ is now only the tier mark).
- `l`: unique learning languages (the UI `lang`, or the trace language for trace). Shown as stamps on the Ordkort.
- `gold:1`: the word was in a finished gold lesson. Shown as **Guldkant** (a gold die-cut outline).
- Upgrade chips appear in the reveal only for owned stickers, at the moment a threshold is crossed.

### 2.4 Page gifts (book)

A page is complete when every slot on it is placed. The check runs in `place()` and `placeAll()`. On completion: a one-time latch in `donePages`, the gift item is granted to the nest (auto-placed if a compatible non-wear slot is free), and the party plays in the book. Each page's gift is printed on the page from day one.

### 2.5 One-time seeding (existing saves)

Seeding happens once per device, is written to storage immediately, and never repeats after a reset (§6.4/6.5):
- Pouch: `welcome = earned = min(Σ all values in profile.stars, WELCOME_CAP = 60)`.
- Stickers: backfill (§6.5), plus Nabu's own 🦉 sticker `w:owl`, pre-placed as a gift for everyone.
- Märkeshyllan gifts: if the save already meets the condition (`medalOk` / `crownOk`), `neck-medal` / `hat-crown` are granted (`via: 'gift'`, paid 0, not equipped). Such a save can never cross the condition inside a finish, so without this the printed gift would be unreachable. (A save that used Admin unlockAll *before* the update cannot be told apart and also gets them; unlockAll used after the update still grants nothing.)

---

## 3. Economy

- **Currency:** stars, held in **Stjärnpåsen**. Always draw it with the original SVG `StarPouch` (a drawstring pouch with a star on it) and the word "påsen", e.g. "[pouch] 12 i påsen". It is never shown as a bare ⭐. Prices are star icons or "8 ⭐", because a price is an amount, not the wallet.
- **Star meanings:**
  - XP becomes plain text: "340 XP" in MotivationCard, Admin "XP: 340". It gets no icon, because ✨ is the Blank tier and ⚡ is `LEVELS[11].icon` and a Coach combo line.
  - Path stars are labelled: LevelPicker "⭐ 23 / 60 på stigen", Collection "⭐ X av Y stjärnor på stigarna".
- **Balance formula:** `balance = max(0, earned − Σ owned[id].paid where via === 'buy')`.
  - `earned` only grows. It grows in `finish()` (by the delta), in `seedOnce`, and through the Admin test button.
  - `useProfile.stars` is **never** read for spending and never written by these features.
  - "Spent" is derived, so it cannot drift. Returning an item deletes its record, which refunds it automatically. Unknown item ids are dropped on load, which refunds them too.
- **Initial balance:**
  - New player: 0 (plus 3 free starters, including the welcome hat).
  - Existing save: `min(Σ stars, 60)`. Intro copy: "Jag har sparat 60 stjärnor i påsen åt dig! Påsen fylls med nya stjärnor när du klarar nya nivåer – stjärnorna på stigen finns kvar."
  - The cap prevents windfalls from saves inflated ×5 by `migrateStarsV1` and from saves where `unlockAll` was used.
- **Supply:** 79 paths × 20 levels × 3 = 4 740 regular stars, plus 4 740 gold. At about 3 lessons a day with ~60% first clears, a child earns about 5 ⭐ a day.
- **Price ladder:** fixed, visible from day one, no triple digits: 3 · 5 · 8 · 10 · 12 · 15 · 20 · 25 · 30 · 40 · 45 · 50 · 60 · 80. There are **29 buyable items totalling 691 ⭐**, about 15% of regular supply.

| Tier | Items | Sum | Expected reach |
|---|---|---|---|
| ≤5 ⭐ | 6 | 26 | First item after 1–2 lessons; all six in week 1 |
| 8–15 ⭐ | 10 | 120 | Month 1 |
| 20–30 ⭐ | 6 | 150 | Months 2–3 |
| 40–50 ⭐ | 4 | 175 | Months 3–4 |
| 60–80 ⭐ (dream) | 3 | 220 | Months 4–5; gold levels speed this up |

- 25 gift items and 3 starters cost 0 and cannot be bought.
- Every item is permanent: no rotation, sales, timers, seasons, bundles or random items, nothing tied to the streak, and no real money.
- **Pre-readers:** prices ≤10 are drawn as a row of star icons. Above 10 the price is "⭐ 25" plus a pouch fill bar. The price is spoken: "Den kostar åtta stjärnor. Du har tolv i påsen." An affordable item gets a calm static "✓ Räcker".
- **Refunds:** "Ångra" stays while the item sheet is open after a purchase, and "Lämna tillbaka" refunds 100% at any time. Total value is conserved, so this cannot be exploited.

---

## 4. Sticker catalog (390 total: 379 placeable + 11 derived medallions)

**Ids:** `w:<conceptId>` word · `l:<lang>:<i>` letter (i = 0-based index into `ALPHABETS[lang].upper`) · `d:<lang>:<0-9>` digit · `m:<L>` wagon · `c:<L>` bead. Medallions are derived only (render key `s:<gameId>`). Store ids only, never emoji.

**Content rules:** pages are **computed** from `CONCEPTS` by (category, band) in array order, so a new concept lands on its page automatically. Ids are never reused or renamed, and new words are appended within their category block. Any concept whose (category, band) no page covers goes to the automatic page **"Fler ord"** (`mer`, scene `plain`, no gift; hidden when empty).

**Emoji fallback:**
- `TOFU_RISK` = Emoji 12: 🧃 🧅 🧄 🧈; Emoji 13–15: 🫐 🫒 🫑 🫀 🫁 🫘 🫛 🫚.
  - Correction to the brief: the 4 Emoji-12 glyphs also fail on Android 9 / Fire OS 7.
  - For these, `supportsEmoji()` (a cached canvas check, §8) falls back to a **WordBlob** sticker: a tinted blob showing the word.
- All 20 number words render as CSS numeral badges (number plus word), never as keycap emoji.

### 4.A Ordboken: 16 word pages, 149 stickers

Shelves are band rows labelled with the `BANDS` icon and title. "Praise" is the line shown when the page is completed. Each sticker is listed as `conceptId emoji word`, where the word is its Swedish name.

| Page id | Title (emoji) | Scene | Shelves | Gift | Praise |
|---|---|---|---|---|---|
| djur-1 | Gården 🐮 | meadow | 🌱 (9) | friend-chick | "Du har övat alla gårdsdjuren!" |
| djur-2 | Djurparken 🦁 | meadow | 🚀 (8) | friend-hamster | "Du har övat alla djuren i djurparken!" |
| djur-3 | Jorden runt 🐘 | meadow | 🔥 (8) | toy-globe | "Du har övat djur från hela jorden!" |
| djur-4 | Djurens hemligheter 🦔 | meadow | 👑 (8) | friend-badger | "Du har övat de svåraste djurorden!" |
| mat-1 | Frukostbordet 🥛 | table | 🌱 6 + 🚀 7 | furn-basket | "Du har övat alla frukostorden!" |
| mat-2 | Kalaset 🍰 | table | 🔥 6 + 👑 5 | garland-party | "Du har övat alla kalasorden!" |
| frukt-1 | Fruktskålen 🍎 | orchard | 🌱 4 + 🚀 5 | friend-caterpillar | "Du har övat alla frukterna i skålen!" |
| frukt-2 | Djungelfrukter 🍍 | orchard | 🔥 6 + 👑 4 | plant-palm | "Du har övat alla djungelfrukterna!" |
| gron-1 | Köksträdgården 🥕 | garden | 🌱 4 + 🚀 4 | plant-sunflower | "Du har övat alla grönsakerna i landet!" |
| gron-2 | Växthuset 🍆 | garden | 🔥 4 + 👑 5 | friend-snail | "Du har övat alla grönsakerna i växthuset!" |
| fordon-1 | Ut och åka 🚗 | road | 🌱 5 + 🚀 5 | wall-map | "Du har övat alla fordonsorden!" |
| fordon-2 | Fart och fläkt 🚁 | road | 🔥 5 + 👑 5 | toy-telescope | "Du har övat alla snabba fordon!" |
| kropp-1 | Huvud och fötter 👂 | blueprint | 🌱 4 + 🚀 4 | neck-bow | "Du har övat kroppens delar!" |
| kropp-2 | Kroppens hemligheter 🧠 | blueprint | 🔥 4 + 👑 4 | hat-gradcap | "Du har övat hela kroppen – inuti också!" |
| siffror-1 | Ett till tio 🔟 | chalk | 🌱 5 + 🚀 5 | wall-clock | "Du har övat talen ett till tio!" |
| siffror-2 | Elva till tjugo 🔢 | chalk | 🔥 5 + 👑 5 | garland-numbers | "Du har övat talen elva till tjugo!" |

Stickers per page, in shelf order (* = in `TOFU_RISK`):

**djur-1 Gården**
- 🌱: cat 🐱 katt · dog 🐶 hund · fish 🐟 fisk · bird 🐦 fågel · cow 🐮 ko · pig 🐷 gris · duck 🦆 anka · mouse 🐭 mus · hen 🐔 höna

**djur-2 Djurparken**
- 🚀: horse 🐴 häst · frog 🐸 groda · rabbit 🐰 kanin · lion 🦁 lejon · bee 🐝 bi · sheep 🐑 får · tiger 🐯 tiger · bear 🐻 björn

**djur-3 Jorden runt**
- 🔥: elephant 🐘 elefant · giraffe 🦒 giraff · penguin 🐧 pingvin · dolphin 🐬 delfin · crocodile 🐊 krokodil · monkey 🐵 apa · zebra 🦓 zebra · turtle 🐢 sköldpadda

**djur-4 Djurens hemligheter**
- 👑: butterfly 🦋 fjäril · kangaroo 🦘 känguru · hippo 🦛 flodhäst · squirrel 🐿️ ekorre · octopus 🐙 bläckfisk · **owl 🦉 uggla** (pre-placed gift "Nabus eget klistermärke") · hedgehog 🦔 igelkott · snake 🐍 orm

**mat-1 Frukostbordet**
- 🌱: bread 🍞 bröd · milk 🥛 mjölk · egg 🥚 ägg · cheese 🧀 ost · rice 🍚 ris · juice 🧃* juice
- 🚀: pizza 🍕 pizza · sandwich 🥪 smörgås · cookie 🍪 kaka · icecream 🍦 glass · popcorn 🍿 popcorn · butter 🧈* smör · honey 🍯 honung

**mat-2 Kalaset**
- 🔥: chocolate 🍫 choklad · hamburger 🍔 hamburgare · hotdog 🌭 korv · taco 🌮 taco · pancake 🥞 pannkaka · croissant 🥐 croissant
- 👑: spaghetti 🍝 spagetti · candy 🍬 godis · donut 🍩 munk · cake 🍰 tårta · soup 🍲 soppa

**frukt-1 Fruktskålen**
- 🌱: apple 🍎 äpple · banana 🍌 banan · pear 🍐 päron · lemon 🍋 citron
- 🚀: orange 🍊 apelsin · grapes 🍇 vindruvor · cherry 🍒 körsbär · peach 🍑 persika · kiwi 🥝 kiwi

**frukt-2 Djungelfrukter**
- 🔥: strawberry 🍓 jordgubbe · watermelon 🍉 vattenmelon · melon 🍈 melon · mango 🥭 mango · blueberry 🫐* blåbär · olive 🫒* oliv
- 👑: pineapple 🍍 ananas · coconut 🥥 kokosnöt · avocado 🥑 avokado · greenapple 🍏 grönt äpple

**gron-1 Köksträdgården**
- 🌱: carrot 🥕 morot · potato 🥔 potatis · corn 🌽 majs · onion 🧅* lök
- 🚀: tomato 🍅 tomat · broccoli 🥦 broccoli · pepper 🫑* paprika · lettuce 🥬 sallad

**gron-2 Växthuset**
- 🔥: cucumber 🥒 gurka · garlic 🧄* vitlök · eggplant 🍆 aubergine · beans 🫘* bönor
- 👑: mushroom 🍄 svamp · peas 🫛* ärtor · sweetpotato 🍠 sötpotatis · ginger 🫚* ingefära · chili 🌶️ chili

**fordon-1 Ut och åka**
- 🌱: car 🚗 bil · bus 🚌 buss · bike 🚲 cykel · train 🚂 tåg · boat ⛵ båt
- 🚀: airplane ✈️ flygplan · truck 🚚 lastbil · taxi 🚕 taxi · tractor 🚜 traktor · moped 🛵 moped

**fordon-2 Fart och fläkt**
- 🔥: helicopter 🚁 helikopter · ambulance 🚑 ambulans · firetruck 🚒 brandbil · motorcycle 🏍️ motorcykel · kickscooter 🛴 sparkcykel
- 👑: rocket 🚀 rymdraket · ship 🚢 skepp · policecar 🚓 polisbil · metro 🚇 tunnelbana · cablecar 🚠 linbana

**kropp-1 Huvud och fötter**
- 🌱: hand ✋ hand · eye 👁️ öga · ear 👂 öra · nose 👃 näsa
- 🚀: mouth 👄 mun · foot 🦶 fot · leg 🦵 ben · arm 💪 arm

**kropp-2 Kroppens hemligheter**
- 🔥: tooth 🦷 tand · tongue 👅 tunga · heart 🫀* hjärta · brain 🧠 hjärna
- 👑: finger 👆 finger · thumb 👍 tumme · lungs 🫁* lungor · skeleton 🦴 skelett

**siffror-1 Ett till tio** (numeral badges)
- 🌱: one ett · two två · three tre · four fyra · five fem
- 🚀: six sex · seven sju · eight åtta · nine nio · ten tio

**siffror-2 Elva till tjugo** (numeral badges)
- 🔥: eleven elva · twelve tolv · thirteen tretton · fourteen fjorton · fifteen femton
- 👑: sixteen sexton · seventeen sjutton · eighteen arton · nineteen nitton · twenty tjugo

**How it is earned:** every word follows §2.2, from any word game in its category, from Äventyret/Blandad, or from Spåra levels 16–20 (band-1 and band-2 short words). Tiers follow §2.3.

### 4.B Bokstavsboken: 5 posters (140 letters + 50 digits)

| Page id | Title | Letters (`ALPHABETS[lang].upper`, index = id) | Digits | Gift |
|---|---|---|---|---|
| abc-sv | ABC på svenska | ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ (29) | d:sv:0–9 | garland-abc-sv |
| abc-en | ABC på engelska | ABCDEFGHIJKLMNOPQRSTUVWXYZ (26) | d:en:0–9 | garland-abc-en |
| abc-el | ΑΒΓ på grekiska | ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ (24) | d:el:0–9 | garland-abc-el |
| abc-ru | АБВ på ryska | АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ (33) | d:ru:0–9 | garland-abc-ru |
| abc-ar | ابت på arabiska | ابتثجحخدذرزسشصضطظعغفقكلمنهوي (28) | d:ar:0–9 | garland-abc-ar |

**Chunks**, verified with `chunk()`:
- sv levels 1–5: ABCDEF | GHIJKL | MNOPQ | RSTUVW | XYZÅÄÖ. Levels 6–10 are the same letters in lowercase.
- ar levels 1–5: ابت | ثجح | خد | ذرز | سشص. Levels 6–10: ضطظ | عغف | قك | لمن | هوي.

**Tiles:**
- A tile shows "A" (upper), "a" (lower only) or "Aa" (both); Arabic shows its single form.
- tricky:1 adds the "Kluring" frame. The rule on the back reads: "Kluring: spåra den i repetitionsnivåerna 13–15".
- Names: "Bokstaven A", "Siffran 3".
- Only the poster grid gets `dir="rtl"` for ar.

**Visibility:** the index shows the poster for the current language and any language with an owned letter or digit. Other posters sit under "Fler språk" (collapsed but available). **Page complete** means all letters and all 10 digits are placed. In normal play, digits (levels 11–12) come after lowercase (6–10).

### 4.C Räknetåget (`rakna-tag`, scene `rails`, gift `toy-abacus`)

Wagon `m:L` carries `LEVELS[L-1].icon` and a label. The labels mirror the constants in MathGame.tsx; keep them in sync and add a comment saying so.

| L | Label | L | Label | L | Label | L | Label |
|---|---|---|---|---|---|---|---|
| 1 | + upp till 5 | 6 | − från 5 | 11 | × 1, 2 | 16 | ÷ 2 |
| 2 | + upp till 8 | 7 | − från 8 | 12 | × 2, 3 | 17 | ÷ 2, 3 |
| 3 | + upp till 10 | 8 | − från 10 | 13 | × 2, 3, 5 | 18 | ÷ 2, 3, 5 |
| 4 | + upp till 15 | 9 | − från 15 | 14 | × 2–5, 10 | 19 | ÷ 2–5, 10 |
| 5 | + upp till 20 | 10 | − från 20 | 15 | × 2–10 | 20 | **Mix + − × ÷** |

Shelves: "➕ Plus" (1–5), "➖ Minus" (6–10), "✖️ Gånger" (11–15), "➗ Delat & Mix" (16–20). Name: "Vagn 7: − från 8". Earned: any finished Matte level L.

### 4.D Pärlbandet (`rakna-parlor`, scene `string`, gift `neck-beads`)

- Bead `c:L` is coloured by band gradient and shows `LEVELS[L-1].icon` with the caption "till {hi}".
- `hi = min(20, round(3 + (L−1)·17/19))`, mirroring `rangeFor` in CountingGame.tsx (keep in sync, with a comment). Values for L = 1..20: 3 4 5 6 7 7 8 9 10 11 12 13 14 15 16 16 17 18 19 20.
- Tapping a bead speaks the number word `hi` from the existing mp3 (learning language). The bead never claims the level taught "n".
- Shelves are the 4 band rows. Earned: any finished Räkna! level L.

### 4.E Märkeshyllan (`marken`, scene `shelf`, derived, no placement)

- 11 medallions in `GAMES` order: 🖼️ Ord & bilder, 👂 Hör & hitta, 🃏 Para ihop, 🔤 Stava ordet, 🅰️ ABC-äventyr, 🧮 Matte, 🔢 Räkna!, 🧩 Pussla ordet, 🎈 Ballongpop, 🏹 Katapulten, ✏️ Spåra & rita.
- Lit means at least one regular clear in that game. The 4 frame quarters (🌱 / 🚀 / 🔥 / 👑, coloured with the `BANDS` gradients) light up when that band is complete on any path.
- Page-level gifts are Medaljen (all 🌱) and Mästarkronan (all 👑), granted per §2.1. After Admin unlockAll the frames *show* complete, but the gifts do not fire (no crossing happens inside a finish).

---

## 5. Nest item catalog (57 items: 3 starters, 29 shop items, 25 gifts)

- `KIND_SLOTS`:
  - hat → hat
  - neck → neck
  - light → lamp, shelf
  - garland → garland
  - wall → wallL, wallR
  - window → window
  - furniture → floorL, floorR
  - floor → rug
  - plant / toy → sill, shelf, floorL, floorR
  - friend → friend1, friend2, friend3
- Per-item `slots` overrides are noted in the table.
- Wear fits are `{size, dy, rot}` in owl-em. They are starting values; tune them with the DEV hat grid.
- Defaults: hat `{.55, −.30, −8}`, neck `{.34, .56, 0}`.
- Art: `e:` = emoji (all on the Emoji ≤11 allowlist; text-default glyphs carry U+FE0F); `css:` / `svg:` = original art in `ItemArt.tsx`.

| id | Art | Name | Kind | Price | Via / unlock | Trick | Wear fit |
|---|---|---|---|---|---|---|---|
| start-moss | css:moss | Mossmattan | floor | 0 | start (default in rug) | bounce | – |
| start-sky | css:sky | Dagshimlen | window | 0 | start (default window; at night it shows .stars + 🌙) | – | – |
| hat-luva | svg:luva | Nabus luva | hat | 0 | start; given in the first-visit intro (§7.5) | bounce | .54/−.43/−6 |
| hat-nightcap | svg:nightcap | Nattmössan | hat | 3 | shop | bounce | .58/−.47/−12 |
| hat-cap | e:🧢 | Kepsen | hat | 8 | shop | bounce | .55/−.28/−10 |
| hat-sunhat | e:👒 | Solhatten | hat | 20 | shop | bounce | .58/−.44/−6 |
| hat-tophat | e:🎩 | Cylinderhatten | hat | 40 | shop | bounce | .55/−.40/−6 |
| hat-starhat | svg:starhat | Stjärnhatten | hat | 60 | shop | bounce | .62/−.44/−4 |
| neck-scarf | e:🧣 | Halsduken | neck | 10 | shop | – | .36/.50 |
| light-bulb | e:💡 | Glödlampan | light | 5 | shop | lamp | – |
| light-lantern | e:🏮 | Papperslyktan | light | 15 | shop | lamp | – |
| light-moon | e:🌙 | Månlampan | light | 25 | shop (soft blue glow) | lamp | – |
| garland-lights | css:stringLights | Ljusslingan | garland | 40 | shop (glows at night) | lamp | – |
| furn-stool | css:stool | Pallen | furniture | 8 | shop (replaces 🪑, which is Emoji 12) | bounce | – |
| furn-books | e:📚 | Bokhögen | furniture (slots: shelf, floorL, floorR) | 12 | shop | bounce | – |
| furn-sofa | e:🛋️ | Soffan | furniture | 30 | shop | bounce | – |
| wall-frame | css:frame | Ordtavlan | wall | 15 | shop (shows your 4 most recently placed word stickers) | frame | – |
| wall-rainbow | e:🌈 | Regnbågen | wall | 25 | shop | bounce | – |
| window-sunset | css:sunset | Solnedgången | window | 12 | shop | – | – |
| window-aurora | css:aurora | Norrskenet | window | 80 | shop (static gradient under reduced motion) | – | – |
| rug-stripes | css:stripes | Randiga mattan | floor | 5 | shop | bounce | – |
| rug-rainbow | css:rainbowRug | Regnbågsmattan | floor | 30 | shop | bounce | – |
| plant-cactus | e:🌵 | Kaktusen | plant | 3 | shop | bounce | – |
| plant-tulip | e:🌷 | Tulpanen | plant | 5 | shop | bounce | – |
| plant-sprout | e:🌱→🌿→🌳 | Lilla plantan | plant | 15 | shop (3 taps water it and it grows a stage; it never wilts) | grow | – |
| toy-ball | e:⚽ | Bollen | toy | 5 | shop | bounce | – |
| toy-teddy | e:🧸 | Nallen | toy | 15 | shop | bounce | – |
| toy-drum | e:🥁 | Trumman | toy | 20 | shop | drum | – |
| toy-piano | e:🎹 | Pianot | toy | 50 | shop (plays C-E-G) | piano | – |
| friend-ladybug | e:🐞 | Prick nyckelpigan | friend | 10 | shop ("Bjud in") | friend | – |
| friend-fox | e:🦊 | Ruffa räven | friend | 45 | shop ("Bjud in") | friend | – |
| friend-deer | e:🦌 | Lövis rådjuret | friend | 80 | shop ("Bjud in") | friend | – |
| friend-chick | e:🐥 | Pip kycklingen | friend | 0 | gift: page Gården full | friend | – |
| friend-hamster | e:🐹 | Hampus hamstern | friend | 0 | gift: Djurparken | friend | – |
| toy-globe | e:🌍 | Jordgloben | toy | 0 | gift: Jorden runt (says "uggla" in sv, en, el, ru, ar using owl.mp3) | globe | – |
| friend-badger | e:🦡 | Grävis grävlingen | friend | 0 | gift: Djurens hemligheter | friend | – |
| furn-basket | e:🧺 | Picknickkorgen | furniture (slots: shelf, floorL, floorR) | 0 | gift: Frukostbordet | bounce | – |
| garland-party | css:bunting | Kalasvimplarna | garland | 0 | gift: Kalaset | bounce | – |
| friend-caterpillar | e:🐛 | Slingan larven | friend | 0 | gift: Fruktskålen | friend | – |
| plant-palm | e:🌴 | Palmen | plant | 0 | gift: Djungelfrukter | bounce | – |
| plant-sunflower | e:🌻 | Solrosen | plant | 0 | gift: Köksträdgården | bounce | – |
| friend-snail | e:🐌 | Sävlig snigeln | friend | 0 | gift: Växthuset | friend | – |
| wall-map | e:🗺️ | Kartan | wall | 0 | gift: Ut och åka | bounce | – |
| toy-telescope | e:🔭 | Kikaren | toy | 0 | gift: Fart och fläkt (a shooting star crosses the window) | telescope | – |
| neck-bow | e:🎀 | Rosetten | neck | 0 | gift: Huvud och fötter | – | .30/.58 |
| hat-gradcap | e:🎓 | Klokmössan | hat | 0 | gift: Kroppens hemligheter | bounce | .58/−.34/−8 |
| wall-clock | e:⏰ | Väckarklockan | wall | 0 | gift: Ett till tio (shows the real time) | clock | – |
| garland-numbers | css:numberBunting | Sifferslingan (1–20) | garland | 0 | gift: Elva till tjugo | bounce | – |
| garland-abc-sv | css:letterBunting(sv) | Bokstavsvimpeln – svenska | garland | 0 | gift: ABC på svenska full | bounce | – |
| garland-abc-en | css:letterBunting(en) | Bokstavsvimpeln – engelska | garland | 0 | gift: ABC på engelska | bounce | – |
| garland-abc-el | css:letterBunting(el) | Bokstavsvimpeln – grekiska | garland | 0 | gift: ΑΒΓ på grekiska | bounce | – |
| garland-abc-ru | css:letterBunting(ru) | Bokstavsvimpeln – ryska | garland | 0 | gift: АБВ på ryska | bounce | – |
| garland-abc-ar | css:letterBunting(ar) | Bokstavsvimpeln – arabiska | garland | 0 | gift: ابت på arabiska | bounce | – |
| toy-abacus | e:🧮 | Kulramen | toy | 0 | gift: Räknetåget full (counts 1–10 aloud with the number mp3s) | abacus | – |
| neck-beads | css:beads | Pärlhalsbandet | neck | 0 | gift: Pärlbandet full | – | .40/.56 |
| neck-medal | e:🏅 | Medaljen | neck | 0 | gift: all 11 spelmärken have a 🌱 frame | – | .30/.60 |
| hat-crown | e:👑 | Mästarkronan | hat | 0 | gift: all 11 spelmärken have a 👑 frame | bounce | .50/−.32/−6 |

- Gifts are shown in Stjärnboden as a silhouette with the condition ("Gåva när sidan Gården är full"), never with a price.
- `EMOJI_OK` allowlist (assertCatalog): 🧢👒🎩🧣💡🏮🌙📚🛋️🌈🌵🌷🌱🌿🌳⚽🧸🥁🎹🐞🦊🦌🐥🐹🌍🦡🧺🐛🌴🌻🐌🗺️🔭🎀🎓⏰🧮🏅👑. `EMOJI_DENY`: 🪑🪴🪺🪹🪟🪞🪶🪵🫙🪿🪁🪀.
- No nest item reuses a concept (answer-option) emoji. ⛑️ was dropped because its cross symbol is culturally loaded.
- Name originality (Pip, Hampus, Grävis, Slingan, Sävlig, Prick, Ruffa, Lövis): run a quick check before release, including against Lär med Nadira.

---

## 6. Data model

### 6.1 Types (`src/types.ts`, additive, string unions only)

```ts
export type StickerId = string;          // 'w:cat' | 'l:sv:0' | 'd:sv:7' | 'm:12' | 'c:3'
export type StickerFamily = "word" | "letter" | "digit" | "wagon" | "bead";
export type StickerPageId = string;      // 'djur-1' … 'abc-ar' | 'rakna-tag' | 'rakna-parlor' | 'marken' | 'mer'
export type SceneId = "meadow"|"table"|"orchard"|"garden"|"road"|"blueprint"|"chalk"|"poster"|"rails"|"string"|"shelf"|"plain";
export type ItemId = string;
export type NestKind = "hat"|"neck"|"light"|"garland"|"wall"|"window"|"furniture"|"floor"|"plant"|"toy"|"friend";
export type NestSlot = "hat"|"neck"|"lamp"|"garland"|"wallL"|"wallR"|"window"|"sill"|"shelf"|"floorL"|"floorR"|"rug"|"friend1"|"friend2"|"friend3";
export type WearSlot = "hat" | "neck";
export type CssArtId = "moss"|"sky"|"stool"|"frame"|"sunset"|"aurora"|"stripes"|"rainbowRug"|"stringLights"|"bunting"|"numberBunting"|"letterBunting"|"beads";
export type SvgArtId = "luva" | "nightcap" | "starhat";
export type ItemArt = { e: string } | { css: CssArtId; arg?: string } | { svg: SvgArtId };
export type TrickId = "bounce"|"lamp"|"piano"|"globe"|"abacus"|"drum"|"grow"|"clock"|"telescope"|"frame"|"friend";
export type NestItem = {
  id: ItemId; name: string; kind: NestKind; art: ItemArt; price: number;
  via: "shop" | "gift" | "start";
  gift?: { page: StickerPageId } | { badge: "medal" | "crown" };
  slots?: NestSlot[];
  wear?: { size: number; dy: number; dx?: number; rot?: number };   // em of the owl
  trick?: TrickId;
};
export type OwnedSticker = { at: string; p: 0 | 1; pt?: number; via?: "gift" | "backfill"; parts?: 1 | 2 | 3; tricky?: 1 };
export type Met = { g: GameId[]; l: LangCode[]; gold?: 1 };
```

### 6.2 Static catalogs

**`src/data/stickers.ts`** starts with the Swedish ethics comment (§8). It exports:
- `wordId`, `letterId`, `digitId`, `wagonId`, `beadId`, `parseStickerId(id) → {family, …} | null`
- `WORD_PAGE_DEFS` (the table in §4.A) and `BOOK_PAGES: BookPage[]`, built at module load
- `PAGE_BY_ID`, `PAGE_OF_STICKER: Map<StickerId, StickerPageId>`, `STICKER_IDS: Set`, `TOTAL_SLOTS` (= 379)
- `WAGON_LABELS[20]`, `countingMax(L)`
- `TOFU_RISK`, `BACKFILL_WORD_CAP = 24`, `WORD_GAMES: Set<GameId>` (the 8)
- `CATEGORY_PRAISE` (animals → "djurord", food → "matord", fruit → "fruktord", vegetables → "grönsaksord", vehicles → "fordonsord", body → "kroppsord", numbers → "sifferord")
- `TRICK_BY_FAMILY`
- DEV `assertStickerCatalog()`

```ts
type BookPage = { id: StickerPageId; group: "ord"|"bokstaver"|"rakna"|"marken";
  title: string; emoji: string; scene: SceneId; lang?: LangCode;
  shelves: { label: string; icon: string; ids: StickerId[] }[];
  gift?: ItemId; praise: string; derived?: true };
```

**`src/data/nestItems.ts`** starts with the ethics comment. It exports:
- `NEST_ITEMS`, `ITEM_BY_ID`, `KIND_SLOTS`, `slotsFor(item)`
- `NEST_SLOTS` (§7.4 coordinates), `DEFAULT_SLOTS = { rug: "start-moss", window: "start-sky" }`
- `DRAWER_TABS`, `WELCOME_CAP = 60`, `EMOJI_OK`, `EMOJI_DENY`
- `isStarter(id)`, DEV `assertCatalog()`

**DEV asserts** throw in `import.meta.env.DEV` only:
- unique ids
- valid kind and slots (`slots ⊆ KIND_SLOTS` semantics)
- prices: shop > 0, gift/start = 0
- every `gift.page` exists, and every page gift maps to exactly one item (1:1)
- every hat or neck item has `wear`
- every `e:` emoji is in `EMOJI_OK`
- every concept is on exactly one page (or on "mer")
- every placeable sticker id is on exactly one page

### 6.3 `useRewards` (`src/stores/useRewards.ts`, **not persisted**)

```ts
export type Reveal = {
  n: number; key: string; pouch: number;
  word: { chosen: StickerId; options: StickerId[] } | null;   // options [] = no choice row
  rain: StickerId[];                                           // letters/digits/wagon/bead granted now
  upgrades: { s: StickerId; kind: "blank" | "gold" | "lower" | "tricky" }[];
  badges: { game: GameId; band: Band | 0 }[];                  // 0 = medallion lit for the first time
  gifts: ItemId[];                                             // medal/crown only
  praise: string; allKnown: boolean;
};
// state: { last: Reveal | null; show(r: Omit<Reveal,"n">); setChosen(id); clear() }
export const hasRevealContent = (r: Reveal | null) => !!r && (r.pouch > 0 || !!r.word || r.rain.length > 0 || r.upgrades.length > 0 || r.badges.length > 0 || r.gifts.length > 0 || r.allKnown);
```

`finish()` **always** overwrites `last`, even with an empty reveal. `useLesson.reset()` calls `clear()`. A reload clears it, so a stale reward can never show.

### 6.4 `useNest`: persist `"nabu-nest"`, version 1, `createJSONStorage(() => safeStorage)`

```ts
type OwnedItem = { at: string; via: "buy" | "gift"; paid: number };   // starters are implicit
type NestState = {
  earned: number;                     // monotonic
  welcome: number | null;             // null = not seeded yet (sentinel); reset() → 0
  introDone: boolean;
  owned: Record<ItemId, OwnedItem>;
  slots: Partial<Record<NestSlot, ItemId>>;   // incl. hat/neck
  lampOn: boolean;
  wish: ItemId | null;
  grow: Record<ItemId, 0 | 1 | 2>;
  seedOnce(stars: Record<string, number>): void;
  earn(n: number): void;
  addTestStars(n: number): void;      // Admin only
  buy(id: ItemId): boolean;
  returnItem(id: ItemId): void;
  gift(ids: ItemId[]): void;
  place(id: ItemId, slot: NestSlot): void;
  stow(slot: NestSlot): void;
  toggleLamp(): void; water(id: ItemId): void; setWish(id: ItemId | null): void; finishIntro(): void; reset(): void;
};
```

Pure selectors live in `lib/rewards.ts`:
- `isOwnedItem(s, id) = isStarter(id) || !!s.owned[id]`
- `balanceOf(s) = Math.max(0, s.earned − Σ paid of via 'buy')`
- `spentOf(s)`
- `wornItem(s, slot)`: returns null unless the item is known, owned and of the right kind.

Action rules:
- `seedOnce`: if `welcome !== null` return. Otherwise `w = min(sumStars(stars), WELCOME_CAP)`, then `set({ welcome: w, earned: earned + w, owned })`, where `owned` also gets `seedGifts(stars)` (Medaljen/Mästarkronan when already earned, §2.5). Persist writes immediately. It is called on the **module tail**: `useNest.getState().seedOnce(useProfile.getState().stars)`. This is safe because localStorage hydration is synchronous and `useProfile` is imported first.
- `buy`: decide inside the `set` updater, using a local `ok` flag. The id must be known, `via === 'shop'`, not owned, and `balance ≥ price`. Then `owned[id] = {at: todayStr(), via:'buy', paid: price}`, and `wish` is cleared if it matches. Return `ok`.
- `returnItem`: buy items only. Delete `owned[id]` and clear every slot holding it. The refund is implicit.
- `gift`: idempotent (`owned[id] ??= {via:'gift', paid:0}`). Non-wear items auto-place into the first free slot of `slotsFor(item)`; wear items are never auto-equipped.
- `place`: the item must be owned (or a starter) and `slot ∈ slotsFor(item)`. Remove it from any other slot, then set the slot. A displaced item stays owned ("Förrådet").
- `reset()`: `{ earned: 0, welcome: 0, introDone: false, owned: {}, slots: DEFAULT_SLOTS, lampOn: false, wish: null, grow: {} }`.
- `migrate`: pass-through.
- `merge`: `{...current, ...persisted}`, then sanitize:
  - drop unknown owned ids;
  - drop slots whose item is unknown, unowned or in a wrong slot;
  - wish must be a known, unowned shop item, else null;
  - grow only for known ids.

### 6.5 `useStickers`: persist `"nabu-stickers"`, version 1

```ts
type StickerState = {
  owned: Record<StickerId, OwnedSticker>;
  met: Record<string /*conceptId*/, Met>;
  donePages: StickerPageId[];
  intro: { found: number; seen: boolean } | null;   // null = not seeded (sentinel)
  seedOnce(stars: Record<string, number>): void;
  apply(plan: LessonPlan): void;
  choose(oldId: StickerId, newId: StickerId, options: StickerId[]): boolean;
  place(id: StickerId): StickerPageId | null;       // returns completed page
  placeAll(pageId: StickerPageId): StickerPageId | null;
  markIntroSeen(): void; reset(): void;
};
```

**Seeding.** On the module tail, `useStickers.getState().seedOnce(useProfile.getState().stars)`. If `intro !== null` it returns. Otherwise it sets `owned = backfillStickers(stars, today)` and `intro = { found: backfilled count excluding w:owl, seen: false }`, written immediately.

**`backfillStickers` is pure and reads only regular keys with value > 0:**
- `math:all:L` gives `m:L`; `counting:all:L` gives `c:L`.
- `trace:trace-<lang>:L` with L ≤ 12 gives the exact letters or digits from `fixedTraceItems(lang, L)`, with parts. Levels 13–20 are skipped because their items were random.
- Words, for the 8 word games:
  - For each (category, band), n = the number of distinct cleared `(game, level)` keys in that band. Eligible = the first `min(n, shelfSize)` concepts of that (category, band) in CONCEPTS order.
  - Each `adventure`/`blandad` key in a band adds one more concept round-robin across `REAL_CATEGORIES`, skipping exhausted shelves.
  - Merge in order: band ascending, then round-robin across categories. Take the first `BACKFILL_WORD_CAP = 24`.
- Always add `w:owl` = `{ p: 1, via: 'gift' }`.
- Everything else gets p:0, so it waits in Kuvertet.

**`apply(plan)`** is a single `set()`: grant (`??=` with `at: plan.today, p: 0`), patch parts and tricky, merge `met`.

**`choose(oldId, newId, options)`** succeeds only if `owned[oldId]?.p === 0`, `newId` is in `options`, and `!owned[newId]`. It then deletes old and adds new with the same `at`.

**`place(id)`**:
- Sets `p: 1, pt: Date.now()`.
- If the sticker's page is not in `donePages` and `pageComplete(page, owned)`, it appends the page to `donePages`. After the `set`, it calls `useNest.getState().gift([page.gift])`.
- Calling `useNest` from a tap handler is fine, and `useNest` never imports `useStickers`.

**`reset()`**: `{ owned: { "w:owl": { at: today, p: 1, via: "gift" } }, met: {}, donePages: [], intro: { found: 0, seen: true } }`. It never re-seeds.

**`merge` with the placed-latch:**
- Keep an `owned` entry if its id is in `STICKER_IDS` **or `p === 1`**. A placed sticker never disappears; unknown placed ids are kept but hidden.
- `met` keeps only known concepts; `donePages` keeps only known pages.

**Sizes:** the stores together stay under about 25 KB. Writes happen only on discrete actions, never on pointermove.

### 6.6 Pure helpers

`src/lib/progress.ts` (additive):

```ts
export function parseLessonKey(key: string): { game: GameId; category: string; level: Level; gold: boolean } | null; // split(':'), 3–4 parts, 4th must be 'gold', game ∈ GAMES, 1 ≤ level ≤ 20; category may be 'all' | 'adventure' | 'trace-ar'
export function sumStars(stars: Record<string, number>): number;
```

`src/lib/rewards.ts`: no React, no stores, no `import.meta`. It can be checked with bun.

```ts
export type LessonInput = { game: GameId; category: string; level: Level; gold: boolean; stars: number; rounds: number;
  lang: LangCode; words: string[]; trace: TraceLevel | null };
export type LessonPlan = { today: string;
  grant: { id: StickerId; parts?: 1 | 2 | 3; tricky?: 1 }[];
  patch: { id: StickerId; set: { parts?: 1 | 2 | 3; tricky?: 1 } }[];
  met: Record<string, Met>; gifts: ItemId[];
  reveal: Omit<Reveal, "n" | "key" | "pouch"> };
export function planLesson(i: LessonInput, st: { owned: Record<StickerId, OwnedSticker>; met: Record<string, Met> },
  before: Record<string, number>, after: Record<string, number>, today: string): LessonPlan;
export function wordCandidates(practised: string[], level: Level, owned: Record<StickerId, OwnedSticker>): string[];
export function traceGrants(lang: LangCode, level: Level, items: string[], owned: Record<StickerId, OwnedSticker>): Pick<LessonPlan, "grant" | "patch"> & { upgrades: Reveal["upgrades"] };
// char → index: upper.indexOf(c) ≥ 0 ⇒ part 1 (3 if lower === null); else lower.indexOf(c) ⇒ part 2; levels 13–15 also tricky:1
export function conceptIdByLabel(lang: LangCode, label: string): string | undefined; // same rule as TraceGame
export function badgeBands(stars: Record<string, number>, game: GameDefinition): Band[]; // any path of pathsFor(game, CATEGORY_IDS incl. blandad, LANG_CODES) with all 5 levels of the band > 0
export function medallionLit(stars: Record<string, number>, game: GameDefinition): boolean;
export function medalOk(stars: Record<string, number>): boolean;   // every game has band 1
export function crownOk(stars: Record<string, number>): boolean;   // every game has band 4
export function praiseFor(i: LessonInput, nWords: number, traced: string[]): string;
export function backfillStickers(stars: Record<string, number>, today: string): Record<StickerId, OwnedSticker>;
export function pageProgress(page: BookPage, owned: Record<StickerId, OwnedSticker>): { placed: number; owned: number; total: number };
export function pageComplete(page: BookPage, owned: Record<StickerId, OwnedSticker>): boolean;  // every slot p === 1
export function trayIds(owned: Record<StickerId, OwnedSticker>): StickerId[];                     // p === 0 && PAGE_OF_STICKER.has(id), insertion order
export function isBlank(m?: Met): boolean;                                                         // (m?.g.length ?? 0) >= 3
export function balanceOf(s: Pick<NestState, "earned" | "owned">): number;
```

**Praise** is about process, never ability:
- Word games: "Du övade {n} {djurord…}!". Adventure/blandad: "Du övade {n} ord på äventyret!"
- Trace letters: "Du spårade A, B, C och D!"; trace words: "Du spårade {n} ord!"
- Math: "Du löste {rounds} tal!"; counting: "Du räknade {rounds} gånger!"
- When stars === 1, prefix "Du gav inte upp! ".

**Lesson-word sources:**
- Word games: `lastLessonWords(category)` (new export in concepts.ts, resolving `adventure` → `blandad`).
- Trace levels 16–20: `lastTraceItems(lang, level)?.items` mapped through `conceptIdByLabel`.
- Trace levels 1–15: `lastTraceItems(...)`. If it is null, levels ≤12 fall back to `fixedTraceItems`; levels 13–15 grant nothing.

### 6.7 Settings (`useSettings`, no version bump; merge fills in defaults)

Add `shopOn: true` ("Stjärnboden") and `hatInGames: true`, with setters.

### 6.8 Reset and admin hooks

| Admin action | Calls | Confirm copy |
|---|---|---|
| 🔄 Börja om | `resetProgress(); resetStats(); useStickers.getState().reset(); useNest.getState().reset(); useRewards.getState().clear()` | "Börja om från början? Stjärnorna på stigarna, XP och streak, klistermärkesboken och Nabus bo nollställs." |
| Rensa allt | `resetProfile(); resetStats(); stickers.reset(); nest.reset(); rewards.clear(); navigate('/')` | "Rensa allt – namn, avatar, stjärnor, XP, klistermärkesboken och Nabus bo? Appen börjar om från start." |
| 🗝️ Lås upp alla nivåer | unchanged (`unlockAll(keys)`, stars only) | sub-label: "För att testa. Ger inga klistermärken och inga stjärnor i påsen. Märkeshyllans ramar visas som klara." |
| + 50 ⭐ i påsen (test) | `useNest.getState().addTestStars(50)` | – |

Because all four reset together, a reset cannot be used to re-farm stars. Neither reset re-seeds, because the sentinels are non-null.

---

## 7. UI

### 7.1 Routes and navigation

**`App.tsx`** adds these before `*` (vercel.json already rewrites to index.html):
- `/stickers` → `StickerBook`
- `/stickers/:pageId` → `StickerPage`
- `/nest` → `Nest`

They are `React.lazy` with a local `<Suspense fallback={<main className="p-6" />}>`. **No global MotionConfig, and Routes are not wrapped.**

**BottomNav**, 4 items:
- Hem `/dashboard` (Home)
- **Boken** `/stickers` (BookOpen), also active on `/collection`
- **Boet** `/nest` (Bird)
- Inställningar `/settings` (Settings)

Details:
- Active check: `pathname === to || pathname.startsWith(to + "/")`, plus the extra match for /collection.
- Items are `flex-1 max-w-[110px] min-h-14 px-2 text-xs`.
- Boken gets a **static** count circle (rose-500, `<span dir="ltr">n</span>`, never animated) when the tray is non-empty, and the aria-label "Boken, 3 klistermärken att klistra in". Boet gets no badge.
- On `/stickers*` and `/nest` the nav uses a solid `bg-white dark:bg-zinc-900` (no backdrop-blur).

**Dashboard:** between MotivationCard and the game grid, add `grid grid-cols-2 gap-3`:
- **"📖 Klistermärkesboken"** card: "{words owned} ord", plus a static chip "{tray} att klistra in" if the tray is non-empty.
- **"Nabus bo"** card: a mini `<Mascot mood="still" className="text-4xl"/>` with the hat, plus "[pouch] {balance} i påsen" (the balance is hidden when shopOn is off).
- Both are rounded-3xl `Link`s, at least 72 px tall, never pulsing.

**MotivationCard:** wrap the Mascot in `<Link to="/nest" aria-label="Besök Nabus bo" className="rounded-full p-1">` (≥48 px). `⭐ {xp} XP` becomes `{xp} XP`.

**Collection:** add a header link "📖 Till klistermärkesboken" → /stickers, and the label "stjärnor på stigarna". **LevelPicker** line 67 gets the label "på stigen". Neither shows sticker or item previews.

### 7.2 Book index (`/stickers`)

The root is wrapped in `<MotionConfig reducedMotion="user">` with `dir="ltr"`, and uses `pb-24`.

- **Header:** BackButton → /dashboard. Title "{name}s klistermärkesbok" (fallback "Min klistermärkesbok"), with the child's avatar on a cover sticker.
- **Intro banner** (once, when `!intro.seen`), with an "Okej!" button that calls `markIntroSeen()`:
  - found > 0: "Nabu har sparat {found} klistermärken åt dig från allt du redan lärt dig! Klistra in dem en och en – eller alla på en gång."
  - else: "Nabu har gett dig sitt eget klistermärke – det sitter redan i boken!"
- **Kuvertet chip:** "{n} väntar i kuvertet" → `/stickers/<page of oldest tray id>?place=<id>`.
- **Groups and tiles:**
  - Ord: 16 pages, plus "Fler ord" if non-empty.
  - Bokstäver: visible posters, plus a collapsed "Fler språk" disclosure.
  - Räkna: 2 pages. Märken: Märkeshyllan.
  - Tiles are `grid-cols-2 sm:grid-cols-3` and ≥96 px. Each shows the emoji, title, `<span dir="ltr">6 av 10</span>`, an SVG progress ring (same style as LevelRing), and the gift art in a small static corner.
- **Link card:** "🗺️ Mina stigar" → /collection.

### 7.3 Book page (`/stickers/:pageId`)

**Layout:**
- Header: BackButton → /stickers; title and emoji; "{placed} av {total}"; band dot strip (Collection style); gift tag "Klar sida → 🐥 Pip flyttar in i Nabus bo".
- Body: the scene background class `.scene-<id>`, with a variant under `html.dark`. Shelves are rendered as labelled band rows ("🌱 Första stegen").
- Slot grid: `grid-cols-4 sm:grid-cols-5 md:grid-cols-6`, slots ≥76 px square with gap-3. Posters use `grid-cols-4 sm:grid-cols-6 md:grid-cols-8`, and only the ar grid gets `dir="rtl"`. Vertical scroll is allowed.

**Slot states:**
- Placed: `<Sticker>` with tier overlays, plus the word label in the learning language (`lang`, `dir`).
- Empty: a `<button>` with a dashed 2 px border (zinc-500 light, zinc-400 dark, ≥3:1 on scenes), `bg-white/60 dark:bg-zinc-900/40`, a silhouette (`.sticker-ghost`) and the word label. This makes placement a shape-and-word match.

**Kuvertet tray:**
- `fixed inset-x-0 bottom-[var(--nav-space)] z-30 h-[var(--tray-h)]` (68 px nav + 104 px tray; 52 + 80 px on a landscape phone, plus the home indicator via `--safe-b`, see `src/index.css`), solid background, `dir="ltr"`, horizontal scroll, 80 px items (64 px on a landscape phone).
- This page's stickers come first, then a chip "{n} till andra sidor →".
- Tapping a sticker that belongs to another page navigates `replace` to that page with `?place=id`, so the page turns automatically before the matching step.
- Page content uses `pb-nav-tray` (190 px in portrait; follows `--nav-h`/`--tray-h`).

**Placement flow (tap-only path required, WCAG 2.5.7):**
1. Tap a tray sticker: it lifts (`aria-pressed`, scale 1.1), the word is spoken (`speak(label, lang, conceptId)`), its band row is tinted, and empty slots brighten steadily (no pulse).
2. Tap the correct slot: a shared-element flight (framer `layoutId`, ≈450 ms), a slap landing (scale 1.15 → .94 → 1, spring 500/22), `playStick()`, the word is spoken, and `place(id)` is called.
3. Tap a wrong slot: it wiggles (`.animate-wiggle-soft`) and speaks its own word, and the selection stays. After **2 misses** the correct slot gets a gold dashed ring, and the hint "Titta efter formen!" appears in a Nabu bubble (spoken in sv). Placement therefore always succeeds.
4. Tapping the lifted sticker again, or pressing Esc, cancels.
5. "Sätt in alla" appears when ≥3 of this page's stickers wait. It places them in a cascade 120 ms apart, playing a stick sound but no speech.
6. Optional extra (only if time allows): drag from the tray with `dragMomentum={false}` and `dragSnapToOrigin`. A drop near the correct slot (within 0.75 × slot size) places the sticker; anything else snaps back to the tray with no miss counted. Use pointer clientX/Y, or `info.point` minus scroll. Write to the store on drop only.

**Paging:**
- Big ‹ › buttons (≥72 px) at the bottom corners move through the index order. Page order is never mirrored.
- Swipe: `drag="x"` on the page body (touch-action pan-y keeps vertical scroll) with `dragConstraints {0,0}` and `dragElastic .5`. It pages when `|offset.x| > 25%` of the width or `|velocity.x| > 500` px/s. **Swipe is off while a sticker is lifted.**

**Living stickers.** Tapping a placed sticker plays the family trick and speaks:

| Family | Trick | Speech |
|---|---|---|
| Animals | hop | word (mp3) |
| Vehicles | drive (out and back) | word (mp3) |
| Fruit, vegetables | roll | word (mp3) |
| Food | wobble | word (mp3) |
| Body | wiggle | word (mp3) |
| Numbers | bounce | number word (mp3) |
| Letters | flip (shows the other case for 1 s) | letter, sv/lang Web Speech; may be silent offline |
| Wagons | chug | label, sv Web Speech |
| Beads | spin | `hi` number mp3 |
| Medallions | sheen | game name |

**Ordkortet** (word stickers only): a bottom sheet, `role="dialog"`, `dir="ltr"`, ✕ 48 px, closed by Esc or an outside tap. It shows:
- the big sticker with tiers;
- the Swedish name;
- 5 rows of language name text (no flags, which fail on Windows) + word (`lang`/`dir`) + 🔊 button (48 px, mp3);
- "Övat i:" with the game emojis (aria uses names);
- language stamps;
- "Blank: övat i 3 olika spel (2/3)" and "Guldkant: klara ett guldspel där ordet finns ○/✓";
- "Fick: {date sv-SE}".

**Page complete:**
- Every sticker on the page wiggles in a 40 ms staggered wave, and `celebrate()` fires.
- A banner with a hatted Mascot shows the page praise, then a gift card ("🐥 Pip flyttar in i Nabus bo!" or "{Item} finns nu i Nabus bo!") with a "Titta i boet" link.
- The polite live region announces it.

### 7.4 Nest scene (`/nest`)

**Container:**
- `<MotionConfig reducedMotion="user">` root.
- The scene is `dir="ltr"`, `relative aspect-[4/3] w-full max-w-xl mx-auto overflow-hidden`, with an arched radius, a bark rim and an inset shadow.
- Logical coordinates are 400×300. A ResizeObserver sets `--u = width/400 px` on the container, and items use `font-size: calc(var(--u) * size)`. No `cqi` dependency, so iOS 15 works.
- The background SVG uses `viewBox 0 0 400 300`. Layers, back to front: walls (wood-ring gradient) → window → garland → wall items → shelf plank → floor items → rug → friends → Nabu → wear → lamp glow (`mix-blend-mode: screen`, pointer-events none).
- Under `html.dark` the walls darken and the window shows `.stars` + 🌙.
- The glow is a radial `rgb(255 214 120/.45)` in dark mode and `.18` in light. It is drawn only when `lampOn` is true and a light is in the lamp or shelf slot. This is the real reason to own a lamp. There is **no** dozing or sad owl in the dark.

**Slots.** Starting values, to tune visually. y is the anchor point.

| Slot | x,y | Anchor | Size (u) | Swedish aria |
|---|---|---|---|---|
| garland | 200,18 | top, spans 60–340 | – | Girlangen |
| lamp | 92,10 | top (hangs) | 34 | Lampkroken |
| window | 200,84 | center, 110×80 frame | – | Fönstret |
| sill | 200,128 | bottom | 30 | Fönsterbrädan |
| friend3 | 318,92 | bottom (on a branch) | 32 | Grenen |
| wallL | 64,128 | center | 48 | Vänstra väggen |
| wallR | 336,140 | center | 48 | Högra väggen |
| shelf | 330,200 | bottom (plank at 200) | 32 | Hyllan |
| (Nabu perch, scene art) | 200,262 | bottom | 80 | – |
| friend1 | 130,284 | bottom | 38 | Vänplatsen till vänster |
| friend2 | 270,284 | bottom | 38 | Vänplatsen till höger |
| floorL | 52,282 | bottom | 54 | Golvet till vänster |
| floorR | 348,282 | bottom | 54 | Golvet till höger |
| rug | 200,288 | center ellipse 170×24 | – | Mattan |

Bottom-anchored items use `translate(-50%,-100%)`. Shelf planks are about 0.15 em thick, which hides baseline differences between emoji fonts.

**Header and controls:**
- "Nabus bo" plus the pouch chip ("[pouch] 12 i påsen"). Tapping the chip shakes the pouch and speaks the count.
- The wish line appears **only here**: "💛 Pianot – 18 av 50".
- A segmented control (≥56 px) offers **Titta | Pynta | Stjärnboden** (Stjärnboden is hidden when `shopOn` is false).

**Titta** (default):
- Tapping an item speaks its Swedish name and plays its trick:
  - lamp toggles `lampOn` and plays `playLamp`
  - piano plays C-E-G
  - globe plays owl.mp3 in sv, en, el, ru, ar at 900 ms intervals
  - abacus counts 1–10 in the learning language at 800 ms steps
  - drum plays `playDrum` and bounces
  - grow: 3 taps (water drops) advance one stage
  - clock shows a "HH:MM" bubble
  - telescope sends a CSS shooting star across the window
  - frame speaks the 4 words shown
  - friend hops, chirps and says its name
- Tapping Nabu starts a gentle retrieval prompt that rotates oldest-first through owned word stickers (in-memory index). The bubble shows "Minns du? 🐱". The next tap reveals and speaks the word in the learning language with Swedish small below. The third tap cheers. With no words the bubble says "Hoo-hoo! Vad mysigt det är här!". There is no score.

**Pynta:**
- A drawer below the scene (not a modal) with 4 tabs: "På Nabu" (hat, neck), "Ljus & väggar" (light, garland, wall, window), "Möbler & saker" (furniture, floor, plant, toy), "Vänner".
- Owned cards are ≥96 px. Tapping one makes its valid slots glow steadily and dims the others; tapping a slot places it with `playPlace` and a bounce.
- Items with a single valid slot (hat, neck, window, rug, garland) apply immediately. Tapping a worn item again takes it off.
- Tapping a placed item in the scene shows a popover [Ställ undan].

**Stjärnboden:**
- The same 4 tabs, listing every item. Owned items show "✓ Din". Gifts show a silhouette and their condition. Shop items show their price per §3.
- Tapping a shop item gives a **free preview**: a hat appears on Nabu through `<Mascot wear={{hat:id}}>`, or the item appears as a 70% ghost in its first valid slot. The ItemSheet then shows "Kepsen · 8 ⭐ · Du har 12 i påsen" and speaks the price.
  - Affordable: **"Köp för 8 ⭐"** and **"Nej tack"**, the same size.
  - Not affordable: "Du har 5 i påsen. Den kostar 8." with "💛 Önska" and "Nej tack".
- On buy: stars fly from the pouch to the item (a fade under reduced motion), `playBuy` plays, and the item is auto-placed (first free valid slot, else the first valid slot, and the displaced item goes to the drawer). "↩️ Ångra" stays visible while the sheet is open.
- Every bought item's sheet always offers "Lämna tillbaka", a 100% refund. Copy reads "kvar i påsen"; no red minus numbers.

### 7.5 First nest visit (`!introDone`)

1. Nabu bubble: "Välkommen hem till mig! Här får du göra fint."
2. If `welcome > 0`: "Jag har sparat {welcome} stjärnor i påsen åt dig!"
3. "Nya stjärnor du får på stigarna hoppar ner i påsen – och stjärnorna på stigen finns kvar!"
4. "Titta, en mössa till mig – tryck på den!" Nabus luva is shown with a static highlight. Tapping it wears it, plays `playPlace`, and calls `finishIntro()`.

From then on the hat shows in every game. The child can take it off.

### 7.6 VictoryScreen reveal (`RewardStrip.tsx`)

**Placement and layout:**
- Inserted after the XP `<p>` (around line 66) and before `<LevelUpBanner/>`. It reads `useRewards.last`. No props change on the 11 pages.
- When `hasRevealContent(last)`: `main` goes `gap-6` → `gap-4`, the owl box `h-44 w-44` → `h-32 w-32`, and Mascot `text-8xl` → `text-7xl`. These are decided at mount (the reveal is set before `setDone`), so there is no layout jump.
- The 🎉/🥇 badge moves from `-right-1 -top-1` to `-right-1 -bottom-1` when a hat is worn and `hatInGames` is on.
- Button order is unchanged. Nothing about the nest is teased.

**Strip:**
- Root `dir="ltr"`, inside a local MotionConfig, `w-full max-w-sm`, **at most about 124 px tall**.
- The container renders immediately with its final min-height. The contents fade and slide in at **0.9 s** (after the star pops). The buttons are never blocked.

| Case | Content |
|---|---|
| Word choice (2–3) | Row 1: "Välj ett ord till din bok" + pouch chip. Row 2: 2–3 cards (76×80: emoji text-4xl + word text-[11px] in the learning language, curled CSS corner, fixed tilt from an id hash). The default card is shown peeled and ringed. Tapping any card calls `choose()`, speaks the word and plays `playPeel`. After the first tap the caption becomes "Klart! De andra orden kommer när du övar igen." Row 3: the praise line, or ≤2 chips. |
| Single sticker | A 72 px sticker card, "Nytt klistermärke!", the word (learning language, Swedish small), "Tryck för att höra", the pouch chip and ≤3 chips. |
| Rain | Up to 7 tiles of 40 px (letters, digits, wagon or bead) with a per-tile tick, plus praise, pouch chip and chips. |
| Pouch only | One line: "[pouch] +2 i påsen". |
| allKnown | "Alla orden finns redan i din bok – bra repetition!" |

- **Chips** (max 3, priority gifts > badges > upgrades; overflow becomes "+2 till i boken"):
  - "🎁 Medaljen flyttar in i boet"
  - "🃏 fick en 🚀-ram!" / "Nytt spelmärke: 🃏 Para ihop"
  - "✨ katt blev blank!" / "🥇 katt fick guldkant!" / "Aa – nu kan du både stor och liten bokstav!" / "Kluring-ram på B!"
- **Sound:** `playPeel()` is delayed 900 ms after `playLevelUp`, and only plays when a sticker was granted. Words are spoken **only** when the child taps.
- **a11y:**
  - an sr-only `role="status" aria-live="polite"` summary, e.g. "Nytt klistermärke: katt. Två stjärnor till påsen.";
  - cards are `<button aria-pressed>` with the label "Välj katt";
  - reduced motion means opacity only;
  - no "Sätt in nu" button (it is optional later and needs an owner decision).

### 7.7 The owl and its hat everywhere

| Place | Owl renderer | Hat | Neck |
|---|---|---|---|
| VictoryScreen.tsx:47 (all 11 games) | Mascot cheer text-8xl / text-7xl | ✓ (plain if `!hatInGames`) | ✓ |
| Coach.tsx:57 (all 11 games) | literal replaced by `<Mascot mood="still" only={["hat"]}/>` inside the existing motion.span; container, footprint, `dir="ltr"` and `rtl:left-4` unchanged | ✓ (plain if `!hatInGames`) | ✗ |
| MotivationCard.tsx:27 (Dashboard) | Mascot idle text-5xl | ✓ | ✓ |
| Dashboard nest card | Mascot still text-4xl | ✓ | ✓ |
| Nest scene and shop preview | Mascot at `calc(var(--u)*80)`, with `wear` override | ✓ | ✓ |
| Book banners (page party) | Mascot cheer text-5xl | ✓ | ✓ |
| Admin DEV hat grid | Mascot text-5xl and text-8xl per hat | ✓ | ✓ |
| Welcome.tsx:22 | `<Mascot plain/>` | ✗ | ✗ |
| MemoryGame.tsx:242 card back, avatar 🦉 (avatars.ts, useProfile DEFAULT_AVATAR), concept `owl`, public/icon.svg | unchanged | ✗ | ✗ |

**Mascot implementation.** Keep the outer animated `<span aria-hidden class="inline-block select-none animate-bob|cheer …">` exactly as it is. Inside it:

```tsx
<span dir="ltr" className="relative inline-block leading-none">
  🦉
  {hat && <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
     style={{ transform: `translate(${fit.dx ?? 0}em, ${fit.dy}em)` }}>
     <span className="block leading-none" style={{ fontSize: `${fit.size}em`, transform: `rotate(${fit.rot ?? 0}deg)` }}><ItemArt art={hat.art} /></span>
  </span>}
  {/* neck likewise, z after the owl */}
</span>
```

- Props: `mood`, `className`, `plain?: boolean`, `wear?: Partial<Record<WearSlot, ItemId | null>>` (preview override), `only?: WearSlot[]`.
- It reads `useNest(s => s.slots.hat / .neck)`, validated through `wornItem`. SVG hats are `<svg width="1em" height="1em">`.
- No canvas readback is used. An optional owlMetrics hint (fallback 0) is not part of v1.

### 7.8 Animation, sound, theme, RTL, motion, a11y

**framer-motion:** springs 260/18 (peel-in), 500/22 (stick), whileTap 0.95. Animate transform and opacity only, and never the filter. The lift shadow is a separate blurred ellipse span.

**CSS keyframes** (index.css):
- `sticker-slap`, `sticker-hop`, `sticker-drive`, `sticker-roll`, `sticker-wobble`, `sticker-wiggle`, `sticker-flip`, `sticker-chug`, `sticker-spin`, `wiggle-soft`, `sheen` (2 iterations only), `page-wave`, `item-bounce`, `pouch-shake`, `shooting-star`
- `.animate-*` classes for each

**Every** new `.animate-*` class goes into the `@media (prefers-reduced-motion: reduce)` block, plus `.sticker-shine{animation:none;opacity:.35}`.

```css
.sticker{--ol:max(2px,.055em);position:relative;display:inline-grid;place-items:center;line-height:1;
  filter:drop-shadow(var(--ol) 0 0 #fff) drop-shadow(calc(var(--ol)*-1) 0 0 #fff) drop-shadow(0 var(--ol) 0 #fff) drop-shadow(0 calc(var(--ol)*-1) 0 #fff) drop-shadow(0 .05em .04em rgb(60 30 0/.28))}
.sticker--gold{filter:drop-shadow(var(--ol) 0 0 #ffd54a) drop-shadow(calc(var(--ol)*-1) 0 0 #ffd54a) drop-shadow(0 var(--ol) 0 #ffd54a) drop-shadow(0 calc(var(--ol)*-1) 0 #ffd54a) drop-shadow(0 .05em .04em rgb(60 30 0/.28))}
.sticker-ghost{filter:brightness(0) opacity(.16)}
html.dark .sticker-ghost{filter:brightness(0) invert(1) opacity(.18)}
```

- Tilt goes on a wrapper transform, hashed from the id as `((h%9)-4)deg`.
- The Blank sheen is an aria-hidden duplicate glyph span with a mask gradient, never `::after` content.
- Each scene class `.scene-<id>` has an `html.dark .scene-<id>` variant. Never use `prefers-color-scheme` here.

**`src/lib/sfx.ts`** additions, each following `if (!enabled()) return; try {…} catch {}`:

| Sound | Synthesis |
|---|---|
| `playPeel` | triangle sweep 1200 → 400 Hz over 120 ms |
| `playStick` | `tone(180,0,.05,"triangle",.12)` + `tone(140,.06,.06,"triangle",.1)` |
| `playBuy` | 523, 659, 784 sine at 0 / .08 / .16 |
| `playPlace` | `tone(520,0,.06)` + `tone(260,.04,.08,"triangle",.08)` |
| `playLamp` | `tone(1800,0,.02,"square",.05)` |
| `playDrum` | sine sweep 120 → 50 Hz over .25 s, gain .3 |
| `playNote(f)` | `tone(f,0,.3,"triangle",.12)` |
| `playChirp` | `tone(1400,0,.06)` + `tone(1800,.07,.06)` |

**`src/lib/celebrate.ts`:** add `disableForReducedMotion: true`.

**RTL:** the book chrome, nest scene and RewardStrip are all `dir="ltr"`, with stored logical coordinates that never mirror. Only word spans (`lang`, `dir={getLanguage(code).dir}`) and the Arabic poster grid are RTL. Numbers sit in `<span dir="ltr">`. Coach keeps `rtl:left-4`, and the hat stays inside the owl box.

**a11y:**
- Stickers are `role="img"` with aria-label "Klistermärke: katt". Empty slots are buttons labelled "Tom plats: hund". Tray items read "Sätt in katt". Nest slots read "Hyllan: tom" / "Hyllan: Bokhögen". Shop items read "Kepsen, 8 stjärnor, du har 12 i påsen".
- Announcements go to a polite live region per page: "Katt sitter nu på Gården, 7 av 9", "Du köpte Kepsen. 4 stjärnor kvar i påsen".
- Focus rings `focus-visible:ring-4 ring-purple-400`. Tab, Enter and Esc cover tray, slots, drawer and sheets.
- Target sizes: stickers and slots ≥72–80 px, shop and page tiles ≥96 px, nav ≥56 px, gaps ≥12 px.
- Nothing requires a long-press, pinch or swipe.

**Performance:**
- `Sticker` is wrapped in memo; filters are static; only the current page renders.
- One `layoutId` flight at a time; `will-change` only while lifted.
- The nav is solid on these routes.

---

## 8. File-by-file change list

### New files

| File | Contents |
|---|---|
| `src/data/stickers.ts` | Ethics header comment (below), pages and helpers per §6.2, DEV assert |
| `src/data/nestItems.ts` | Ethics header, catalog §5, slots §7.4, `WELCOME_CAP`, `EMOJI_OK`/`EMOJI_DENY`, DEV `assertCatalog` |
| `src/lib/rewards.ts` | Pure functions per §6.6 |
| `src/lib/emojiSupport.ts` | `supportsEmoji(e): boolean`: one 32×32 canvas, draw at 28 px, count pixels with alpha > 24 and `max(R,G,B) − min > 20`; ≥8 counts as supported. Cached in a Map; a thrown error means "supported". Used only for `TOFU_RISK`. |
| `src/lib/persist.ts` | `requestPersistOnce()`: a module flag, then `navigator.storage?.persist?.().catch(() => {})` |
| `src/lib/backup.ts` | `exportBackup()` gathers all localStorage keys starting with `nabu-` into `{app:"nabu",format:1,exportedAt,data:{key:raw}}` and downloads it as `nabu-sakerhetskopia-YYYY-MM-DD.json` (Blob). `importBackup(file)` validates the shape and that every value parses as `{state,version}`, then writes all keys and calls `location.reload()`. |
| `src/stores/useStickers.ts`, `useNest.ts`, `useRewards.ts` | §6.3–6.5, module-tail `seedOnce` for stickers and nest |
| `src/components/Sticker.tsx` | Renders any `StickerId`: word / WordBlob / NumberBadge / LetterTile / Wagon / Bead, in states placed, tray, ghost and lifted, with tiers |
| `src/components/StarPouch.tsx` | Original SVG drawstring pouch |
| `src/components/ItemArt.tsx` | Emoji / CSS art / SVG hats (luva, nightcap, starhat) |
| `src/components/OwlWear.tsx` | Hat and neck layers used by Mascot |
| `src/components/RewardStrip.tsx` | §7.6 |
| `src/components/book/StickerShelf.tsx`, `Kuvertet.tsx`, `WordCardSheet.tsx`, `PageParty.tsx`, `BadgeShelf.tsx` | Book page parts |
| `src/components/nest/NestScene.tsx`, `NestDrawer.tsx`, `ItemSheet.tsx`, `NestIntro.tsx` | Nest |
| `src/pages/StickerBook.tsx`, `StickerPage.tsx`, `Nest.tsx` | Routes |
| `scripts/check-rewards.ts` | `bun run scripts/check-rewards.ts`, node:assert on the §9 pure cases (there is no test runner today) |

Ethics comment, at the top of `stickers.ts` and `nestItems.ts`, in Swedish:

```ts
/**
 * ETIK – läs innan du ändrar:
 * 1. Inga förhandsvisningar: nivåer, Coach och vinstskärm lovar aldrig klistermärken eller saker före spel.
 * 2. Inga lockbeten: inga pulserande "Nytt!"-märken, inget "bara 2 kvar!", inga erbjudanden när barnet vill sluta.
 * 3. Inga timers: inget tidsbegränsat, roterande, säsongsbundet eller på rea.
 * 4. Ingen slump: alla belöningar och priser är bestämda och synliga i förväg.
 * 5. Inget kopplat till streak eller dagens mål.
 * 6. Inga riktiga pengar. Inget förfaller. Nabu är aldrig ledsen, hungrig eller "saknar dig".
 */
```

### Modified files

| File | Change |
|---|---|
| `src/hooks/useLesson.ts` | Add `doneRef` and the new `finish()` below. `reset()` also sets `doneRef.current = false` and calls `useRewards.getState().clear()`. |
| `src/data/concepts.ts` ⚠ (owner OK first) | **One additive export only** (below). |
| `src/data/alphabets.ts` (clean file) | Rename the body to an internal `buildTraceLevel`. `traceLevel()` calls it and records `lastTrace = {lang, level (clamped), items:[...], kind}`. Export `lastTraceItems(lang, level): TraceLevel \| null` (only when lang and level match) and `fixedTraceItems(lang, level): string[] \| null` (levels ≤12, no recording). Add a comment that TraceGame plays all items (chunks ≤7 = MAX_ROUNDS). |
| `src/lib/progress.ts` | `parseLessonKey`, `sumStars` |
| `src/types.ts` | §6.1 types |
| `src/stores/useSettings.ts` | `shopOn`, `hatInGames` plus setters; no version bump |
| `src/components/Mascot.tsx` | §7.7 (outer span unchanged) |
| `src/components/Coach.tsx` | Line 57 literal → `<Mascot mood="still" only={["hat"]} plain={!hatInGames}/>` inside the motion.span. Nothing else changes. |
| `src/components/VictoryScreen.tsx` | `<RewardStrip/>` before `<LevelUpBanner/>`; conditional `gap-4` / `h-32 w-32` / `text-7xl`; badge moves to the bottom when a hat is worn; `plain={!hatInGames}` |
| `src/components/MotivationCard.tsx` | Link to /nest; "XP" plain text |
| `src/components/BottomNav.tsx` | §7.1 |
| `src/components/LevelPicker.tsx` | Line 67 label: "⭐ {total} / {60} på stigen". No other change. |
| `src/pages/Dashboard.tsx` | Entry cards row |
| `src/pages/Collection.tsx` | Book link plus the "stjärnor på stigarna" label |
| `src/pages/Admin.tsx` | Framsteg: "XP" value without ⭐; new Stats "Klistermärken" (owned/379), "I påsen" (balance; small "intjänat {earned} · i saker {spent}"), "Saker i boet". Inställningar: toggles "Stjärnboden (köpa saker)" and "Visa Nabus hatt i spelen". Verktyg: §6.8 resets, unlockAll label, "+ 50 ⭐ i påsen (test)", "💾 Spara säkerhetskopia" / "📂 Läs in säkerhetskopia" (two-step confirm "Ersätt allt på den här enheten?"), and DEV-only "Visa alla hattar & saker" (every hat and neck item on Mascot at text-5xl and text-8xl, every catalog art, and a `TOFU_RISK` `supportsEmoji` readout) |
| `src/pages/Settings.tsx` | Parent tip: "Lägg Nabu på hemskärmen – då sparas boken och boet säkrare på den här enheten." |
| `src/pages/Welcome.tsx` | `<Mascot plain …/>` |
| `src/lib/sfx.ts`, `src/lib/celebrate.ts`, `src/index.css` | §7.8 |
| `src/App.tsx` | Lazy routes (§7.1) |

`useLesson.finish()`:

```ts
const finish = useCallback((category: string, level: Level, gold: boolean, rounds: number) => {
  if (doneRef.current) return;                       // dubbel/sen finish → no-op
  doneRef.current = true;
  const stars = starsFor(mistakesRef.current, rounds);
  const xp = stars * XP_PER_STAR * (gold ? 2 : 1);
  const key = lessonKey(game, category, level, gold);
  const before = useProfile.getState().stars;
  const prev = before[key] ?? 0;                     // läs FÖRE addStars
  addStars(key, stars);
  const after = useProfile.getState().stars;
  const pouch = Math.max(0, stars - prev);
  const traceLang = game === "trace" ? (category.slice(6) as LangCode) : null;
  const plan = planLesson({ game, category, level, gold, stars, rounds,
      lang: traceLang ?? useSettings.getState().lang,
      words: WORD_GAMES.has(game) ? lastLessonWords(category as PlayCategory) : [],
      trace: traceLang ? lastTraceItems(traceLang, level) : null },
    useStickers.getState(), before, after, todayStr());
  if (pouch > 0) useNest.getState().earn(pouch);
  useStickers.getState().apply(plan);
  if (plan.gifts.length) useNest.getState().gift(plan.gifts);
  useRewards.getState().show({ key, pouch, ...plan.reveal });   // alltid – aldrig inaktuell
  completeLesson(xp); celebrate(); playLevelUp();
  setResult({ stars, xp }); setDone(true);
  requestPersistOnce();
}, [addStars, completeLesson, game]);
```

The concepts.ts export:

```ts
/** Orden i senaste lektionen för kategorin (läses av klistermärkesboken). */
export function lastLessonWords(cat: PlayCategory): string[] {
  return [...(recentByCategory.get(resolveCategory(cat)) ?? [])];
}
```

**Not changed:** all 11 game pages (including TraceGame and MemoryGame), CategoryPicker, avatars.ts, the `owl` concept, public/icon.svg, `nabu-profile`/`nabu-stats`/`nabu-theme` versions, main.tsx, vercel.json.

### Build order

1. Types, data, lib, stores, `useLesson`, RewardStrip. Verify with the DEV asserts and the bun check script.
2. Book: index, word pages, Kuvertet, Ordkort, party, Räknetåget, Pärlbandet.
3. Nest: scene, drawer, shop, intro, Mascot/Coach hats.
4. Admin, backup, posters and Märkeshyllan UI, tricks, QA pass.

If time runs short, the posters and Märkeshyllan UI may slip. Their stickers are still recorded from day one and simply stay out of Kuvertet until the page exists (`trayIds` filters by `PAGE_OF_STICKER`).

### Phase 2 (not in this build)

- Free collage pages "Mina sidor" (unlimited stamps, logical x/y, up to 40 per page), with a nest "Tavla" that shows a collage.
- Original SVG **NabuOwl** built from public/icon.svg, as the long-term hat-anchor fix and the only route to glasses. Owner decision required.
- PIN to buy, a QuotaExceeded parent banner, drag placement if skipped, a "Sätt in nu" link.

---

## 9. Edge cases and test checklist

### Pure checks (`scripts/check-rewards.ts`)

1. `parseLessonKey`:
   - `"trace:trace-ar:13:gold"` → `{trace, trace-ar, 13, true}`
   - `"math:all:20"` → ok
   - `"memory:animals:21"` → null
   - `"x:y"` → null
2. `wordCandidates`:
   - band 1, practised [cat, mouse, horse(L2)] with cat owned → [mouse, horse]; options 2; default mouse.
   - A band-1 lesson never offers L3 words.
   - All owned → [] and `allKnown`.
3. `choose`: swap succeeds when old is unplaced. It fails when old is placed, when new is not in options, or when new is already owned.
4. Trace:
   - sv level 1 grants l:sv:0–5 with parts 1; then level 6 sets parts 3 and emits a 'lower' upgrade.
   - ar level 6 grants new letters ضطظ (indices 14–16) with parts 3.
   - Level 15 mixed upper/lower maps by membership and sets tricky.
   - Levels 16–20 labels map through `conceptIdByLabel`.
5. Pouch: prev 0 → 3 gives +3; prev 2 → 3 gives +1; prev 3 → 2 gives 0; first gold gives a separate +3.
6. Badges: clearing level 5 on any memory path crosses band 1, giving reveal `badges [{memory,1}]`. Medal fires only on the finish that completes the 11th game's band 1. After unlockAll, medal and crown never fire.
7. Backfill:
   - Empty stars → only w:owl (placed).
   - A v1-migrated save is capped at 24 words, but its letters, wagons and beads are complete.
   - Gold keys are ignored.
8. Balance: buy, return, re-buy keeps it correct. Dropping an unknown item id on merge refunds it. `buy` with balance < price returns false and leaves the state unchanged.

### App checklist

| Area | Check |
|---|---|
| Existing save (v2) | The first launch after the update seeds the pouch to `min(Σ,60)` and the book backfill exactly once. Reload: no re-seed (sentinels persisted). Intro banners show once. |
| New player | Pouch 0. Book shows only the owl, pre-placed. First lesson → reveal with a sticker and "+N i påsen". First nest visit → luva intro → the hat shows in the next game's Coach. |
| Reset | Börja om / Rensa allt clear profile stars, stats, stickers and nest together, with the confirm naming all four. Afterwards: no re-seed, owl re-granted, intro replays without the "sparat" line. |
| unlockAll | Levels open. Pouch, owned stickers and tray unchanged. Märkeshyllan frames show complete. Medal and crown are not granted. |
| Gold | A gold finish credits the pouch on the gold key, sets met.gold → Guldkant chip, and runs the word rule as normal. |
| Adventure / Blandad | Words come from all categories via the `blandad` key. Stickers land on their own category pages, and Kuvertet auto-turns to the right page. |
| Trace per language | Switching language opens that poster. Arabic poster grid is RTL; everything else is LTR. Words with harakat map to concepts. |
| Late / double finish | Memory's uncleaned 500 ms timeout and StrictMode double-mount → a single grant (doneRef). Leaving before the timer fires → stickers still land in Kuvertet. Reload on VictoryScreen → reveal gone, stickers kept. |
| VictoryScreen 375×667 (and Safari's ~548 px visible) | With a reward: owl h-32, gap-4, strip ≤124 px, "▶️ Nästa nivå" fully visible. LevelUpBanner plus reward still fits. Buttons respond during the 0.9 s reveal. |
| Placement | Every sticker has exactly one slot. Misses → hint ring after 2 misses. Swipe disabled while lifted. Cross-page tray sticker auto-turns the page. Last placement → party and gift once (also after reload, via `donePages`). |
| Nest | Buy is atomic and needs enough balance. Ångra and Lämna tillbaka restore the balance. A gift friend auto-places into a free slot. Hat and neck never auto-equip. Lamp glows only with a light placed and `lampOn`. Nothing decays and there is no sad state. |
| Hat QA on devices | DEV grid on an iPad (Apple emoji), an Android/Fire OS 7 tablet (Noto), Windows 10/11 (Segoe). Each hat sits on the head (±0.1 em) at text-5xl, 7xl and 8xl, in Coach under `lang=ar`, and in dark mode. |
| Emoji | `TOFU_RISK` words show the WordBlob on Win10 / Android 9. Every nest emoji is on the allowlist. |
| Dark mode | Silhouettes visible (inverted). Slot outlines ≥3:1 on every scene. Night window. Toggling the theme inside the app updates scenes (class-based). |
| Reduced motion | No transforms in book, nest or strip (local MotionConfig). CSS loops off. Confetti off. Sheen static. Balloon, Catapult and Coach behave exactly as before (no global MotionConfig). |
| a11y | VoiceOver/TalkBack read the Swedish labels. Live region announcements. Full keyboard path. All targets meet the §7.8 sizes. |
| Offline | Airplane mode: book audio from mp3s works; Web Speech lines may be silent, with text always visible. New lazy chunks are precached by the PWA. |
| Durability | `storage.persist()` is requested after the first lesson. Backup export → clear site data → import restores the book and nest. Multiple tabs: last write wins (existing limitation). |
| Many keys | A save with 3 160 star keys: `finish()` stays under 5 ms (badge scan of one game plus medal/crown over 11 games). The book index renders instantly. |
| Build | `tsc -b` and `oxlint` are clean, and component files export only components. |

### Still worth researching or playtesting with 4–9-year-olds

- 2 vs 3 choice options.
- Whether children replay only to collect stickers. If so, limit word stickers to first clears.
- The `WELCOME_CAP` and `BACKFILL_WORD_CAP` values.
- Hat fit on real devices.
- Whether the Titta retrieval prompt delights or distracts.
