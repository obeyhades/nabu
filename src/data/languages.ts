import type { Language, LangCode } from "../types";

export const LANGUAGES: Language[] = [
  { code: "sv", name: "Svenska", flag: "🇸🇪", dir: "ltr", speechLang: "sv-SE", available: true },
  { code: "en", name: "English", flag: "🇬🇧", dir: "ltr", speechLang: "en-US", available: true },
  { code: "el", name: "Ελληνικά", flag: "🇬🇷", dir: "ltr", speechLang: "el", available: true },
  { code: "ru", name: "Русский", flag: "🇷🇺", dir: "ltr", speechLang: "ru-RU", available: true },
  { code: "ar", name: "العربية", flag: "🇸🇦", dir: "rtl", speechLang: "ar", available: true },
];

export const DEFAULT_LANG: LangCode = "sv";

export function getLanguage(code: LangCode): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
