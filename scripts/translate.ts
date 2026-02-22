/**
 * Automatic Translation Script
 * 
 * Usage: npm run translate
 * 
 * This script:
 * 1. Reads translations.ts
 * 2. Finds missing Indonesian (id) and Chinese (zh) translations
 * 3. Calls Google Translate API to translate from English
 * 4. Updates translations.ts with new translations
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

const TRANSLATIONS_FILE = path.join(__dirname, "../src/lib/translations.ts");
const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

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

  const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: texts,
      source: "en",
      target: targetLang,
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

function parseTranslationsFile(content: string): {
  en: Record<string, string>;
  id: Record<string, string>;
  zh: Record<string, string>;
} {
  // Extract the translations object using regex
  const enMatch = content.match(/export const en:\s*Translations\s*=\s*\{([\s\S]*?)\n\};/);
  const idMatch = content.match(/export const id:\s*Partial<Translations>\s*=\s*\{([\s\S]*?)\n\};/);
  const zhMatch = content.match(/export const zh:\s*Partial<Translations>\s*=\s*\{([\s\S]*?)\n\};/);

  if (!enMatch) {
    throw new Error("Could not find English translations in file");
  }

  const parseObject = (str: string): Record<string, string> => {
    const result: Record<string, string> = {};
    // Match key: "value" or key: 'value' patterns
    const regex = /(\w+):\s*["'`]((?:[^"'`\\]|\\.)*)["'`]/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
      // Unescape the value
      result[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\'/g, "'");
    }
    return result;
  };

  return {
    en: parseObject(enMatch[1]),
    id: idMatch ? parseObject(idMatch[1]) : {},
    zh: zhMatch ? parseObject(zhMatch[1]) : {},
  };
}

function escapeForTypeScript(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function generateTranslationObject(
  translations: Record<string, string>,
  indent: string = "  "
): string {
  const entries = Object.entries(translations)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${indent}${key}: "${escapeForTypeScript(value)}"`)
    .join(",\n");
  
  return entries;
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

  // Read translations file
  console.log("📖 Reading translations.ts...");
  const content = fs.readFileSync(TRANSLATIONS_FILE, "utf-8");
  const translations = parseTranslationsFile(content);

  const enKeys = Object.keys(translations.en);
  console.log(`   Found ${enKeys.length} English keys\n`);

  // Find missing translations
  const missingId = enKeys.filter((key) => !translations.id[key]);
  const missingZh = enKeys.filter((key) => !translations.zh[key]);

  console.log(`📋 Missing translations:`);
  console.log(`   Indonesian (id): ${missingId.length} keys`);
  console.log(`   Chinese (zh): ${missingZh.length} keys\n`);

  if (missingId.length === 0 && missingZh.length === 0) {
    console.log("✅ All translations are complete! Nothing to do.\n");
    return;
  }

  // Calculate characters to translate
  const idChars = missingId.reduce((sum, key) => sum + translations.en[key].length, 0);
  const zhChars = missingZh.reduce((sum, key) => sum + translations.en[key].length, 0);
  const totalChars = idChars + zhChars;

  console.log(`📊 Characters to translate: ${totalChars.toLocaleString()}`);
  console.log(`   (Free tier: 500,000/month)\n`);

  // Translate Indonesian
  if (missingId.length > 0) {
    console.log("🇮🇩 Translating to Indonesian...");
    const textsToTranslate = missingId.map((key) => translations.en[key]);
    const translatedTexts = await translateInBatches(textsToTranslate, "id");
    
    missingId.forEach((key, index) => {
      translations.id[key] = translatedTexts[index];
    });
    console.log(`   ✅ Translated ${missingId.length} keys\n`);
  }

  // Translate Chinese
  if (missingZh.length > 0) {
    console.log("🇨🇳 Translating to Chinese...");
    const textsToTranslate = missingZh.map((key) => translations.en[key]);
    const translatedTexts = await translateInBatches(textsToTranslate, "zh");
    
    missingZh.forEach((key, index) => {
      translations.zh[key] = translatedTexts[index];
    });
    console.log(`   ✅ Translated ${missingZh.length} keys\n`);
  }

  // Generate new file content
  console.log("📝 Updating translations.ts...");
  
  // Read the original file to preserve the Translations interface
  const interfaceMatch = content.match(/(\/\*\*[\s\S]*?\*\/\s*)?export interface Translations \{[\s\S]*?\n\}/);
  const translationsInterface = interfaceMatch ? interfaceMatch[0] : "";
  
  // Also preserve any imports and the getTranslation function
  const importMatch = content.match(/^[\s\S]*?(?=export interface Translations)/);
  const imports = importMatch ? importMatch[0].trim() : "";
  
  const getTranslationMatch = content.match(/export function getTranslation[\s\S]*$/);
  const getTranslationFunc = getTranslationMatch ? getTranslationMatch[0] : "";

  const newContent = `${imports}

${translationsInterface}

export const en: Translations = {
${generateTranslationObject(translations.en)}
};

export const id: Partial<Translations> = {
${generateTranslationObject(translations.id)}
};

export const zh: Partial<Translations> = {
${generateTranslationObject(translations.zh)}
};

${getTranslationFunc}`;

  // Write the updated file
  fs.writeFileSync(TRANSLATIONS_FILE, newContent, "utf-8");

  console.log("✅ translations.ts updated successfully!\n");
  console.log("📋 Summary:");
  console.log(`   - Indonesian: ${Object.keys(translations.id).length}/${enKeys.length} keys`);
  console.log(`   - Chinese: ${Object.keys(translations.zh).length}/${enKeys.length} keys`);
  console.log(`   - Characters translated: ${totalChars.toLocaleString()}\n`);
  console.log("🚀 You can now deploy your app with: vercel deploy\n");
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});