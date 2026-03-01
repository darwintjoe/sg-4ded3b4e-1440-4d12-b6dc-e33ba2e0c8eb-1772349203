import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

type TranslationResponse = {
  success: boolean;
  message: string;
  translated?: number;
  error?: string;
};

async function translateText(text: string, targetLang: string): Promise<string> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY not configured");
  }

  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      target: targetLang,
      format: "text",
      source: "en"
    })
  });

  if (!response.ok) {
    throw new Error(`Translation API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data.translations[0].translatedText;
}

async function detectOrphanedKeys() {
  const translationsPath = path.join(process.cwd(), "src/lib/translations.ts");
  const content = fs.readFileSync(translationsPath, "utf-8");
  
  const enMatch = content.match(/en:\s*{([^}]+)}/s);
  const idMatch = content.match(/id:\s*{([^}]+)}/s);
  const zhMatch = content.match(/zh:\s*{([^}]+)}/s);
  
  if (!enMatch) {
    return { orphaned: [], allKeys: [] };
  }

  const extractKeys = (block: string): Set<string> => {
    const keys = new Set<string>();
    const keyRegex = /"([^"]+)":\s*"[^"]*"/g;
    let match;
    while ((match = keyRegex.exec(block)) !== null) {
      keys.add(match[1]);
    }
    return keys;
  };

  const enKeys = extractKeys(enMatch[1]);
  const idKeys = idMatch ? extractKeys(idMatch[1]) : new Set<string>();
  const zhKeys = zhMatch ? extractKeys(zhMatch[1]) : new Set<string>();

  const orphaned: Array<{ key: string; missingIn: string[] }> = [];

  enKeys.forEach(key => {
    const missing: string[] = [];
    if (!idKeys.has(key)) missing.push("id");
    if (!zhKeys.has(key)) missing.push("zh");
    
    if (missing.length > 0) {
      orphaned.push({ key, missingIn: missing });
    }
  });

  return { orphaned, allKeys: Array.from(enKeys) };
}

async function translateOrphanedKeys() {
  const translationsPath = path.join(process.cwd(), "src/lib/translations.ts");
  let content = fs.readFileSync(translationsPath, "utf-8");
  
  const { orphaned } = await detectOrphanedKeys();
  
  if (orphaned.length === 0) {
    return { translated: 0, content };
  }

  const enMatch = content.match(/en:\s*{([^}]+)}/s);
  if (!enMatch) {
    throw new Error("Cannot parse English translations");
  }

  const getEnglishValue = (key: string): string => {
    const regex = new RegExp(`"${key}":\\s*"([^"]*)"`, "g");
    const match = regex.exec(enMatch[1]);
    return match ? match[1] : key;
  };

  let translatedCount = 0;

  for (const { key, missingIn } of orphaned) {
    const englishText = getEnglishValue(key);
    
    for (const lang of missingIn) {
      try {
        const translated = await translateText(englishText, lang);
        
        const langRegex = new RegExp(`(${lang}:\\s*{)([^}]*)(})`, "s");
        const langMatch = content.match(langRegex);
        
        if (langMatch) {
          let langBlock = langMatch[2];
          
          const hasExistingKeys = langBlock.trim().length > 0 && langBlock.includes(":");
          
          if (hasExistingKeys) {
            langBlock = langBlock.trimEnd();
            if (!langBlock.endsWith(",")) {
              langBlock += ",";
            }
            langBlock += `\n    "${key}": "${translated}"`;
          } else {
            langBlock = `\n    "${key}": "${translated}"\n  `;
          }
          
          content = content.replace(langRegex, `$1${langBlock}$3`);
          translatedCount++;
        }
      } catch (error) {
        console.error(`Failed to translate "${key}" to ${lang}:`, error);
      }
    }
  }

  fs.writeFileSync(translationsPath, content, "utf-8");
  
  return { translated: translatedCount, content };
}

async function commitToGitHub(message: string) {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_REPO_OWNER;
  const repoName = process.env.GITHUB_REPO_NAME;
  
  if (!token || !repoOwner || !repoName) {
    throw new Error("GitHub credentials not configured. Need: GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME");
  }

  const translationsPath = "src/lib/translations.ts";
  const content = fs.readFileSync(path.join(process.cwd(), translationsPath), "utf-8");
  const base64Content = Buffer.from(content).toString("base64");

  const getFileUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${translationsPath}`;
  
  const fileResponse = await fetch(getFileUrl, {
    headers: {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github.v3+json"
    }
  });

  if (!fileResponse.ok) {
    throw new Error(`Failed to get file SHA: ${fileResponse.status}`);
  }

  const fileData = await fileResponse.json();
  const sha = fileData.sha;

  const updateUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${translationsPath}`;
  
  const updateResponse = await fetch(updateUrl, {
    method: "PUT",
    headers: {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      content: base64Content,
      sha,
      branch: "main"
    })
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`Failed to commit: ${updateResponse.status} - ${errorText}`);
  }

  return await updateResponse.json();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranslationResponse>
) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ 
      success: false, 
      message: "Method not allowed" 
    });
  }

  try {
    const { orphaned } = await detectOrphanedKeys();
    
    if (orphaned.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No orphaned keys found. All translations are complete!",
        translated: 0
      });
    }

    const { translated } = await translateOrphanedKeys();

    try {
      await commitToGitHub(`chore: Auto-translate ${translated} orphaned keys`);
      
      return res.status(200).json({
        success: true,
        message: `Successfully translated and committed ${translated} keys`,
        translated
      });
    } catch (commitError) {
      return res.status(200).json({
        success: true,
        message: `Translated ${translated} keys locally. GitHub commit failed: ${commitError instanceof Error ? commitError.message : "Unknown error"}. You may need to configure GitHub credentials.`,
        translated
      });
    }
  } catch (error) {
    console.error("Translation error:", error);
    return res.status(500).json({
      success: false,
      message: "Translation failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}