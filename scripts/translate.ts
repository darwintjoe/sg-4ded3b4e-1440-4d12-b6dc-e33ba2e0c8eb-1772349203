/**
 * Automatic Translation Script
 * 
 * Usage: npm run translate
 * 
 * This script:
 * 1. Reads all translation files from src/lib/translations/
 * 2. Finds missing translations in non-English languages (comparing to en.ts)
 * 3. Calls Google Translate API to translate from English
 * 4. Updates the respective language files with new translations
 * 
 * Setup:
 * 1. Get Google Cloud Translation API key:
 *    - Go to https://console.cloud.google.com/
 *    - Create a project (or select existing)
 *    - Enable "Cloud Translation API"
 *    - Go to "APIs & Services" > "Credentials"
 *    - Create API Key
 * 
 * 2. Set environment variable:
 *    - Create .env.local file (if not exists)
 *    - Add: GOOGLE_TRANSLATE_API_KEY=your_api_key_here
 * 
 * 3. Run: npm run translate
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const TRANSLATIONS_DIR = path.join(__dirname, "../src/lib/translations");
const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

// Language codes mapping for Google Translate API
const GOOGLE_LANG_CODES: Record<string, string> = {
  id: "id",      // Indonesian
  zh: "zh-CN",   // Chinese (Simplified)
  th: "th",      // Thai
  vi: "vi",      // Vietnamese
  my: "my",      // Myanmar (Burmese)
};

interface TranslationResult {
  translatedText: string;
}

interface GoogleTranslateResponse {
  data: {
    translations: TranslationResult[];
  };
}

// Rate limiting: Google allows 100 requests per second, we'll be conservative
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES = 1000; // 1 second

async function translateText(
  texts: string[],
  targetLang: string
): Promise<string[]> {
  if (!API_KEY) {
    throw new Error(
      "GOOGLE_TRANSLATE_API_KEY not found in .env.local\n" +
      "Please add: GOOGLE_TRANSLATE_API_KEY=your_api_key_here"
    );
  }

  const googleLang = GOOGLE_LANG_CODES[targetLang] || targetLang;
  const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: texts,
      source: "en",
      target: googleLang,
      format: "text",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Translate API error: ${error}`);
  }

  const data: GoogleTranslateResponse = await response.json();
  return data.data.translations.map((t) => t.translatedText);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateInBatches(
  texts: string[],
  targetLang: string
): Promise<string[]> {
  const results: string[] = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(`  Translating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)}...`);
    
    const translated = await translateText(batch, targetLang);
    results.push(...translated);
    
    if (i + BATCH_SIZE < texts.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }
  
  return results;
}

function parseTranslationFile(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, "utf-8");
  const result: Record<string, string> = {};
  
  // Match "key": "value" patterns
  const regex = /"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const [, key, value] = match;
    result[key] = value
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
  }
  
  return result;
}

function escapeForTypeScript(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function generateTranslationFile(
  langCode: string,
  translations: Record<string, string>
): string {
  const entries = Object.entries(translations)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  "${key}": "${escapeForTypeScript(value)}"`)
    .join(",\n");
  
  return `export const ${langCode} = {\n${entries}\n};\n`;
}

async function main() {
  console.log("🌐 Sell More Translation Script\n");
  console.log("================================\n");

  // Check API key
  if (!API_KEY) {
    console.error("❌ Error: GOOGLE_TRANSLATE_API_KEY not found\n");
    console.log("Setup instructions:");
    console.log("1. Go to https://console.cloud.google.com/");
    console.log("2. Create or select a project");
    console.log('3. Enable "Cloud Translation API"');
    console.log('4. Go to "APIs & Services" > "Credentials"');
    console.log("5. Create API Key");
    console.log("6. Add to .env.local: GOOGLE_TRANSLATE_API_KEY=your_key_here\n");
    process.exit(1);
  }

  // Read English translations (source of truth)
  const enPath = path.join(TRANSLATIONS_DIR, "en.ts");
  console.log("📖 Reading English translations (source of truth)...");
  const enTranslations = parseTranslationFile(enPath);
  const enKeys = Object.keys(enTranslations);
  console.log(`   Found ${enKeys.length} English keys\n`);

  // Process each target language
  const targetLanguages = ["id", "zh", "th", "vi", "my"];
  let totalTranslated = 0;
  let totalCharacters = 0;

  for (const lang of targetLanguages) {
    const langPath = path.join(TRANSLATIONS_DIR, `${lang}.ts`);
    
    if (!fs.existsSync(langPath)) {
      console.log(`⚠️  ${lang}.ts not found, creating new file...`);
      fs.writeFileSync(langPath, `export const ${lang} = {};\n`);
    }

    const langTranslations = parseTranslationFile(langPath);
    const missingKeys = enKeys.filter((key) => !langTranslations[key]);

    console.log(`📋 ${lang.toUpperCase()}: ${missingKeys.length} missing keys`);

    if (missingKeys.length === 0) {
      console.log(`   ✅ All translations complete!\n`);
      continue;
    }

    // Calculate characters
    const chars = missingKeys.reduce((sum, key) => sum + enTranslations[key].length, 0);
    totalCharacters += chars;

    // Translate missing keys
    console.log(`   Translating ${missingKeys.length} keys (${chars.toLocaleString()} characters)...`);
    const textsToTranslate = missingKeys.map((key) => enTranslations[key]);
    const translatedTexts = await translateInBatches(textsToTranslate, lang);

    // Merge translations
    missingKeys.forEach((key, index) => {
      langTranslations[key] = translatedTexts[index];
    });

    // Write updated file
    const newContent = generateTranslationFile(lang, langTranslations);
    fs.writeFileSync(langPath, newContent);

    totalTranslated += missingKeys.length;
    console.log(`   ✅ Updated ${lang}.ts with ${missingKeys.length} new translations\n`);
  }

  // Summary
  console.log("================================");
  console.log("📋 Summary:");
  console.log(`   - Total keys translated: ${totalTranslated}`);
  console.log(`   - Total characters: ${totalCharacters.toLocaleString()}`);
  console.log(`   - Free tier usage: ${((totalCharacters / 500000) * 100).toFixed(2)}% of monthly limit\n`);
  
  if (totalTranslated === 0) {
    console.log("✅ All translations are already complete! Nothing to do.\n");
  } else {
    console.log("✅ Translation files updated successfully!\n");
    console.log("🚀 You can now deploy your app with: vercel deploy\n");
  }
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});