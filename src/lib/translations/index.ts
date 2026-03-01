import type { Language } from "@/types";
import { en } from "./en";
import { id } from "./id";
import { zh } from "./zh";
import { th } from "./th";
import { vi } from "./vi";
import { my } from "./my";

export const translations = {
  en,
  id,
  zh,
  th,
  vi,
  my
};

export function translate(key: string, language: Language = 'en'): string {
  const langData = translations[language];
  if (!langData) return key;
  
  // Try target language, fallback to English, then key itself
  return (langData as any)[key] || (translations.en as any)[key] || key;
}