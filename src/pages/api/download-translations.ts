import type { NextApiRequest, NextApiResponse } from "next";
import { translations } from "@/lib/translations";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Return all translations as a JSON file
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=translations-backup.json");
    
    return res.status(200).json(translations);
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}