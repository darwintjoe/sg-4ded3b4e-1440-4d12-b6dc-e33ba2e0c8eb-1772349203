/**
 * Accurate.id API Integration Service
 * 
 * Foundation service for integrating Sell More POS with Accurate.id accounting software.
 * Handles OAuth 2.0 authentication, token management, and API calls with queue-based sync.
 * 
 * API Documentation: https://accurate.id/api-integration/
 * 
 * Key Features:
 * - OAuth 2.0 authentication flow
 * - Automatic token refresh
 * - Queue-based sync for offline support
 * - Rate limiting (100 req/min)
 * - Error handling and retry logic
 */

import type {
  AccurateCredentials,
  AccurateConnectionStatus,
  AccurateSyncQueueItem,
  AccurateSalesInvoice,
  Transaction,
  Item,
} from "@/types";

// Constants
const ACCURATE_AUTH_URL = "https://account.accurate.id/oauth/authorize";
const ACCURATE_TOKEN_URL = "https://account.accurate.id/oauth/token";
const ACCURATE_API_BASE = "https://zeus.accurate.id/accurate/api";
const ACCURATE_DB_LIST_URL = "https://account.accurate.id/api/db-list.do";

const STORAGE_KEY = "accurate_credentials";
const SYNC_QUEUE_KEY = "accurate_sync_queue";
const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

interface RateLimitState {
  requests: number[];
}

class AccurateService {
  private credentials: AccurateCredentials | null = null;
  private rateLimitState: RateLimitState = { requests: [] };
  private syncInProgress = false;

  constructor() {
    this.loadCredentials();
  }

  // ==========================================
  // Credential Management
  // ==========================================

