import type { NextApiRequest, NextApiResponse } from "next";
import { translations } from "@/lib/translations";
import fs from "fs";
import path from "path";

// Helper to check for missing keys
function getMissingKeys(
  source: Record<string, string>,
  target: Record<string, string>
): string[] {
  return Object.keys(source).filter((key) => !target[key]);
}

// Helper to translate text using Google Translate API
async function translateText(text: string, targetLang: string, apiKey: string): Promise<string> {
  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        q: text, 
        target: targetLang, 
        format: "text" 
      })
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
  } catch (e) {
    console.error(`Translation failed for "${text}" to ${targetLang}`, e);
    return text; // Return original on error
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Verify API Key
    const GOOGLE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

    if (!GOOGLE_API_KEY) {
      return res.status(500).json({
        error: "GOOGLE_TRANSLATE_API_KEY not configured in environment variables"
      });
    }

    // 2. Identify Missing Translations
    const enKeys = translations.en;
    const idKeys = translations.id || {};
    const zhKeys = translations.zh || {};

    const missingId = getMissingKeys(enKeys, idKeys);
    const missingZh = getMissingKeys(enKeys, zhKeys);

    if (missingId.length === 0 && missingZh.length === 0) {
      return res.status(200).json({ 
        missingCount: 0,
        message: "All translations are up to date." 
      });
    }

    // 3. Translate Missing Keys
    const newTranslations = {
      id: { ...idKeys },
      zh: { ...zhKeys }
    };

    // Translate Indonesian
    for (const key of missingId) {
      newTranslations.id[key] = await translateText(enKeys[key], "id", GOOGLE_API_KEY);
    }

    // Translate Chinese
    for (const key of missingZh) {
      newTranslations.zh[key] = await translateText(enKeys[key], "zh-CN", GOOGLE_API_KEY);
    }

    // 4. Generate Updated File Content
    const fileContent = `import type { Language } from "@/types";

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
  en: ${JSON.stringify(translations.en, null, 2)},
  
  id: ${JSON.stringify(newTranslations.id, null, 2)},
  
  zh: ${JSON.stringify(newTranslations.zh, null, 2)}
};

export { translations };
`;

    // 5. Write to File
    const translationsPath = path.join(process.cwd(), "src", "lib", "translations.ts");
    fs.writeFileSync(translationsPath, fileContent, "utf-8");

    // 6. Return Success
    return res.status(200).json({
      success: true,
      missingCount: missingId.length + missingZh.length,
      translatedCount: missingId.length + missingZh.length,
      languages: {
        id: missingId.length,
        zh: missingZh.length
      },
      message: "Translations updated successfully! Restart server to apply changes.",
      downloadUrl: `/api/download-translations`
    });

  } catch (error) {
    console.error("Translation error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}