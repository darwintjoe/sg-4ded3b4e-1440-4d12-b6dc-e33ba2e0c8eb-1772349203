import type { NextApiRequest, NextApiResponse } from "next";
import { translations } from "@/lib/translations";

// Language codes mapping for Google Translate API
const GOOGLE_LANG_CODES: Record<string, string> = {
  id: "id",      // Indonesian
  zh: "zh-CN",   // Chinese (Simplified)
  th: "th",      // Thai
  vi: "vi",      // Vietnamese
  my: "my",      // Myanmar (Burmese)
};

// Helper to get missing keys in a language compared to English
function getMissingKeys(lang: string): string[] {
  const enKeys = Object.keys(translations.en);
  const langKeys = Object.keys(translations[lang as keyof typeof translations] || {});
  return enKeys.filter((key) => !langKeys.includes(key));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

    // Check for missing translations in all languages
    const targetLanguages = ["id", "zh", "th", "vi", "my"];
    const missingByLang: Record<string, string[]> = {};
    let totalMissing = 0;

    for (const lang of targetLanguages) {
      const missing = getMissingKeys(lang);
      if (missing.length > 0) {
        missingByLang[lang] = missing;
        totalMissing += missing.length;
      }
    }

    // If no missing translations, return success
    if (totalMissing === 0) {
      return res.status(200).json({ 
        message: "All translations are up to date.",
        languages: targetLanguages.reduce((acc, lang) => {
          acc[lang] = Object.keys(translations[lang as keyof typeof translations] || {}).length;
          return acc;
        }, {} as Record<string, number>)
      });
    }

    // If no API key, return the missing keys info without translating
    if (!GOOGLE_API_KEY) {
      return res.status(200).json({
        message: "Missing translations found but no GOOGLE_TRANSLATE_API_KEY configured",
        missingByLang,
        totalMissing,
        hint: "Add GOOGLE_TRANSLATE_API_KEY to environment variables to enable auto-translation"
      });
    }

    // Helper to translate text
    async function translateText(text: string, targetLang: string): Promise<string> {
      const googleLang = GOOGLE_LANG_CODES[targetLang] || targetLang;
      
      try {
        const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text, target: googleLang, format: "text" })
        });
        const data = await response.json();
        return data.data?.translations?.[0]?.translatedText || text;
      } catch (e) {
        console.error(`Translation failed for "${text}" to ${targetLang}`, e);
        return text; // Return original on error
      }
    }

    // Translate all missing keys
    const translatedByLang: Record<string, Record<string, string>> = {};

    for (const [lang, missingKeys] of Object.entries(missingByLang)) {
      translatedByLang[lang] = {};
      
      for (const key of missingKeys) {
        const englishValue = translations.en[key as keyof typeof translations.en];
        if (englishValue) {
          translatedByLang[lang][key] = await translateText(englishValue, lang);
        }
      }
    }

    // Note: In production, you would save these to files or a database
    // For now, we return the translations for manual update or CI/CD integration
    return res.status(200).json({
      success: true,
      message: "Translations generated successfully",
      note: "These translations need to be saved to the translation files. Run 'npm run translate' locally or integrate with CI/CD.",
      translatedKeys: Object.entries(translatedByLang).reduce((acc, [lang, keys]) => {
        acc[lang] = Object.keys(keys).length;
        return acc;
      }, {} as Record<string, number>),
      translations: translatedByLang
    });

  } catch (error) {
    console.error("Auto-translation error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}