  private loadCredentials(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.credentials = JSON.parse(stored);
      }
    } catch (error) {
      console.error("[Accurate] Failed to load credentials:", error);
    }
  }

  private saveCredentials(): void {
    try {
      if (this.credentials) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.credentials));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error("[Accurate] Failed to save credentials:", error);
    }
  }

  public getCredentials(): AccurateCredentials | null {
    return this.credentials;
  }

  public setCredentials(creds: Partial<AccurateCredentials>): void {
    this.credentials = { ...this.credentials, ...creds } as AccurateCredentials;
    this.saveCredentials();
  }

  public clearCredentials(): void {
    this.credentials = null;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SYNC_QUEUE_KEY);
  }

  public isConfigured(): boolean {
    return !!(this.credentials?.clientId && this.credentials?.clientSecret);
  }

  public isConnected(): boolean {
    return !!(
      this.credentials?.accessToken &&
      this.credentials?.tokenExpiresAt &&
      this.credentials.tokenExpiresAt > Date.now()
    );
  }

  // ==========================================
  // OAuth 2.0 Flow
  // ==========================================

  /**
   * Generate OAuth authorization URL for user consent
   * Redirect user to this URL to start OAuth flow
   */
  public getAuthorizationUrl(redirectUri: string): string {
    if (!this.credentials?.clientId) {
      throw new Error("Client ID not configured");
    }

    const params = new URLSearchParams({
      client_id: this.credentials.clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "item_view item_save sales_invoice_view sales_invoice_save customer_view customer_save",
    });

    return `${ACCURATE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * Call this after user returns from OAuth consent screen
   */
  public async exchangeCodeForToken(
    code: string,
    redirectUri: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.credentials?.clientId || !this.credentials?.clientSecret) {
      return { success: false, error: "Credentials not configured" };
    }

    try {
      const basicAuth = btoa(`${this.credentials.clientId}:${this.credentials.clientSecret}`);

      const response = await fetch(ACCURATE_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error_description || "Token exchange failed" };
      }

      const data = await response.json();

      this.credentials = {
        ...this.credentials,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiresAt: Date.now() + (data.expires_in * 1000),
      };
      this.saveCredentials();

      // Fetch database list after successful auth
      await this.fetchDatabaseList();

      return { success: true };
    } catch (error) {
      console.error("[Accurate] Token exchange error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshAccessToken(): Promise<{ success: boolean; error?: string }> {
    if (!this.credentials?.clientId || !this.credentials?.clientSecret || !this.credentials?.refreshToken) {
      return { success: false, error: "Missing credentials for refresh" };
    }

    try {
      const basicAuth = btoa(`${this.credentials.clientId}:${this.credentials.clientSecret}`);

      const response = await fetch(ACCURATE_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: this.credentials.refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If refresh fails, clear tokens (user needs to re-authenticate)
        if (response.status === 401 || response.status === 400) {
          this.credentials = {
            ...this.credentials,
            accessToken: undefined,
            refreshToken: undefined,
            tokenExpiresAt: undefined,
          };
          this.saveCredentials();
        }
        return { success: false, error: errorData.error_description || "Token refresh failed" };
      }

      const data = await response.json();

      this.credentials = {
        ...this.credentials,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.credentials.refreshToken,
        tokenExpiresAt: Date.now() + (data.expires_in * 1000),
      };
      this.saveCredentials();

      return { success: true };
    } catch (error) {
      console.error("[Accurate] Token refresh error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  }

  /**
   * Ensure we have a valid token (refresh if needed)
   */
  private async ensureValidToken(): Promise<boolean> {
    if (!this.credentials?.accessToken) {
      return false;
    }

    // Check if token expires in the next 5 minutes
    const expiresIn = (this.credentials.tokenExpiresAt || 0) - Date.now();
    if (expiresIn < 5 * 60 * 1000) {
      const refreshResult = await this.refreshAccessToken();
      return refreshResult.success;
    }

    return true;
  }

  // ==========================================
  // Database Management
  // ==========================================

  /**
   * Fetch list of databases user has access to
   */
  public async fetchDatabaseList(): Promise<{ 
    success: boolean; 
    databases?: Array<{ id: string; name: string; hostUrl: string }>; 
    error?: string 
  }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const response = await fetch(ACCURATE_DB_LIST_URL, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.credentials!.accessToken}`,
        },
      });

      if (!response.ok) {
        return { success: false, error: "Failed to fetch database list" };
      }

      const data = await response.json();

      if (data.d && Array.isArray(data.d)) {
        const databases = data.d.map((db: any) => ({
          id: db.id?.toString() || "",
          name: db.alias || db.name || "Unknown",
          hostUrl: db.host || ACCURATE_API_BASE,
        }));
        return { success: true, databases };
      }

      return { success: false, error: "Invalid response format" };
    } catch (error) {
      console.error("[Accurate] Fetch database list error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  }

  /**
   * Set the active database for API calls
   */
  public setActiveDatabase(databaseId: string, hostUrl: string): void {
    if (this.credentials) {
      this.credentials.databaseId = databaseId;
      this.credentials.hostUrl = hostUrl;
      this.saveCredentials();
    }
  }

  // ==========================================
  // Rate Limiting
  // ==========================================

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Clean old requests outside the window
    this.rateLimitState.requests = this.rateLimitState.requests.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    // If at limit, wait until oldest request expires
    if (this.rateLimitState.requests.length >= RATE_LIMIT_REQUESTS) {
      const oldestRequest = this.rateLimitState.requests[0];
      const waitTime = RATE_LIMIT_WINDOW_MS - (now - oldestRequest) + 100; // +100ms buffer
      
      if (waitTime > 0) {
        console.log(`[Accurate] Rate limit reached, waiting ${waitTime}ms`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Record this request
    this.rateLimitState.requests.push(Date.now());
  }

  // ==========================================
  // API Calls
  // ==========================================

  /**
   * Make authenticated API call to Accurate
   */
  private async apiCall<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: "Not authenticated" };
    }

    if (!this.credentials?.databaseId || !this.credentials?.hostUrl) {
      return { success: false, error: "No database selected" };
    }

    await this.waitForRateLimit();

    try {
      const url = `${this.credentials.hostUrl}${endpoint}`;
      
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${this.credentials.accessToken}`,
        "X-Session-ID": this.credentials.databaseId,
      };

      const options: RequestInit = {
        method,
        headers,
      };

      if (body && method === "POST") {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        if (response.status === 401) {
          // Try refreshing token once
          const refreshResult = await this.refreshAccessToken();
          if (refreshResult.success) {
            // Retry the request
            return this.apiCall(endpoint, method, body);
          }
        }
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.d || errorData.message || `HTTP ${response.status}` };
      }

      const data = await response.json();
      
      // Accurate API wraps response in "d" property
      if (data.s === false) {
        return { success: false, error: data.d || "API returned error" };
      }

      return { success: true, data: data.d || data };
    } catch (error) {
      console.error("[Accurate] API call error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  }

  // ==========================================
  // Item/Product APIs
  // ==========================================

  /**
   * Get list of items from Accurate
   */
  public async getItems(page = 1, pageSize = 100): Promise<{
    success: boolean;
    items?: any[];
    totalCount?: number;
    error?: string;
  }> {
    const result = await this.apiCall<any>(`/item/list.do?sp.page=${page}&sp.pageSize=${pageSize}`);
    
    if (result.success && result.data) {
      return {
        success: true,
        items: result.data.data || [],
        totalCount: result.data.totalCount || 0,
      };
    }

    return { success: false, error: result.error };
  }

  /**
   * Create or update item in Accurate
   */
  public async saveItem(item: {
    no?: string;
    name: string;
    unitPrice: number;
    itemCategoryName?: string;
  }): Promise<{ success: boolean; accurateItemId?: number; error?: string }> {
    const payload = {
      no: item.no,
      name: item.name,
      unitPrice: item.unitPrice,
      itemType: "INVENTORY", // or "SERVICE"
      itemCategoryName: item.itemCategoryName || "Umum",
    };

    const result = await this.apiCall<any>("/item/save.do", "POST", payload);

    if (result.success && result.data) {
      return { success: true, accurateItemId: result.data.id };
    }

    return { success: false, error: result.error };
  }

  // ==========================================
  // Sales Invoice APIs
  // ==========================================

  /**
   * Create sales invoice in Accurate from POS transaction
   */
  public async createSalesInvoice(invoice: AccurateSalesInvoice): Promise<{
    success: boolean;
    accurateInvoiceId?: number;
    error?: string;
  }> {
    const payload = {
      transDate: invoice.transDate,
      transactionNo: invoice.transactionNo,
      customerNo: invoice.customerNo || "CASH",
      branchName: invoice.branchName,
      description: invoice.description,
      detailItem: invoice.detailItem.map((item) => ({
        itemNo: item.itemNo,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        detailName: item.itemDescription,
      })),
    };

    const result = await this.apiCall<any>("/sales-invoice/save.do", "POST", payload);

    if (result.success && result.data) {
      return { success: true, accurateInvoiceId: result.data.id };
    }

    return { success: false, error: result.error };
  }

  // ==========================================
  // Sync Queue Management
  // ==========================================

  private loadSyncQueue(): AccurateSyncQueueItem[] {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveSyncQueue(queue: AccurateSyncQueueItem[]): void {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error("[Accurate] Failed to save sync queue:", error);
    }
  }

  /**
   * Add item to sync queue (for offline support)
   */
  public addToSyncQueue(item: Omit<AccurateSyncQueueItem, "id" | "status" | "attempts" | "createdAt">): void {
    const queue = this.loadSyncQueue();
    
    const newItem: AccurateSyncQueueItem = {
      ...item,
      id: Date.now(),
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    };

    queue.push(newItem);
    this.saveSyncQueue(queue);
  }

  /**
   * Get pending items in sync queue
   */
  public getSyncQueueStatus(): { pending: number; failed: number; total: number } {
    const queue = this.loadSyncQueue();
    return {
      pending: queue.filter((q) => q.status === "pending").length,
      failed: queue.filter((q) => q.status === "failed").length,
      total: queue.length,
    };
  }

  /**
   * Process sync queue (call this periodically or on demand)
   */
  public async processSyncQueue(): Promise<{ processed: number; failed: number }> {
    if (this.syncInProgress) {
      return { processed: 0, failed: 0 };
    }

    if (!this.isConnected()) {
      return { processed: 0, failed: 0 };
    }

    this.syncInProgress = true;
    let processed = 0;
    let failed = 0;

    try {
      const queue = this.loadSyncQueue();
      const pendingItems = queue.filter((q) => q.status === "pending" || (q.status === "failed" && q.attempts < 3));

      for (const item of pendingItems) {
        item.status = "processing";
        item.attempts += 1;
        item.lastAttempt = Date.now();

        try {
          let result: { success: boolean; error?: string };

          switch (item.type) {
            case "sales_invoice":
              result = await this.createSalesInvoice(item.payload as AccurateSalesInvoice);
              break;
            case "item":
              result = await this.saveItem(item.payload as any);
              break;
            default:
              result = { success: false, error: "Unknown sync type" };
          }

          if (result.success) {
            item.status = "success";
            processed++;
          } else {
            item.status = "failed";
            item.errorMessage = result.error;
            failed++;
          }
        } catch (error) {
          item.status = "failed";
          item.errorMessage = error instanceof Error ? error.message : "Unknown error";
          failed++;
        }

        // Save progress after each item
        this.saveSyncQueue(queue);

        // Small delay between items to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Clean up successful items older than 24 hours
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const cleanedQueue = queue.filter(
        (q) => q.status !== "success" || q.createdAt > cutoff
      );
      this.saveSyncQueue(cleanedQueue);

    } finally {
      this.syncInProgress = false;
    }

    return { processed, failed };
  }

  // ==========================================
  // Transaction Mapping Helpers
  // ==========================================

  /**
   * Convert Sell More transaction to Accurate sales invoice format
   */
  public mapTransactionToInvoice(
    transaction: Transaction,
    itemMappings: Map<number, string>
  ): AccurateSalesInvoice {
    const transDate = new Date(transaction.timestamp).toISOString().split("T")[0];

    return {
      transactionNo: `POS-${transaction.id}`,
      transDate,
      customerNo: "CASH", // Default cash customer
      description: `POS Sale - ${transaction.cashierName}`,
      detailItem: transaction.items.map((item) => ({
        itemNo: itemMappings.get(item.itemId) || item.sku || `ITEM-${item.itemId}`,
        quantity: item.quantity,
        unitPrice: item.basePrice,
        itemDescription: item.name,
      })),
    };
  }

  /**
   * Convert Sell More item to Accurate item format
   */
  public mapItemToAccurate(item: Item): {
    no: string;
    name: string;
    unitPrice: number;
    itemCategoryName: string;
  } {
    return {
      no: item.sku || `SM-${item.id}`,
      name: item.name,
      unitPrice: item.price,
      itemCategoryName: item.category || "Umum",
    };
  }

  // ==========================================
  // Connection Status
  // ==========================================

  /**
   * Get current connection status
   */
  public async getConnectionStatus(): Promise<AccurateConnectionStatus> {
    if (!this.isConfigured()) {
      return { connected: false, error: "Not configured" };
    }

    if (!this.isConnected()) {
      return { connected: false, error: "Not authenticated" };
    }

    // Try to fetch company info to verify connection
    try {
      const result = await this.apiCall<any>("/company/get-info.do");
      
      if (result.success && result.data) {
        return {
          connected: true,
          companyName: result.data.name,
          databaseName: result.data.databaseName,
          lastSyncTime: new Date().toISOString(),
        };
      }

      return { connected: false, error: result.error };
    } catch {
      return { connected: false, error: "Connection check failed" };
    }
  }

  /**
   * Test connection with current credentials
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    const status = await this.getConnectionStatus();
    
    if (status.connected) {
      return { 
        success: true, 
        message: `Connected to ${status.companyName || "Accurate"}` 
      };
    }

    return { 
      success: false, 
      message: status.error || "Connection failed" 
    };
  }
}

// Export singleton instance
export const accurateService = new AccurateService();