import type { Concept, Category, Level, LangCode, PlayCategory } from "../types";
import { bandOf } from "./levels";
import { shuffle } from "../lib/shuffle";

/** `tint` = kategorins färgvärld (barn navigerar per färg före text). */
export const CATEGORIES: { id: Category; name: string; emoji: string; tint: string }[] = [
  { id: "animals", name: "Djur", emoji: "🐾", tint: "bg-amber-100 border-amber-300 dark:bg-amber-900/40 dark:border-amber-700" },
  { id: "food", name: "Mat", emoji: "🍽️", tint: "bg-rose-100 border-rose-300 dark:bg-rose-900/40 dark:border-rose-700" },
  { id: "fruit", name: "Frukt", emoji: "🍓", tint: "bg-pink-100 border-pink-300 dark:bg-pink-900/40 dark:border-pink-700" },
  { id: "vegetables", name: "Grönsaker", emoji: "🥕", tint: "bg-green-100 border-green-300 dark:bg-green-900/40 dark:border-green-700" },
  { id: "vehicles", name: "Fordon", emoji: "🚗", tint: "bg-sky-100 border-sky-300 dark:bg-sky-900/40 dark:border-sky-700" },
  { id: "body", name: "Kroppsdelar", emoji: "✋", tint: "bg-orange-100 border-orange-300 dark:bg-orange-900/40 dark:border-orange-700" },
  { id: "numbers", name: "Siffror", emoji: "🔢", tint: "bg-indigo-100 border-indigo-300 dark:bg-indigo-900/40 dark:border-indigo-700" },
  { id: "blandad", name: "Blandad", emoji: "🎲", tint: "bg-violet-100 border-violet-300 dark:bg-violet-900/40 dark:border-violet-700" },
];

/**
 * Ett "koncept" skrivs en gång och renderas per språk via `labels`.
 * `level` (1–4) = svårighetsgrad. (el/ru/ar verifierade mot tvåspråkiga källor.)
 * "blandad" är ingen egen lista – den blandar ett ord från varje kategori per nivå.
 */
