/**
 * Subscription Service for Sell More POS
 * 
 * Code Format: SM-DURTN-ISSDT-CHECK
 * Example: SM-12MO-26022-A7X9K
 * 
 * - SM: Prefix (Sell More)
 * - DURTN: Duration (01MO, 03MO, 06MO, 12MO)
 * - ISSDT: Issue date encoded (YYMDD format, Y=year last digit, M=month hex, DD=day)
 * - CHECK: 5-char checksum for validation
 */

export interface SubscriptionInfo {
  isActive: boolean;
  expiryDate: Date | null;
  daysRemaining: number;
  status: "active" | "warning" | "critical" | "expired" | "none";
  activatedAt: Date | null;
  code: string | null;
}

export interface DecodedCode {
  valid: boolean;
  durationMonths: number;
  issueDate: Date;
  error?: string;
}

const STORAGE_KEY = "sellmore_subscription";
const SECRET_SALT = "SM2026SELLMORE"; // Used for checksum generation

// Duration mapping
const DURATION_MAP: Record<string, number> = {
  "01MO": 1,
  "03MO": 3,
  "06MO": 6,
  "12MO": 12,
};

const REVERSE_DURATION_MAP: Record<number, string> = {
  1: "01MO",
  3: "03MO",
  6: "06MO",
  12: "12MO",
};

/**
 * Generate checksum for code validation
 */
