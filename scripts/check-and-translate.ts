import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const TRANSLATIONS_FILE = join(process.cwd(), "src/lib/translations.ts");
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

interface TranslationData {
  en: Record<string, string>;
  id: Record<string, string>;
  zh: Record<string, string>;
}

function parseTranslationsFile(content: string): TranslationData {
  const enMatch = content.match(/en:\s*{([^}]+(?:{[^}]*}[^}]*)*?)},\s*id:/s);
  const idMatch = content.match(/id:\s*{([^}]+(?:{[^}]*}[^}]*)*?)},\s*zh:/s);
  const zhMatch = content.match(/zh:\s*{([^}]+(?:{[^}]*}[^}]*)*?)},?\s*};/s);

  function parseObject(objString: string): Record<string, string> {
    const result: Record<string, string> = {};
    const regex = /"([^"]+)":\s*"([^"]*(?:\\.[^"]*)*)"/g;
    let match;

    while ((match = regex.exec(objString)) !== null) {
      result[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }

    return result;
  }

  return {
    en: enMatch ? parseObject(enMatch[1]) : {},
    id: idMatch ? parseObject(idMatch[1]) : {},
    zh: zhMatch ? parseObject(zhMatch[1]) : {},
  };
}

function findMissingKeys(
  en: Record<string, string>,
  target: Record<string, string>
): string[] {
  return Object.keys(en).filter((key) => !target[key]);
}

async function translateText(
  text: string,
  targetLang: string
): Promise<string> {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error(
      "GOOGLE_TRANSLATE_API_KEY environment variable is not set"
    );
  }

  const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: text,
      target: targetLang,
      source: "en",
      format: "text",
    }),
  });

  if (!response.ok) {
    throw new Error(`Translation API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data.translations[0].translatedText;
}

async function translateBatch(
  keys: string[],
  en: Record<string, string>,
  targetLang: string
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const batchSize = 50;

  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    const texts = batch.map((key) => en[key]);

    console.log(
      `  Translating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(keys.length / batchSize)} (${batch.length} keys)...`
    );

    const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: texts,
        target: targetLang,
        source: "en",
        format: "text",
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.statusText}`);
    }

    const data = await response.json();

    batch.forEach((key, idx) => {
      result[key] = data.data.translations[idx].translatedText;
    });

    if (i + batchSize < keys.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return result;
}

function escapeForTypeScript(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function generateTranslationObject(
  translations: Record<string, string>,
  indent: string = "    "
): string {
  const entries = Object.entries(translations)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${indent}"${key}": "${escapeForTypeScript(value)}"`)
    .join(",\n");

  return entries;
}

async function main() {
  console.log("\n🔍 Checking translations before build...\n");

  try {
    const content = readFileSync(TRANSLATIONS_FILE, "utf-8");
    const translations = parseTranslationsFile(content);

    const missingId = findMissingKeys(translations.en, translations.id);
    const missingZh = findMissingKeys(translations.en, translations.zh);

    const totalKeys = Object.keys(translations.en).length;
    const idComplete = totalKeys - missingId.length;
    const zhComplete = totalKeys - missingZh.length;

    console.log(`📊 Translation Status:`);
    console.log(`   English (en): ${totalKeys}/${totalKeys} keys (100%)`);
    console.log(
      `   Indonesian (id): ${idComplete}/${totalKeys} keys (${Math.round((idComplete / totalKeys) * 100)}%)`
    );
    console.log(
      `   Chinese (zh): ${zhComplete}/${totalKeys} keys (${Math.round((zhComplete / totalKeys) * 100)}%)`
    );
    console.log("");

    if (missingId.length === 0 && missingZh.length === 0) {
      console.log("✅ All translations complete! Proceeding with build...\n");
      process.exit(0);
    }

    console.log("⚠️  Missing translations detected!");
    if (missingId.length > 0) {
      console.log(`   - Indonesian: ${missingId.length} keys missing`);
    }
    if (missingZh.length > 0) {
      console.log(`   - Chinese: ${missingZh.length} keys missing`);
    }
    console.log("");

    if (!GOOGLE_TRANSLATE_API_KEY) {
      console.error(
        "❌ ERROR: GOOGLE_TRANSLATE_API_KEY not found in environment variables!"
      );
      console.error(
        "   Please add it to Vercel Environment Variables with 'Expose to Build' enabled."
      );
      console.error(
        "   For local builds, add it to .env.local file.\n"
      );
      process.exit(1);
    }

    console.log("🌐 Auto-translating missing keys...\n");

    let newIdTranslations: Record<string, string> = {};
    let newZhTranslations: Record<string, string> = {};

    if (missingId.length > 0) {
      console.log(`🇮🇩 Translating ${missingId.length} Indonesian keys...`);
      newIdTranslations = await translateBatch(missingId, translations.en, "id");
      console.log(`✅ Indonesian translation complete!\n`);
    }

    if (missingZh.length > 0) {
      console.log(`🇨🇳 Translating ${missingZh.length} Chinese keys...`);
      newZhTranslations = await translateBatch(missingZh, translations.en, "zh-CN");
      console.log(`✅ Chinese translation complete!\n`);
    }

    const updatedId = { ...translations.id, ...newIdTranslations };
    const updatedZh = { ...translations.zh, ...newZhTranslations };

    const updatedContent = `import type { Language, TranslationKey, TranslationValue } from "@/types";

const translations: Record<Language, Record<TranslationKey, TranslationValue>> = {
  en: {
${generateTranslationObject(translations.en)}
  },
  id: {
${generateTranslationObject(updatedId)}
  },
  zh: {
${generateTranslationObject(updatedZh)}
  }
};

export default translations;
`;

    writeFileSync(TRANSLATIONS_FILE, updatedContent, "utf-8");

    const totalTranslated = missingId.length + missingZh.length;
    console.log(`✅ Successfully translated ${totalTranslated} keys!`);
    console.log(`📝 Updated: src/lib/translations.ts`);
    console.log(`🚀 Proceeding with build...\n`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Translation check failed:");
    console.error(error);
    console.error("\n⚠️  Build will continue, but translations may be incomplete.\n");
    process.exit(0);
  }
}

main();