import type { NextApiRequest, NextApiResponse } from "next";
import { translations } from "@/lib/translations";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

// Helper to check for missing keys in a language
function getMissingKeys(
  source: Record<string, string>,
  target: Record<string, string>
): string[] {
  return Object.keys(source).filter((key) => !target[key]);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Verify Environment Variables
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = process.env.GITHUB_REPO_OWNER;
    const REPO_NAME = process.env.GITHUB_REPO_NAME;
    const GOOGLE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

    if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
      return res.status(500).json({
        error: "GitHub configuration missing. Check GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME"
      });
    }

    // 2. Identify Missing Translations
    const enKeys = translations.en;
    const idKeys = translations.id || {};
    const zhKeys = translations.zh || {};

    const missingId = getMissingKeys(enKeys, idKeys);
    const missingZh = getMissingKeys(enKeys, zhKeys);

    if (missingId.length === 0 && missingZh.length === 0) {
      return res.status(200).json({ message: "All translations are up to date." });
    }

    // 3. Translate Missing Keys (Mocking Google Translate call for safety if no key)
    const newTranslations = {
      id: { ...idKeys },
      zh: { ...zhKeys }
    };

    // Helper to translate text
    async function translateText(text: string, targetLang: string): Promise<string> {
      if (!GOOGLE_API_KEY) return `[${targetLang}] ${text}`; // Fallback if no API key
      
      try {
        const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text, target: targetLang, format: "text" })
        });
        const data = await response.json();
        return data.data.translations[0].translatedText;
      } catch (e) {
        console.error(`Translation failed for ${text} to ${targetLang}`, e);
        return text; // Return original on error
      }
    }

    // Process ID
    for (const key of missingId) {
      newTranslations.id[key] = await translateText(enKeys[key], "id");
    }

    // Process ZH
    for (const key of missingZh) {
      newTranslations.zh[key] = await translateText(enKeys[key], "zh-CN");
    }

    // 4. Git Workflow: Clone -> Update -> Commit -> Push
    const tempDir = path.join("/tmp", `repo-${Date.now()}`);
    const repoUrl = `https://${GITHUB_TOKEN}@github.com/${REPO_OWNER}/${REPO_NAME}.git`;

    await execPromise(`git clone --depth 1 ${repoUrl} ${tempDir}`);

    // Update translations.ts file content
    // We need to construct the file content string carefully
    // NOTE: In a real app, we might use AST parsing, but regex/replacement is simpler here
    // Since we know the file structure, we can reconstruct it.
    
    // We'll read the CURRENT file structure style from the cloned repo to be safe
    // But since we define the structure, we can just generate the whole file content
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

    // Write to file
    const translationsPath = path.join(tempDir, "src", "lib", "translations.ts");
    fs.writeFileSync(translationsPath, fileContent);

    // Commit and Push
    await execPromise(`cd ${tempDir} && git config user.name "Softgen Auto-Translator" && git config user.email "bot@softgen.ai"`);
    await execPromise(`cd ${tempDir} && git add src/lib/translations.ts`);
    await execPromise(`cd ${tempDir} && git commit -m "chore(i18n): Auto-translate missing keys"`);
    await execPromise(`cd ${tempDir} && git push`);

    // Cleanup
    await execPromise(`rm -rf ${tempDir}`);

    return res.status(200).json({
      success: true,
      message: "Translations updated and pushed to GitHub",
      translatedKeys: {
        id: missingId.length,
        zh: missingZh.length
      }
    });

  } catch (error) {
    console.error("Auto-translation error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}