export const CONCEPTS: Concept[] = [
  // ── Djur ─────────────────────────────────────────────
  { id: "cat", emoji: "🐱", category: "animals", level: 1, labels: { sv: "katt", en: "cat", el: "γάτα", ru: "кошка", ar: "قِطّة" } },
  { id: "dog", emoji: "🐶", category: "animals", level: 1, labels: { sv: "hund", en: "dog", el: "σκύλος", ru: "собака", ar: "كَلْب" } },
  { id: "fish", emoji: "🐟", category: "animals", level: 1, labels: { sv: "fisk", en: "fish", el: "ψάρι", ru: "рыба", ar: "سَمَكة" } },
  { id: "bird", emoji: "🐦", category: "animals", level: 1, labels: { sv: "fågel", en: "bird", el: "πουλί", ru: "птица", ar: "عُصْفور" } },
  { id: "cow", emoji: "🐮", category: "animals", level: 1, labels: { sv: "ko", en: "cow", el: "αγελάδα", ru: "корова", ar: "بَقَرة" } },
  { id: "pig", emoji: "🐷", category: "animals", level: 1, labels: { sv: "gris", en: "pig", el: "γουρούνι", ru: "свинья", ar: "خِنْزِير" } },
  { id: "duck", emoji: "🦆", category: "animals", level: 1, labels: { sv: "anka", en: "duck", el: "πάπια", ru: "утка", ar: "بَطَّة" } },
  { id: "horse", emoji: "🐴", category: "animals", level: 2, labels: { sv: "häst", en: "horse", el: "άλογο", ru: "лошадь", ar: "حِصان" } },
  { id: "frog", emoji: "🐸", category: "animals", level: 2, labels: { sv: "groda", en: "frog", el: "βάτραχος", ru: "лягушка", ar: "ضِفْدَع" } },
  { id: "rabbit", emoji: "🐰", category: "animals", level: 2, labels: { sv: "kanin", en: "rabbit", el: "κουνέλι", ru: "кролик", ar: "أَرْنَب" } },
  { id: "lion", emoji: "🦁", category: "animals", level: 2, labels: { sv: "lejon", en: "lion", el: "λιοντάρι", ru: "лев", ar: "أَسَد" } },
  { id: "bee", emoji: "🐝", category: "animals", level: 2, labels: { sv: "bi", en: "bee", el: "μέλισσα", ru: "пчела", ar: "نَحْلة" } },
  { id: "sheep", emoji: "🐑", category: "animals", level: 2, labels: { sv: "får", en: "sheep", el: "πρόβατο", ru: "овца", ar: "خَرُوف" } },
  { id: "elephant", emoji: "🐘", category: "animals", level: 3, labels: { sv: "elefant", en: "elephant", el: "ελέφαντας", ru: "слон", ar: "فِيلٌ" } },
  { id: "giraffe", emoji: "🦒", category: "animals", level: 3, labels: { sv: "giraff", en: "giraffe", el: "καμηλοπάρδαλη", ru: "жираф", ar: "زَرَافَةٌ" } },
  { id: "penguin", emoji: "🐧", category: "animals", level: 3, labels: { sv: "pingvin", en: "penguin", el: "πιγκουίνος", ru: "пингвин", ar: "بِطْرِيقٌ" } },
  { id: "dolphin", emoji: "🐬", category: "animals", level: 3, labels: { sv: "delfin", en: "dolphin", el: "δελφίνι", ru: "дельфин", ar: "دُلْفِينٌ" } },
  { id: "crocodile", emoji: "🐊", category: "animals", level: 3, labels: { sv: "krokodil", en: "crocodile", el: "κροκόδειλος", ru: "крокодил", ar: "تِمْسَاحٌ" } },
  { id: "monkey", emoji: "🐵", category: "animals", level: 3, labels: { sv: "apa", en: "monkey", el: "μαϊμού", ru: "обезьяна", ar: "قِرْد" } },
  { id: "butterfly", emoji: "🦋", category: "animals", level: 4, labels: { sv: "fjäril", en: "butterfly", el: "πεταλούδα", ru: "бабочка", ar: "فَرَاشَةٌ" } },
  { id: "kangaroo", emoji: "🦘", category: "animals", level: 4, labels: { sv: "känguru", en: "kangaroo", el: "καγκουρό", ru: "кенгуру", ar: "كَنْغَرٌ" } },
  { id: "hippo", emoji: "🦛", category: "animals", level: 4, labels: { sv: "flodhäst", en: "hippopotamus", el: "ιπποπόταμος", ru: "бегемот", ar: "فَرَسُ النَّهْرِ" } },
  { id: "squirrel", emoji: "🐿️", category: "animals", level: 4, labels: { sv: "ekorre", en: "squirrel", el: "σκίουρος", ru: "белка", ar: "سِنْجَابٌ" } },
  { id: "octopus", emoji: "🐙", category: "animals", level: 4, labels: { sv: "bläckfisk", en: "octopus", el: "χταπόδι", ru: "осьминог", ar: "أَخْطَبُوطٌ" } },
  { id: "mouse", emoji: "🐭", category: "animals", level: 1, labels: { sv: "mus", en: "mouse", el: "ποντίκι", ru: "мышь", ar: "فَأْر" } },
  { id: "hen", emoji: "🐔", category: "animals", level: 1, labels: { sv: "höna", en: "hen", el: "κότα", ru: "курица", ar: "دَجَاجَة" } },
  { id: "tiger", emoji: "🐯", category: "animals", level: 2, labels: { sv: "tiger", en: "tiger", el: "τίγρη", ru: "тигр", ar: "نَمِر" } },
  { id: "bear", emoji: "🐻", category: "animals", level: 2, labels: { sv: "björn", en: "bear", el: "αρκούδα", ru: "медведь", ar: "دُبّ" } },
  { id: "zebra", emoji: "🦓", category: "animals", level: 3, labels: { sv: "zebra", en: "zebra", el: "ζέβρα", ru: "зебра", ar: "حِمَار وَحْشِيّ" } },
  { id: "turtle", emoji: "🐢", category: "animals", level: 3, labels: { sv: "sköldpadda", en: "turtle", el: "χελώνα", ru: "черепаха", ar: "سُلَحْفَاة" } },
  { id: "owl", emoji: "🦉", category: "animals", level: 4, labels: { sv: "uggla", en: "owl", el: "κουκουβάγια", ru: "сова", ar: "بُومَة" } },
  { id: "hedgehog", emoji: "🦔", category: "animals", level: 4, labels: { sv: "igelkott", en: "hedgehog", el: "σκαντζόχοιρος", ru: "ёж", ar: "قُنْفُذ" } },
  { id: "snake", emoji: "🐍", category: "animals", level: 4, labels: { sv: "orm", en: "snake", el: "φίδι", ru: "змея", ar: "ثُعْبَان" } },

  // ── Mat ──────────────────────────────────────────────
  { id: "bread", emoji: "🍞", category: "food", level: 1, labels: { sv: "bröd", en: "bread", el: "ψωμί", ru: "хлеб", ar: "خُبْز" } },
  { id: "milk", emoji: "🥛", category: "food", level: 1, labels: { sv: "mjölk", en: "milk", el: "γάλα", ru: "молоко", ar: "حَليب" } },
  { id: "egg", emoji: "🥚", category: "food", level: 1, labels: { sv: "ägg", en: "egg", el: "αυγό", ru: "яйцо", ar: "بَيْضة" } },
  { id: "cheese", emoji: "🧀", category: "food", level: 1, labels: { sv: "ost", en: "cheese", el: "τυρί", ru: "сыр", ar: "جُبْنة" } },
  { id: "rice", emoji: "🍚", category: "food", level: 1, labels: { sv: "ris", en: "rice", el: "ρύζι", ru: "рис", ar: "أَرُزّ" } },
  { id: "pizza", emoji: "🍕", category: "food", level: 2, labels: { sv: "pizza", en: "pizza", el: "πίτσα", ru: "пицца", ar: "بيتزا" } },
  { id: "sandwich", emoji: "🥪", category: "food", level: 2, labels: { sv: "smörgås", en: "sandwich", el: "σάντουιτς", ru: "бутерброд", ar: "شَطِيرَةٌ" } },
  { id: "cookie", emoji: "🍪", category: "food", level: 2, labels: { sv: "kaka", en: "cookie", el: "μπισκότο", ru: "печенье", ar: "بِسْكُوِيت" } },
  { id: "icecream", emoji: "🍦", category: "food", level: 2, labels: { sv: "glass", en: "ice cream", el: "παγωτό", ru: "мороженое", ar: "بُوظَة" } },
  { id: "popcorn", emoji: "🍿", category: "food", level: 2, labels: { sv: "popcorn", en: "popcorn", el: "ποπκόρν", ru: "попкорн", ar: "فُشَار" } },
  { id: "chocolate", emoji: "🍫", category: "food", level: 3, labels: { sv: "choklad", en: "chocolate", el: "σοκολάτα", ru: "шоколад", ar: "شُوكُولَاتَةٌ" } },
  { id: "hamburger", emoji: "🍔", category: "food", level: 3, labels: { sv: "hamburgare", en: "hamburger", el: "χάμπουργκερ", ru: "гамбургер", ar: "هَامْبُرْغَرٌ" } },
  { id: "hotdog", emoji: "🌭", category: "food", level: 3, labels: { sv: "korv", en: "hot dog", el: "λουκάνικο", ru: "хот-дог", ar: "نَقَانِق" } },
  { id: "taco", emoji: "🌮", category: "food", level: 3, labels: { sv: "taco", en: "taco", el: "τάκο", ru: "тако", ar: "تَاكُو" } },
  { id: "pancake", emoji: "🥞", category: "food", level: 3, labels: { sv: "pannkaka", en: "pancake", el: "τηγανίτα", ru: "блин", ar: "فَطِيرَة" } },
  { id: "spaghetti", emoji: "🍝", category: "food", level: 4, labels: { sv: "spagetti", en: "spaghetti", el: "σπαγγέτι", ru: "спагетти", ar: "سْبَاغِيتِي" } },
  { id: "candy", emoji: "🍬", category: "food", level: 4, labels: { sv: "godis", en: "candy", el: "καραμέλα", ru: "конфета", ar: "حَلْوَى" } },
  { id: "donut", emoji: "🍩", category: "food", level: 4, labels: { sv: "munk", en: "donut", el: "ντόνατ", ru: "пончик", ar: "دُونَات" } },
  { id: "cake", emoji: "🍰", category: "food", level: 4, labels: { sv: "tårta", en: "cake", el: "τούρτα", ru: "торт", ar: "كَعْكَة" } },
  { id: "juice", emoji: "🧃", category: "food", level: 1, labels: { sv: "juice", en: "juice", el: "χυμός", ru: "сок", ar: "عَصِير" } },
  { id: "butter", emoji: "🧈", category: "food", level: 2, labels: { sv: "smör", en: "butter", el: "βούτυρο", ru: "масло", ar: "زُبْدَة" } },
  { id: "honey", emoji: "🍯", category: "food", level: 2, labels: { sv: "honung", en: "honey", el: "μέλι", ru: "мёд", ar: "عَسَل" } },
  { id: "croissant", emoji: "🥐", category: "food", level: 3, labels: { sv: "croissant", en: "croissant", el: "κρουασάν", ru: "круассан", ar: "كْرُوَاسَان" } },
  { id: "soup", emoji: "🍲", category: "food", level: 4, labels: { sv: "soppa", en: "soup", el: "σούπα", ru: "суп", ar: "شُورْبَة" } },

  // ── Frukt ────────────────────────────────────────────
  { id: "apple", emoji: "🍎", category: "fruit", level: 1, labels: { sv: "äpple", en: "apple", el: "μήλο", ru: "яблоко", ar: "تُفّاحة" } },
  { id: "banana", emoji: "🍌", category: "fruit", level: 1, labels: { sv: "banan", en: "banana", el: "μπανάνα", ru: "банан", ar: "مَوْزة" } },
  { id: "pear", emoji: "🍐", category: "fruit", level: 1, labels: { sv: "päron", en: "pear", el: "αχλάδι", ru: "груша", ar: "كُمَّثْرَى" } },
  { id: "lemon", emoji: "🍋", category: "fruit", level: 1, labels: { sv: "citron", en: "lemon", el: "λεμόνι", ru: "лимон", ar: "لَيْمُون" } },
  { id: "orange", emoji: "🍊", category: "fruit", level: 2, labels: { sv: "apelsin", en: "orange", el: "πορτοκάλι", ru: "апельсин", ar: "بُرْتُقَالَةٌ" } },
  { id: "grapes", emoji: "🍇", category: "fruit", level: 2, labels: { sv: "vindruvor", en: "grapes", el: "σταφύλι", ru: "виноград", ar: "عِنَب" } },
  { id: "cherry", emoji: "🍒", category: "fruit", level: 2, labels: { sv: "körsbär", en: "cherry", el: "κεράσι", ru: "вишня", ar: "كَرَز" } },
  { id: "peach", emoji: "🍑", category: "fruit", level: 2, labels: { sv: "persika", en: "peach", el: "ροδάκινο", ru: "персик", ar: "خَوْخ" } },
  { id: "kiwi", emoji: "🥝", category: "fruit", level: 2, labels: { sv: "kiwi", en: "kiwi", el: "ακτινίδιο", ru: "киви", ar: "كِيوِي" } },
  { id: "strawberry", emoji: "🍓", category: "fruit", level: 3, labels: { sv: "jordgubbe", en: "strawberry", el: "φράουλα", ru: "клубника", ar: "فَراوِلة" } },
  { id: "watermelon", emoji: "🍉", category: "fruit", level: 3, labels: { sv: "vattenmelon", en: "watermelon", el: "καρπούζι", ru: "арбуз", ar: "بِطِّيخٌ" } },
  { id: "melon", emoji: "🍈", category: "fruit", level: 3, labels: { sv: "melon", en: "melon", el: "πεπόνι", ru: "дыня", ar: "شَمَّام" } },
  { id: "mango", emoji: "🥭", category: "fruit", level: 3, labels: { sv: "mango", en: "mango", el: "μάνγκο", ru: "манго", ar: "مَانْجُو" } },
  { id: "blueberry", emoji: "🫐", category: "fruit", level: 3, labels: { sv: "blåbär", en: "blueberry", el: "μύρτιλο", ru: "черника", ar: "تُوت أَزْرَق" } },
  { id: "olive", emoji: "🫒", category: "fruit", level: 3, labels: { sv: "oliv", en: "olive", el: "ελιά", ru: "оливка", ar: "زَيْتُون" } },
  { id: "pineapple", emoji: "🍍", category: "fruit", level: 4, labels: { sv: "ananas", en: "pineapple", el: "ανανάς", ru: "ананас", ar: "أَنَانَاسٌ" } },
  { id: "coconut", emoji: "🥥", category: "fruit", level: 4, labels: { sv: "kokosnöt", en: "coconut", el: "καρύδα", ru: "кокос", ar: "جَوْز الْهِنْد" } },
  { id: "avocado", emoji: "🥑", category: "fruit", level: 4, labels: { sv: "avokado", en: "avocado", el: "αβοκάντο", ru: "авокадо", ar: "أَفُوكَادُو" } },
  { id: "greenapple", emoji: "🍏", category: "fruit", level: 4, labels: { sv: "grönt äpple", en: "green apple", el: "πράσινο μήλο", ru: "зелёное яблоко", ar: "تُفَّاحَة خَضْرَاء" } },

  // ── Grönsaker ────────────────────────────────────────
  { id: "carrot", emoji: "🥕", category: "vegetables", level: 1, labels: { sv: "morot", en: "carrot", el: "καρότο", ru: "морковь", ar: "جَزَرة" } },
  { id: "potato", emoji: "🥔", category: "vegetables", level: 1, labels: { sv: "potatis", en: "potato", el: "πατάτα", ru: "картошка", ar: "بَطَاطِس" } },
  { id: "corn", emoji: "🌽", category: "vegetables", level: 1, labels: { sv: "majs", en: "corn", el: "καλαμπόκι", ru: "кукуруза", ar: "ذُرَة" } },
  { id: "onion", emoji: "🧅", category: "vegetables", level: 1, labels: { sv: "lök", en: "onion", el: "κρεμμύδι", ru: "лук", ar: "بَصَل" } },
  { id: "tomato", emoji: "🍅", category: "vegetables", level: 2, labels: { sv: "tomat", en: "tomato", el: "ντομάτα", ru: "помидор", ar: "طَمَاطَةٌ" } },
  { id: "broccoli", emoji: "🥦", category: "vegetables", level: 2, labels: { sv: "broccoli", en: "broccoli", el: "μπρόκολο", ru: "брокколи", ar: "بْرُوكُولِي" } },
  { id: "pepper", emoji: "🫑", category: "vegetables", level: 2, labels: { sv: "paprika", en: "bell pepper", el: "πιπεριά", ru: "перец", ar: "فُلْفُل حُلْو" } },
  { id: "lettuce", emoji: "🥬", category: "vegetables", level: 2, labels: { sv: "sallad", en: "lettuce", el: "μαρούλι", ru: "салат", ar: "خَسّ" } },
  { id: "cucumber", emoji: "🥒", category: "vegetables", level: 3, labels: { sv: "gurka", en: "cucumber", el: "αγγούρι", ru: "огурец", ar: "خِيَارٌ" } },
  { id: "garlic", emoji: "🧄", category: "vegetables", level: 3, labels: { sv: "vitlök", en: "garlic", el: "σκόρδο", ru: "чеснок", ar: "ثُوم" } },
  { id: "eggplant", emoji: "🍆", category: "vegetables", level: 3, labels: { sv: "aubergine", en: "eggplant", el: "μελιτζάνα", ru: "баклажан", ar: "بَاذِنْجَان" } },
  { id: "beans", emoji: "🫘", category: "vegetables", level: 3, labels: { sv: "bönor", en: "beans", el: "φασόλια", ru: "фасоль", ar: "فَاصُولْيَاء" } },
  { id: "mushroom", emoji: "🍄", category: "vegetables", level: 4, labels: { sv: "svamp", en: "mushroom", el: "μανιτάρι", ru: "гриб", ar: "فِطْرٌ" } },
  { id: "peas", emoji: "🫛", category: "vegetables", level: 4, labels: { sv: "ärtor", en: "peas", el: "αρακάς", ru: "горох", ar: "بَازِلَّاء" } },
  { id: "sweetpotato", emoji: "🍠", category: "vegetables", level: 4, labels: { sv: "sötpotatis", en: "sweet potato", el: "γλυκοπατάτα", ru: "батат", ar: "بَطَاطَا حُلْوَة" } },
  { id: "ginger", emoji: "🫚", category: "vegetables", level: 4, labels: { sv: "ingefära", en: "ginger", el: "τζίντζερ", ru: "имбирь", ar: "زَنْجَبِيل" } },
  { id: "chili", emoji: "🌶️", category: "vegetables", level: 4, labels: { sv: "chili", en: "chili pepper", el: "τσίλι", ru: "перец чили", ar: "فُلْفُل حَارّ" } },

  // ── Fordon ───────────────────────────────────────────
  { id: "car", emoji: "🚗", category: "vehicles", level: 1, labels: { sv: "bil", en: "car", el: "αυτοκίνητο", ru: "машина", ar: "سَيَّارَة" } },
  { id: "bus", emoji: "🚌", category: "vehicles", level: 1, labels: { sv: "buss", en: "bus", el: "λεωφορείο", ru: "автобус", ar: "حَافِلَة" } },
  { id: "bike", emoji: "🚲", category: "vehicles", level: 1, labels: { sv: "cykel", en: "bicycle", el: "ποδήλατο", ru: "велосипед", ar: "دَرَّاجَة" } },
  { id: "train", emoji: "🚂", category: "vehicles", level: 1, labels: { sv: "tåg", en: "train", el: "τρένο", ru: "поезд", ar: "قِطَار" } },
  { id: "boat", emoji: "⛵", category: "vehicles", level: 1, labels: { sv: "båt", en: "boat", el: "βάρκα", ru: "лодка", ar: "قَارِب" } },
  { id: "airplane", emoji: "✈️", category: "vehicles", level: 2, labels: { sv: "flygplan", en: "airplane", el: "αεροπλάνο", ru: "самолёт", ar: "طَائِرَة" } },
  { id: "truck", emoji: "🚚", category: "vehicles", level: 2, labels: { sv: "lastbil", en: "truck", el: "φορτηγό", ru: "грузовик", ar: "شَاحِنَة" } },
  { id: "taxi", emoji: "🚕", category: "vehicles", level: 2, labels: { sv: "taxi", en: "taxi", el: "ταξί", ru: "такси", ar: "سَيَّارَة أُجْرَة" } },
  { id: "tractor", emoji: "🚜", category: "vehicles", level: 2, labels: { sv: "traktor", en: "tractor", el: "τρακτέρ", ru: "трактор", ar: "جَرَّار" } },
  { id: "moped", emoji: "🛵", category: "vehicles", level: 2, labels: { sv: "moped", en: "moped", el: "μηχανάκι", ru: "мопед", ar: "دَرَّاجَة نَارِيَّة صَغِيرَة" } },
  { id: "helicopter", emoji: "🚁", category: "vehicles", level: 3, labels: { sv: "helikopter", en: "helicopter", el: "ελικόπτερο", ru: "вертолёт", ar: "مِرْوَحِيَّة" } },
  { id: "ambulance", emoji: "🚑", category: "vehicles", level: 3, labels: { sv: "ambulans", en: "ambulance", el: "ασθενοφόρο", ru: "скорая помощь", ar: "سَيَّارَة إِسْعَاف" } },
  { id: "firetruck", emoji: "🚒", category: "vehicles", level: 3, labels: { sv: "brandbil", en: "fire truck", el: "πυροσβεστικό", ru: "пожарная машина", ar: "سَيَّارَة إِطْفَاء" } },
  { id: "motorcycle", emoji: "🏍️", category: "vehicles", level: 3, labels: { sv: "motorcykel", en: "motorcycle", el: "μοτοσικλέτα", ru: "мотоцикл", ar: "دَرَّاجَة نَارِيَّة" } },
  { id: "kickscooter", emoji: "🛴", category: "vehicles", level: 3, labels: { sv: "sparkcykel", en: "kick scooter", el: "πατίνι", ru: "самокат", ar: "سْكُوتَر" } },
  { id: "rocket", emoji: "🚀", category: "vehicles", level: 4, labels: { sv: "rymdraket", en: "rocket", el: "πύραυλος", ru: "ракета", ar: "صَارُوخ" } },
  { id: "ship", emoji: "🚢", category: "vehicles", level: 4, labels: { sv: "skepp", en: "ship", el: "πλοίο", ru: "корабль", ar: "سَفِينَة" } },
  { id: "policecar", emoji: "🚓", category: "vehicles", level: 4, labels: { sv: "polisbil", en: "police car", el: "περιπολικό", ru: "полицейская машина", ar: "سَيَّارَة شُرْطَة" } },
  { id: "metro", emoji: "🚇", category: "vehicles", level: 4, labels: { sv: "tunnelbana", en: "metro", el: "μετρό", ru: "метро", ar: "مِتْرُو" } },
  { id: "cablecar", emoji: "🚠", category: "vehicles", level: 4, labels: { sv: "linbana", en: "cable car", el: "τελεφερίκ", ru: "канатная дорога", ar: "تِلِفِرِيك" } },

  // ── Kroppsdelar ──────────────────────────────────────
  { id: "hand", emoji: "✋", category: "body", level: 1, labels: { sv: "hand", en: "hand", el: "χέρι", ru: "рука", ar: "يَد" } },
  { id: "eye", emoji: "👁️", category: "body", level: 1, labels: { sv: "öga", en: "eye", el: "μάτι", ru: "глаз", ar: "عَيْن" } },
  { id: "ear", emoji: "👂", category: "body", level: 1, labels: { sv: "öra", en: "ear", el: "αυτί", ru: "ухо", ar: "أُذُن" } },
  { id: "nose", emoji: "👃", category: "body", level: 1, labels: { sv: "näsa", en: "nose", el: "μύτη", ru: "нос", ar: "أَنْف" } },
  { id: "mouth", emoji: "👄", category: "body", level: 2, labels: { sv: "mun", en: "mouth", el: "στόμα", ru: "рот", ar: "فَم" } },
  { id: "foot", emoji: "🦶", category: "body", level: 2, labels: { sv: "fot", en: "foot", el: "πόδι", ru: "ступня", ar: "قَدَم" } },
  { id: "leg", emoji: "🦵", category: "body", level: 2, labels: { sv: "ben", en: "leg", el: "πόδι", ru: "нога", ar: "سَاق" } },
  { id: "arm", emoji: "💪", category: "body", level: 2, labels: { sv: "arm", en: "arm", el: "μπράτσο", ru: "рука", ar: "ذِرَاع" } },
  { id: "tooth", emoji: "🦷", category: "body", level: 3, labels: { sv: "tand", en: "tooth", el: "δόντι", ru: "зуб", ar: "سِنّ" } },
  { id: "tongue", emoji: "👅", category: "body", level: 3, labels: { sv: "tunga", en: "tongue", el: "γλώσσα", ru: "язык", ar: "لِسَان" } },
  { id: "heart", emoji: "🫀", category: "body", level: 3, labels: { sv: "hjärta", en: "heart", el: "καρδιά", ru: "сердце", ar: "قَلْب" } },
  { id: "brain", emoji: "🧠", category: "body", level: 3, labels: { sv: "hjärna", en: "brain", el: "εγκέφαλος", ru: "мозг", ar: "دِمَاغ" } },
  { id: "finger", emoji: "👆", category: "body", level: 4, labels: { sv: "finger", en: "finger", el: "δάχτυλο", ru: "палец", ar: "إِصْبَع" } },
  { id: "thumb", emoji: "👍", category: "body", level: 4, labels: { sv: "tumme", en: "thumb", el: "αντίχειρας", ru: "большой палец", ar: "إِبْهَام" } },
  { id: "lungs", emoji: "🫁", category: "body", level: 4, labels: { sv: "lungor", en: "lungs", el: "πνεύμονες", ru: "лёгкие", ar: "رِئَتَان" } },
  { id: "skeleton", emoji: "🦴", category: "body", level: 4, labels: { sv: "skelett", en: "skeleton", el: "σκελετός", ru: "скелет", ar: "هَيْكَل عَظْمِيّ" } },

  // ── Siffror ──────────────────────────────────────────
  { id: "one", emoji: "1️⃣", category: "numbers", level: 1, labels: { sv: "ett", en: "one", el: "ένα", ru: "один", ar: "واحِد" } },
  { id: "two", emoji: "2️⃣", category: "numbers", level: 1, labels: { sv: "två", en: "two", el: "δύο", ru: "два", ar: "اِثْنان" } },
  { id: "three", emoji: "3️⃣", category: "numbers", level: 1, labels: { sv: "tre", en: "three", el: "τρία", ru: "три", ar: "ثَلاثة" } },
  { id: "four", emoji: "4️⃣", category: "numbers", level: 1, labels: { sv: "fyra", en: "four", el: "τέσσερα", ru: "четыре", ar: "أَرْبَعة" } },
  { id: "five", emoji: "5️⃣", category: "numbers", level: 1, labels: { sv: "fem", en: "five", el: "πέντε", ru: "пять", ar: "خَمْسة" } },
  { id: "six", emoji: "6️⃣", category: "numbers", level: 2, labels: { sv: "sex", en: "six", el: "έξι", ru: "шесть", ar: "سِتّة" } },
  { id: "seven", emoji: "7️⃣", category: "numbers", level: 2, labels: { sv: "sju", en: "seven", el: "εφτά", ru: "семь", ar: "سَبْعة" } },
  { id: "eight", emoji: "8️⃣", category: "numbers", level: 2, labels: { sv: "åtta", en: "eight", el: "οχτώ", ru: "восемь", ar: "ثَمانِية" } },
  { id: "nine", emoji: "9️⃣", category: "numbers", level: 2, labels: { sv: "nio", en: "nine", el: "εννιά", ru: "девять", ar: "تِسْعة" } },
  { id: "ten", emoji: "🔟", category: "numbers", level: 2, labels: { sv: "tio", en: "ten", el: "δέκα", ru: "десять", ar: "عَشَرة" } },
  { id: "eleven", emoji: "11", category: "numbers", level: 3, labels: { sv: "elva", en: "eleven", el: "έντεκα", ru: "одиннадцать", ar: "أَحَدَ عَشَرَ" } },
  { id: "twelve", emoji: "12", category: "numbers", level: 3, labels: { sv: "tolv", en: "twelve", el: "δώδεκα", ru: "двенадцать", ar: "اِثْنَا عَشَرَ" } },
  { id: "thirteen", emoji: "13", category: "numbers", level: 3, labels: { sv: "tretton", en: "thirteen", el: "δεκατρία", ru: "тринадцать", ar: "ثَلَاثَةَ عَشَرَ" } },
  { id: "fourteen", emoji: "14", category: "numbers", level: 3, labels: { sv: "fjorton", en: "fourteen", el: "δεκατέσσερα", ru: "четырнадцать", ar: "أَرْبَعَةَ عَشَرَ" } },
  { id: "fifteen", emoji: "15", category: "numbers", level: 3, labels: { sv: "femton", en: "fifteen", el: "δεκαπέντε", ru: "пятнадцать", ar: "خَمْسَةَ عَشَرَ" } },
  { id: "sixteen", emoji: "16", category: "numbers", level: 4, labels: { sv: "sexton", en: "sixteen", el: "δεκαέξι", ru: "шестнадцать", ar: "سِتَّةَ عَشَرَ" } },
  { id: "seventeen", emoji: "17", category: "numbers", level: 4, labels: { sv: "sjutton", en: "seventeen", el: "δεκαεπτά", ru: "семнадцать", ar: "سَبْعَةَ عَشَرَ" } },
  { id: "eighteen", emoji: "18", category: "numbers", level: 4, labels: { sv: "arton", en: "eighteen", el: "δεκαοκτώ", ru: "восемнадцать", ar: "ثَمَانِيَةَ عَشَرَ" } },
  { id: "nineteen", emoji: "19", category: "numbers", level: 4, labels: { sv: "nitton", en: "nineteen", el: "δεκαεννέα", ru: "девятнадцать", ar: "تِسْعَةَ عَشَرَ" } },
  { id: "twenty", emoji: "20", category: "numbers", level: 4, labels: { sv: "tjugo", en: "twenty", el: "είκοσι", ru: "двадцать", ar: "عِشْرُونَ" } },
];

