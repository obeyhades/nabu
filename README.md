# 🦉 Nabu

**En gratis, flerspråkig lärapp för barn.** Lär dig ord på flera språk genom lek — helt offline, utan inloggning och utan datainsamling.

Namnet kommer från **Nabu**, den babyloniska guden för skrivkonst och visdom.

## ✨ Funktioner

- 🌍 **Fem språk** – svenska, engelska, grekiska, ryska och arabiska (med RTL för arabiska)
- 📚 **8 kategorier** – Djur, Mat, Frukt, Grönsaker, Fordon, Kroppsdelar, Siffror + **Blandad** (dynamisk mix från alla); ~150 ord
- 🗺️ **20 nivåer per stig** – fyra band (Nybörjare, Mellannivå, Utmanare, Mästare) med fem nivåer var; låses upp i tur och ordning (inspirerat av Nadira). Svårigheten styrs från ett ställe (`src/lib/difficulty.ts`) och stiger jämnt: fler uppgifter, fler svarsalternativ, svårare ord och mindre hjälp
- 🧭 **Äventyret + fri träning** – i ordspelen finns en äventyrsstig som går genom alla kategorier, och en egen 20-nivåsstig per kategori
- 🖼️ **Ord & bilder** – lär dig orden och visa vad du kan i ett litet quiz på slutet
- 👂 **Hör & hitta** – ren hörförståelse: lyssna på ordet och hitta rätt bild
- 🃏 **Para ihop** – memory i två lägen: **ord & bild** eller **bild & bild** (fler kort på högre nivåer)
- 🔤 **Stava ordet** – skriv och/eller tryck ihop ordet; fel bokstav studsar (arabiska stavas med hela bokstavs-kluster inkl. harakat)
- 🧮 **Matte** – 20 nivåer: plus, minus, gånger och delat (nivå 20 blandar allt), med bildstöd i början av varje räknesätt
- 🅰️ **ABC-äventyr** – lär dig bokstäverna: "vilken bokstav börjar ordet på?" (ordet göms på högre nivåer)
- 🔢 **Räkna!** – "hur många ser du?" upp till 20; högre upp blandas andra saker in som inte ska räknas (talet läses upp på valt språk)
- 🧩 **Pussla ordet** – dra (eller tryck) bokstavsbrickor till rätt plats
- 🎈 **Ballongpop** – hör ordet och poppa rätt ballong innan den flyger iväg (snabbare och slingrigare högre upp)
- 🏹 **Katapulten** – dra tillbaka, sikta och fäll tornet med rätt bild; tornen hamnar längre bort och siktlinjen försvinner högre upp
- ✏️ **Spåra & rita** – spåra bokstäver, siffror och ord med fingret i valt språks alfabet (egen stig per språk)
- 🥇 **Guldnivåer** – 3 stjärnor låser upp ett svårare guld-omspel av samma nivå med dubbel XP
- 🌌 **Levande värld** – äng med moln på dagen, stjärnhimmel med måne i mörkt läge, jublande uggle-maskot och festliga vinstskärmar
- 🔊 **Uppläsning** med förinspelade neural-röster som buntas med appen – funkar på **alla enheter**, offline (enhetens egen röst används bara som reserv)
- ⭐ **Stjärnor** som belöning per nivå, 🔥 kombo för flera rätt i rad och ugglan Nabu som coach under spelet
- ✨ **Animationer** (framer-motion) – svarsknappar som studsar och skakar, frågor som glider in, memorykort som vänds i 3D
- 🎮 **Motivation (Duolingo-stil)** – daglig streak 🔥, XP & spelar-nivå 🎓 (ring mot nästa nivå + "Ny nivå!"-fest), dagligt mål, ljudeffekter och Nabu-maskoten som peppar
- 📱 **PWA** – installerbar och fungerar offline
- 👪 **Föräldrasida (`/admin`)** – PIN-skyddad barnspärr (standard **1234**): framsteg, röst-hastighet, dagligt mål, lås upp nivåer, nollställ
- 🔒 Ingen inloggning, inga annonser, ingen datainsamling (allt sparas lokalt)

## 🛠️ Teknik

Vite · React · TypeScript · Tailwind CSS · Zustand (persist) · React Router · Framer Motion · Radix UI · vite-plugin-pwa · msedge-tts (genererar ljudklippen)

## 🚀 Kom igång

```bash
bun install
bun dev      # http://localhost:5173
bun run build
```

## 🧩 Lägg till innehåll

- **Nytt ord:** lägg till ett koncept i `src/data/concepts.ts` (skriv `labels` per språk + `level` 1–4). Idag: ~150 ord i 7 kategorier, `level` = band 1–4
- **Nytt språk:** sätt `available: true` i `src/data/languages.ts` och fyll i `labels` för det språket
- **Nytt spel:** lägg till i `src/data/gameRegistry.ts` + en sida + en route. Utgå från `src/pages/ListeningGame.tsx` – den visar hur `difficulty()`, `lessonWords()` och `useLesson()` används
- **Ljud:** efter att du lagt till ord/språk, kör `bun run audio` för att generera uppläsnings-klippen till `public/audio/` (`bun run audio -- --force` skriver om alla). Orden läses direkt från `concepts.ts` så ljudet hålls i synk.

## 🙏 Erkännande

Inspirerad av **[Lär med Nadira](https://github.com/asifma/lar-med-nadira)** av **Asif Mithawala** — ett gratis, öppet lärprojekt för barn som gav idén och energin till att bygga något i samma anda.
