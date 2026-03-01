import type { NextApiRequest, NextApiResponse } from "next";
import { translations } from "@/lib/translations";
import { Language } from "@/types";
import fs from "fs";
import path from "path";

// Helper to check for missing keys
function getMissingKeys(
  source: Record<string, string>,
  target: Record<string, string>
): string[] {
  return Object.keys(source).filter((key) => !target || !target[key]);
}

// Helper to translate text using Google Translate API
async function translateText(text: string, targetLang: string, apiKey: string): Promise<string> {
  try {
    // Map internal codes to Google Translate codes
    const langMap: Record<string, string> = {
      "zh": "zh-CN",
      "my": "my", // Myanmar
      "vi": "vi",
      "th": "th",
      "id": "id"
    };
    
    const googleLang = langMap[targetLang] || targetLang;

    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        q: text, 
        target: googleLang, 
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
        error: "GOOGLE_TRANSLATE_API_KEY not configured"
      });
    }

    // 2. Identify Missing Translations across all languages
    const enKeys = translations.en;
    const targetLanguages: Language[] = ["id", "zh", "th", "vi", "my"];
    
    const updates: Record<string, Record<string, string>> = {};
    let totalMissing = 0;
    const missingCounts: Record<string, number> = {};

    for (const lang of targetLanguages) {
      const currentKeys = translations[lang] || {};
      const missing = getMissingKeys(enKeys, currentKeys);
      
      missingCounts[lang] = missing.length;

      if (missing.length > 0) {
        totalMissing += missing.length;
        
        // Prepare new object with existing + new translations
        const newTrans = { ...currentKeys };
        
        // Translate missing keys
        for (const key of missing) {
          newTrans[key] = await translateText(enKeys[key], lang, GOOGLE_API_KEY);
        }
        
        updates[lang] = newTrans;
      }
    }

    if (totalMissing === 0) {
      return res.status(200).json({ 
        missingCount: 0,
        message: "All translations are up to date." 
      });
    }

    // 3. Write Updated Files
    const translationsDir = path.join(process.cwd(), "src", "lib", "translations");
    
    for (const [lang, content] of Object.entries(updates)) {
      const filePath = path.join(translationsDir, `${lang}.ts`);
      const fileContent = `export const ${lang} = ${JSON.stringify(content, null, 2)};\n`;
      fs.writeFileSync(filePath, fileContent, "utf-8");
    }

    // 4. Return Success
    return res.status(200).json({
      success: true,
      missingCount: totalMissing,
      translatedCount: totalMissing,
      languages: missingCounts,
      message: `Updated ${Object.keys(updates).length} language files successfully! Restart server to apply.`,
    });

  } catch (error) {
    console.error("Translation error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}