function generateChecksum(duration: string, issueDate: string): string {
  const input = `${SECRET_SALT}-${duration}-${issueDate}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to alphanumeric (base36) and take 5 chars
  const checksum = Math.abs(hash).toString(36).toUpperCase().padStart(5, "0").slice(0, 5);
  return checksum;
}

/**
 * Encode issue date to YYMDD format
 * Y = last digit of year (0-9)
 * M = month in hex (1-9, A=10, B=11, C=12)
 * DD = day (01-31)
 */
function encodeIssueDate(date: Date): string {
  const year = date.getFullYear() % 10; // Last digit
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();
  
  const monthHex = month <= 9 ? month.toString() : String.fromCharCode(55 + month); // A=10, B=11, C=12
  const dayStr = day.toString().padStart(2, "0");
  
  return `${year}${monthHex}${dayStr}`;
}

/**
 * Decode issue date from YYMDD format
 */
function decodeIssueDate(encoded: string): Date | null {
  if (encoded.length !== 4) return null;
  
  const yearDigit = parseInt(encoded[0], 10);
  const monthChar = encoded[1];
  const day = parseInt(encoded.slice(2, 4), 10);
  
  if (isNaN(yearDigit) || isNaN(day)) return null;
  
  // Decode month
  let month: number;
  if (monthChar >= "1" && monthChar <= "9") {
    month = parseInt(monthChar, 10);
  } else if (monthChar >= "A" && monthChar <= "C") {
    month = monthChar.charCodeAt(0) - 55; // A=10, B=11, C=12
  } else {
    return null;
  }
  
  // Determine full year (assume 2020-2029 range)
  const currentDecade = Math.floor(new Date().getFullYear() / 10) * 10;
  const year = currentDecade + yearDigit;
  
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  
  return new Date(year, month - 1, day);
}

/**
 * Generate a subscription code
 */
export function generateSubscriptionCode(durationMonths: number, issueDate: Date = new Date()): string {
  const duration = REVERSE_DURATION_MAP[durationMonths];
  if (!duration) {
    throw new Error(`Invalid duration: ${durationMonths}. Must be 1, 3, 6, or 12 months.`);
  }
  
  const issueDateEncoded = encodeIssueDate(issueDate);
  const checksum = generateChecksum(duration, issueDateEncoded);
  
  return `SM-${duration}-${issueDateEncoded}-${checksum}`;
}

/**
 * Decode and validate a subscription code
 */
export function decodeSubscriptionCode(code: string): DecodedCode {
  // Normalize code
  const normalizedCode = code.toUpperCase().trim().replace(/\s+/g, "");
  
  // Check format: SM-XXXX-XXXX-XXXXX
  const parts = normalizedCode.split("-");
  if (parts.length !== 4) {
    return { valid: false, durationMonths: 0, issueDate: new Date(), error: "Invalid code format" };
  }
  
  const [prefix, duration, issueDateEncoded, checksum] = parts;
  
  // Validate prefix
  if (prefix !== "SM") {
    return { valid: false, durationMonths: 0, issueDate: new Date(), error: "Invalid code prefix" };
  }
  
  // Validate duration
  const durationMonths = DURATION_MAP[duration];
  if (!durationMonths) {
    return { valid: false, durationMonths: 0, issueDate: new Date(), error: "Invalid duration" };
  }
  
  // Decode issue date
  const issueDate = decodeIssueDate(issueDateEncoded);
  if (!issueDate) {
    return { valid: false, durationMonths: 0, issueDate: new Date(), error: "Invalid issue date" };
  }
  
  // Validate checksum
  const expectedChecksum = generateChecksum(duration, issueDateEncoded);
  if (checksum !== expectedChecksum) {
    return { valid: false, durationMonths: 0, issueDate: new Date(), error: "Invalid checksum - code may be tampered" };
  }
  
  // Check if code is not from the future (allow 1 day tolerance)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (issueDate > tomorrow) {
    return { valid: false, durationMonths: 0, issueDate: new Date(), error: "Code issue date is in the future" };
  }
  
  // Check if code is not too old (codes valid for 1 year from issue)
  const maxAge = new Date(issueDate);
  maxAge.setFullYear(maxAge.getFullYear() + 1);
  if (new Date() > maxAge) {
    return { valid: false, durationMonths: 0, issueDate, error: "Code has expired (over 1 year old)" };
  }
  
  return { valid: true, durationMonths, issueDate };
}

/**
 * Activate a subscription code
 */
export function activateSubscriptionCode(code: string): { success: boolean; error?: string; subscription?: SubscriptionInfo } {
  const decoded = decodeSubscriptionCode(code);
  
  if (!decoded.valid) {
    return { success: false, error: decoded.error };
  }
  
  // Check if code was already used
  const usedCodes = getUsedCodes();
  const normalizedCode = code.toUpperCase().trim();
  if (usedCodes.includes(normalizedCode)) {
    return { success: false, error: "This code has already been used" };
  }
  
  // Get current subscription
  const current = getSubscriptionInfo();
  
  // Calculate new expiry date
  let newExpiry: Date;
  if (current.isActive && current.expiryDate && current.expiryDate > new Date()) {
    // Extend from current expiry
    newExpiry = new Date(current.expiryDate);
  } else {
    // Start from today
    newExpiry = new Date();
  }
  newExpiry.setMonth(newExpiry.getMonth() + decoded.durationMonths);
  
  // Save subscription
  const subscriptionData = {
    expiryDate: newExpiry.toISOString(),
    activatedAt: new Date().toISOString(),
    code: normalizedCode,
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptionData));
  
  // Mark code as used
  markCodeAsUsed(normalizedCode);
  
  return { success: true, subscription: getSubscriptionInfo() };
}

/**
 * Get current subscription info
 */
export function getSubscriptionInfo(): SubscriptionInfo {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        isActive: false,
        expiryDate: null,
        daysRemaining: 0,
        status: "none",
        activatedAt: null,
        code: null,
      };
    }
    
    const data = JSON.parse(stored);
    const expiryDate = new Date(data.expiryDate);
    const activatedAt = data.activatedAt ? new Date(data.activatedAt) : null;
    const now = new Date();
    
    const diffTime = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status: SubscriptionInfo["status"];
    if (daysRemaining <= 0) {
      status = "expired";
    } else if (daysRemaining <= 30) {
      status = "critical";
    } else if (daysRemaining <= 90) {
      status = "warning";
    } else {
      status = "active";
    }
    
    return {
      isActive: daysRemaining > 0,
      expiryDate,
      daysRemaining: Math.max(0, daysRemaining),
      status,
      activatedAt,
      code: data.code || null,
    };
  } catch {
    return {
      isActive: false,
      expiryDate: null,
      daysRemaining: 0,
      status: "none",
      activatedAt: null,
      code: null,
    };
  }
}

/**
 * Get subscription bar percentage (0-100)
 */
export function getSubscriptionBarPercentage(): number {
  const info = getSubscriptionInfo();
  if (info.status === "none" || info.status === "expired") {
    return 0;
  }
  
  // Full bar = 365 days
  const percentage = Math.min(100, (info.daysRemaining / 365) * 100);
  return Math.max(0, percentage);
}

/**
 * Get subscription bar color based on status
 */
export function getSubscriptionBarColor(status: SubscriptionInfo["status"]): string {
  switch (status) {
    case "active":
      return "#22c55e"; // Green
    case "warning":
      return "#f97316"; // Orange
    case "critical":
      return "#ef4444"; // Red
    case "expired":
      return "#1f2937"; // Dark gray/black
    case "none":
    default:
      return "#6b7280"; // Gray
  }
}

/**
 * Track used codes to prevent reuse
 */
function getUsedCodes(): string[] {
  try {
    const stored = localStorage.getItem("sellmore_used_codes");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function markCodeAsUsed(code: string): void {
  const usedCodes = getUsedCodes();
  if (!usedCodes.includes(code)) {
    usedCodes.push(code);
    localStorage.setItem("sellmore_used_codes", JSON.stringify(usedCodes));
  }
}

/**
 * Clear subscription (for testing only)
 */
export function clearSubscription(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Developer QRIS configuration
 * This is intentionally hardcoded and not accessible to POS users
 */
export const DEVELOPER_QRIS = {
  // Dynamic QRIS merchant info - update via code deployment
  merchantName: "SELL MORE DEV",
  merchantId: "ID1234567890", // Replace with actual merchant ID
  
  // Pricing in IDR
  pricing: {
    1: 50000,   // 1 month
    3: 135000,  // 3 months (10% discount)
    6: 255000,  // 6 months (15% discount)
    12: 480000, // 12 months (20% discount)
  } as Record<number, number>,
  
  // Generate QRIS content for dynamic QRIS
  // This should be replaced with actual QRIS API integration
  generateQRISContent(amount: number, orderId: string): string {
    // Placeholder - in production, this would call QRIS API
    // Format: QRIS standard format
    return `00020101021226610014ID.CO.SELLMORE0118${this.merchantId}5204123453033605802ID5913${this.merchantName}6007Jakarta61051234562070703${orderId}5303360540${amount}6304`;
  },
};

/**
 * Format price to IDR
 */
export function formatPriceIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}