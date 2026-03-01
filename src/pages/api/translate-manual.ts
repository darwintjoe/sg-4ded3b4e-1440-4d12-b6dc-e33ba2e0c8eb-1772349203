import type { NextApiRequest, NextApiResponse } from "next";
import { translations } from "@/lib/translations";
import { v2 } from "@google-cloud/translate";
import fs from "fs";
import path from "path";

const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

const translate = new v2.Translate({
  key: GOOGLE_TRANSLATE_API_KEY,
});

const BATCH_SIZE = 30;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { targetLanguage, startIndex = 0 } = req.body;

    if (!targetLanguage) {
      return res.status(400).json({ error: "Target language is required" });
    }

    if (!GOOGLE_TRANSLATE_API_KEY) {
      return res.status(500).json({ 
        error: "Google Translate API key not configured",
        details: "Set GOOGLE_TRANSLATE_API_KEY in environment variables"
      });
    }

    const englishKeys = Object.keys(translations.en);
    const targetTranslations = translations[targetLanguage as keyof typeof translations] || {};
    
    const missingKeys = englishKeys.filter(key => !targetTranslations[key]);
    
    if (missingKeys.length === 0) {
      return res.status(200).json({
        success: true,
        message: `All keys already translated for ${targetLanguage}`,
        completed: true,
        totalKeys: englishKeys.length,
        translatedKeys: englishKeys.length,
        progress: 100
      });
    }

    const batchKeys = missingKeys.slice(startIndex, startIndex + BATCH_SIZE);
    
    if (batchKeys.length === 0) {
      return res.status(200).json({
        success: true,
        message: `Translation complete for ${targetLanguage}`,
        completed: true,
        totalKeys: missingKeys.length,
        translatedKeys: missingKeys.length,
        progress: 100
      });
    }

    const textsToTranslate = batchKeys.map(key => translations.en[key]);
    
    const [translatedTexts] = await translate.translate(textsToTranslate, targetLanguage);
    
    const newTranslations: Record<string, string> = { ...targetTranslations };
    batchKeys.forEach((key, index) => {
      newTranslations[key] = Array.isArray(translatedTexts) 
        ? translatedTexts[index] 
        : translatedTexts;
    });

    const sortedKeys = Object.keys(newTranslations).sort();
    const sortedTranslations = sortedKeys.reduce((acc, key) => {
      acc[key] = newTranslations[key];
      return acc;
    }, {} as Record<string, string>);

    const fileContent = `export const ${targetLanguage} = ${JSON.stringify(sortedTranslations, null, 2)};\n`;
    
    const filePath = path.join(process.cwd(), "src", "lib", "translations", `${targetLanguage}.ts`);
    fs.writeFileSync(filePath, fileContent, "utf-8");

    const totalProcessed = startIndex + batchKeys.length;
    const progress = Math.round((totalProcessed / missingKeys.length) * 100);

    return res.status(200).json({
      success: true,
      message: `Translated ${batchKeys.length} keys for ${targetLanguage}`,
      completed: totalProcessed >= missingKeys.length,
      totalKeys: missingKeys.length,
      translatedKeys: totalProcessed,
      progress,
      nextStartIndex: totalProcessed
    });

  } catch (error) {
    console.error("Translation error:", error);
    return res.status(500).json({
      error: "Translation failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}