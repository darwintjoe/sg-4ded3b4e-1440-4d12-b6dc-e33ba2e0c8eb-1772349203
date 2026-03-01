import type { Language } from "@/types";
import { en } from "./en";
import { id } from "./id";
import { zh } from "./zh";
import { th } from "./th";
import { vi } from "./vi";
import { my } from "./my";

type TranslationKey = string;
type TranslationValue = string;

/**
 * Translation function with English fallback
 * Priority: Current Language → English → Key itself
 */
export function translate(key: TranslationKey, language: Language): string {
  const currentLangValue = translations[language]?.[key];
  if (currentLangValue) return currentLangValue;
  
  const englishValue = translations.en?.[key];
  if (englishValue) return englishValue;
  
  return key;
}

const translations: Record<Language, Record<TranslationKey, TranslationValue>> = {
  en,
  id,
  zh,
  th,
  vi,
  my
};

export { translations };