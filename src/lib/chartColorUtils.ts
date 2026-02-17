/**
 * Shared utility functions for generating consistent chart colors
 */

/**
 * Predefined color palettes for charts
 */
export const COLOR_PALETTES = {
  // Primary spectrum - vibrant colors
  spectrum: [
    "#3b82f6", // Blue
    "#10b981", // Green
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#f97316", // Orange
  ],

  // Pastel spectrum - softer colors
  pastel: [
    "#93c5fd", // Light Blue
    "#6ee7b7", // Light Green
    "#fcd34d", // Light Amber
    "#fca5a5", // Light Red
    "#c4b5fd", // Light Purple
    "#f9a8d4", // Light Pink
    "#67e8f9", // Light Cyan
    "#fdba74", // Light Orange
  ],

  // Payment methods - consistent colors
  payment: {
    cash: "#10b981", // Green
    card: "#3b82f6", // Blue
    digital: "#8b5cf6", // Purple
    credit: "#f59e0b", // Amber
    other: "#6b7280", // Gray
  },

  // Status colors
  status: {
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
    neutral: "#6b7280",
  },
};

/**
 * Generate an array of distinct colors for charts
 * @param count - Number of colors needed
 * @param palette - Color palette to use (default: spectrum)
 * @returns Array of hex color strings
 */
export function generateChartColors(count: number, palette: "spectrum" | "pastel" = "spectrum"): string[] {
  const colors = COLOR_PALETTES[palette];
  const result: string[] = [];

  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }

  return result;
}

/**
 * Get color for a specific payment method
 * @param paymentMethod - Payment method name
 * @returns Hex color string
 */
export function getPaymentMethodColor(paymentMethod: string): string {
  const method = paymentMethod.toLowerCase();

  if (method.includes("cash") || method.includes("tunai")) {
    return COLOR_PALETTES.payment.cash;
  }
  if (method.includes("card") || method.includes("kartu") || method.includes("debit") || method.includes("credit")) {
    return COLOR_PALETTES.payment.card;
  }
  if (method.includes("digital") || method.includes("e-wallet") || method.includes("qr")) {
    return COLOR_PALETTES.payment.digital;
  }
  if (method.includes("credit") || method.includes("kredit")) {
    return COLOR_PALETTES.payment.credit;
  }

  return COLOR_PALETTES.payment.other;
}

/**
 * Generate colors mapped to payment methods
 * @param paymentMethods - Array of payment method names
 * @returns Object mapping payment method to color
 */
export function getPaymentMethodColors(paymentMethods: string[]): Record<string, string> {
  const colorMap: Record<string, string> = {};

  paymentMethods.forEach((method) => {
    colorMap[method] = getPaymentMethodColor(method);
  });

  return colorMap;
}

/**
 * Get status color
 * @param status - Status type
 * @returns Hex color string
 */
export function getStatusColor(status: "success" | "warning" | "error" | "info" | "neutral"): string {
  return COLOR_PALETTES.status[status];
}

/**
 * Generate gradient colors between two colors
 * @param startColor - Start color (hex)
 * @param endColor - End color (hex)
 * @param steps - Number of colors to generate
 * @returns Array of hex color strings
 */
export function generateGradientColors(startColor: string, endColor: string, steps: number): string[] {
  const start = hexToRgb(startColor);
  const end = hexToRgb(endColor);

  if (!start || !end) return [startColor, endColor];

  const colors: string[] = [];

  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const r = Math.round(start.r + ratio * (end.r - start.r));
    const g = Math.round(start.g + ratio * (end.g - start.g));
    const b = Math.round(start.b + ratio * (end.b - start.b));
    colors.push(rgbToHex(r, g, b));
  }

  return colors;
}

/**
 * Convert hex color to RGB
 * @param hex - Hex color string
 * @returns RGB object or null if invalid
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex color
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Hex color string
 */
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * Lighten a color by a percentage
 * @param color - Hex color string
 * @param percent - Percentage to lighten (0-100)
 * @returns Lightened hex color string
 */
export function lightenColor(color: string, percent: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const factor = 1 + percent / 100;
  const r = Math.min(255, Math.round(rgb.r * factor));
  const g = Math.min(255, Math.round(rgb.g * factor));
  const b = Math.min(255, Math.round(rgb.b * factor));

  return rgbToHex(r, g, b);
}

/**
 * Darken a color by a percentage
 * @param color - Hex color string
 * @param percent - Percentage to darken (0-100)
 * @returns Darkened hex color string
 */
export function darkenColor(color: string, percent: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const factor = 1 - percent / 100;
  const r = Math.max(0, Math.round(rgb.r * factor));
  const g = Math.max(0, Math.round(rgb.g * factor));
  const b = Math.max(0, Math.round(rgb.b * factor));

  return rgbToHex(r, g, b);
}