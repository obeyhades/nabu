# 🦉 Nabu

**En gratis, flerspråkig lärapp för barn.** Lär dig ord på flera språk genom lek — helt offline, utan inloggning och utan datainsamling.

Namnet kommer från **Nabu**, den babyloniska guden för skrivkonst och visdom.

## ✨ Funktioner (MVP)

- 🌍 **Fem språk** – svenska, engelska, grekiska, ryska och arabiska (med RTL för arabiska)
- 📚 **8 kategorier** – Djur, Mat, Frukt, Grönsaker, Fordon, Kroppsdelar, Siffror + **Blandad** (dynamisk mix från alla); ~130 ord
- 🎚️ **Fyra svårighetsgrader** – Nybörjare, Mellannivå, Utmanare, Mästare; nivåerna låses upp i tur och ordning (inspirerat av Nadira). Orden blir längre/svårare och hjälpen minskar högre upp
- 🖼️ **Ord & bilder** – lär dig orden och visa vad du kan i ett litet quiz på slutet
- 👂 **Hör & hitta** – ren hörförståelse: lyssna på ordet och hitta rätt bild
- 🃏 **Para ihop** – memory i två lägen: **ord & bild** eller **bild & bild** (fler kort på högre nivåer)
- 🔤 **Stava ordet** – skriv och/eller tryck ihop ordet; fel bokstav studsar (arabiska stavas med hela bokstavs-kluster inkl. harakat)
- 🧮 **Matte** – plus, minus och gånger med tryck-på-svar och bildstöd (svårare per nivå)
- 🅰️ **ABC-äventyr** – lär dig bokstäverna: "vilken bokstav börjar ordet på?" (ordet göms på högre nivåer)
- 🎈 **Räkna!** – "hur många ser du?" – bro mellan antal och siffra för de minsta (siffran läses upp på valt språk)
- 🥇 **Guldnivåer** – 3 stjärnor låser upp ett svårare guld-omspel av samma nivå med dubbel XP
- 🌌 **Levande värld** – äng med moln på dagen, stjärnhimmel med måne i mörkt läge, jublande uggle-maskot och festliga vinstskärmar
- 🔊 **Uppläsning** med förinspelade neural-röster som buntas med appen – funkar på **alla enheter**, offline (enhetens egen röst används bara som reserv)
- ⭐ **Stjärnor** som belöning per nivå
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

- **Nytt ord:** lägg till ett koncept i `src/data/concepts.ts` (skriv `labels` per språk + `level` 1–4). Idag: ~130 ord i 7 kategorier × 4 nivåer
- **Nytt språk:** sätt `available: true` i `src/data/languages.ts` och fyll i `labels` för det språket
- **Nytt spel:** lägg till i `src/data/gameRegistry.ts` + en sida + en route
- **Ljud:** efter att du lagt till ord/språk, kör `bun run audio` för att generera uppläsnings-klippen till `public/audio/` (`bun run audio -- --force` skriver om alla). Orden läses direkt från `concepts.ts` så ljudet hålls i synk.

## 🙏 Erkännande

Inspirerad av **[Lär med Nadira](https://github.com/asifma/lar-med-nadira)** av **Asif Mithawala** — ett gratis, öppet lärprojekt för barn som gav idén och energin till att bygga något i samma anda.
