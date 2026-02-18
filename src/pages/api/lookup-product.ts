import type { NextApiRequest, NextApiResponse } from "next";

type LookupResponse = {
  success: boolean;
  productName?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LookupResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { sku } = req.query;

  if (!sku || typeof sku !== "string") {
    return res.status(400).json({ success: false, error: "SKU parameter required" });
  }

  try {
    // Fetch from go-upc.com server-side (no CORS restrictions)
    const response = await fetch(`https://go-upc.com/search?q=${encodeURIComponent(sku)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return res.status(200).json({ success: false, error: "Product not found" });
    }

    const html = await response.text();

    // Extract product name from HTML
    const nameMatch = html.match(/<h1[^>]*class="product-name"[^>]*>(.*?)<\/h1>/i);
    
    if (nameMatch && nameMatch[1]) {
      const productName = nameMatch[1]
        .trim()
        .replace(/<[^>]*>/g, "") // Remove any HTML tags
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");

      return res.status(200).json({ success: true, productName });
    }

    // Product page loaded but no name found
    return res.status(200).json({ success: false, error: "Product name not found" });

  } catch (error) {
    console.debug("Product lookup failed:", error);
    return res.status(200).json({ success: false, error: "Lookup failed" });
  }
}