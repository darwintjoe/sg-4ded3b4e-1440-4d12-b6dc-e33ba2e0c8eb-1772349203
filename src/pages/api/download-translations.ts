import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const translationsPath = path.join(process.cwd(), "src", "lib", "translations.ts");
    const fileContent = fs.readFileSync(translationsPath, "utf-8");

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", "attachment; filename=translations.ts");
    res.status(200).send(fileContent);
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to read translations file",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}