export const REAL_CATEGORIES = CATEGORIES.filter((c) => c.id !== "blandad").map((c) => c.id);

/** Äventyrsstigen går genom kategorierna i tur och ordning, en per nivå. */
export const ADVENTURE = {
  id: "adventure" as const,
  name: "Äventyret",
  emoji: "🗺️",
  tint: "bg-purple-100 border-purple-300 dark:bg-purple-900/40 dark:border-purple-700",
};

export function adventureCategory(level: Level): Category {
  return REAL_CATEGORIES[(level - 1) % REAL_CATEGORIES.length];
}

/** Den kategori orden faktiskt hämtas från (äventyr → kategori för nivån). */
export function resolveCategory(cat: PlayCategory, level: Level): Category {
  return cat === "adventure" ? adventureCategory(level) : cat;
}

/** Namn/emoji/färg för en kategori eller äventyret. */
export function categoryInfo(cat: string) {
  if (cat === "adventure") return ADVENTURE;
  return CATEGORIES.find((c) => c.id === cat);
}

export function conceptsByCategory(category: Category): Concept[] {
  if (category === "blandad") return CONCEPTS;
  return CONCEPTS.filter((c) => c.category === category);
}

/**
 * Ord för en lektion på en viss nivå. Bandet (1–4) styr vilka ord som är med:
 * först ord från nivåns eget band, sen fylls det på med lättare ord – så
 * även små kategorier räcker till 10 uppgifter. Svårare band kommer inte med.
 */
export function lessonWords(cat: PlayCategory, level: Level, count: number): Concept[] {
  const band = bandOf(level);
  const category = resolveCategory(cat, level);
  const pool = conceptsByCategory(category).filter((c) => c.level <= band);
  const current = shuffle(pool.filter((c) => c.level === band));
  const easier = shuffle(pool.filter((c) => c.level < band)).sort((a, b) => b.level - a.level);
  return [...current, ...easier].slice(0, count);
}

/** Alla ord som kan användas som fel-alternativ (samma kategori, upp till bandet). */
export function distractorPool(cat: PlayCategory, level: Level): Concept[] {
  const category = resolveCategory(cat, level);
  const band = bandOf(level);
  const pool = conceptsByCategory(category).filter((c) => c.level <= band);
  return pool.length >= 8 ? pool : conceptsByCategory(category);
}

/**
 * Välj `n` fel-alternativ till `answer`. Högre `closeness` (0–1) = fler
 * alternativ från samma band, dvs. mer lika varandra.
 */
export function pickDistractors(answer: Concept, pool: Concept[], n: number, closeness = 0): Concept[] {
  const others = pool.filter((c) => c.id !== answer.id && c.emoji !== answer.emoji);
  const near = shuffle(others.filter((c) => c.level === answer.level));
  const far = shuffle(others.filter((c) => c.level !== answer.level));
  const nearCount = Math.round(n * closeness);
  const picked = [...near.slice(0, nearCount), ...far];
  const rest = near.slice(nearCount);
  return shuffle([...picked, ...rest].slice(0, n));
}

/** Ordet på valt språk (svenska som reserv). */
export function labelOf(c: Concept, lang: LangCode): string {
  return c.labels[lang] ?? c.labels.sv ?? "";
}
