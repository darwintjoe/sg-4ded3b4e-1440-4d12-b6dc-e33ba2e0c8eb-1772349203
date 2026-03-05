/**
 * Google Authentication & API Integration
 * FREE - Uses user's personal Google account (15GB free storage)
 * No paid services, no backend needed
 */

interface GoogleAuthConfig {
  clientId: string;
  scopes: string[];
}

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Timestamp when token expires
}

interface BackupMetadata {
  id: string;
  name: string;
  createdTime: string;
  size: number;
}

class GoogleAuthService {
  private config: GoogleAuthConfig;
  private currentUser: GoogleUser | null = null;
  private accessToken: string | null = null;
  private tokenClient: any = null;
  private initializationPromise: Promise<boolean> | null = null;

  constructor() {
    this.config = {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      scopes: [
        "https://www.googleapis.com/auth/drive.file", // Create files in Drive
        "https://www.googleapis.com/auth/calendar.events", // Create calendar events
        "https://www.googleapis.com/auth/userinfo.profile", // Get user info
        "https://www.googleapis.com/auth/userinfo.email", // Get email
      ],
    };
  }

  /**
   * Set access token from NextAuth session
   * This allows the service to make Google API calls using NextAuth's token
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Clear access token (on sign out)
   */
  clearAccessToken(): void {
    this.accessToken = null;
    this.currentUser = null;
  }

  /**
   * Get the current access token (from NextAuth or legacy flow)
   */
  private getAccessToken(): string | null {
    return this.accessToken || this.currentUser?.accessToken || null;
  }

  /**
   * Initialize Google Identity Services
   * If user was previously connected, attempts silent re-authentication
   */
  async initialize(): Promise<boolean> {
    // Prevent multiple simultaneous initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  private async _doInitialize(): Promise<boolean> {
    try {
      if (typeof window === "undefined") return false;

      // Load Google Identity Services library
      await this.loadGoogleScript();

      // Initialize token client for OAuth
      this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: this.config.clientId,
        scope: this.config.scopes.join(" "),
        callback: "", // Will be set during signIn
      });

      // Check if user was previously signed in
      const savedUser = this.loadSavedUser();
      if (savedUser) {
        // Check if token is still valid
        if (savedUser.expiresAt && Date.now() < savedUser.expiresAt) {
          // Token still valid, use it
          this.currentUser = savedUser;
          console.log("Google Auth: Restored valid session for", savedUser.email);
          return true;
        }
        
        // Token expired - attempt silent re-authentication
        console.log("Google Auth: Token expired, attempting silent re-auth for", savedUser.email);
        const silentResult = await this.attemptSilentReauth(savedUser.email);
        
        if (silentResult.success) {
          console.log("Google Auth: Silent re-auth successful");
          return true;
        } else {
          console.log("Google Auth: Silent re-auth failed, user will need to reconnect manually");
          // Clear the expired session
          this.clearSavedUser();
          return true; // Initialization succeeded, just not connected
        }
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize Google Auth:", error);
      return false;
    }
  }

  /**
   * Attempt silent re-authentication without user interaction
   * Uses Google's session to get a new token if user is still logged into Google
   */
  private async attemptSilentReauth(previousEmail?: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      // Set a timeout for silent auth (5 seconds)
      const timeout = setTimeout(() => {
        console.log("Google Auth: Silent re-auth timed out");
        resolve({ success: false, error: "Silent auth timed out" });
      }, 5000);

      this.tokenClient.callback = async (response: any) => {
        clearTimeout(timeout);

        if (response.error) {
          // Silent auth failed - this is expected if user logged out of Google
          console.log("Google Auth: Silent re-auth returned error:", response.error);
          resolve({ success: false, error: response.error });
          return;
        }

        const accessToken = response.access_token;

        // Get user info to verify token
        const userInfo = await this.fetchUserInfo(accessToken);
        if (!userInfo) {
          resolve({ success: false, error: "Failed to verify token" });
          return;
        }

        // If we had a previous email, verify it's the same account
        if (previousEmail && userInfo.email !== previousEmail) {
          console.log("Google Auth: Different account detected, clearing previous session");
          // Different account - let user know they need to reconnect with correct account
          resolve({ success: false, error: "Different Google account" });
          return;
        }

        // Success! Update current user with new token
        this.currentUser = {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          accessToken: accessToken,
          expiresAt: Date.now() + (3500 * 1000), // 58 minutes
        };

        // Save updated token
        this.saveUser(this.currentUser);

        resolve({ success: true });
      };

      // Request new token WITHOUT prompt (silent)
      // This only works if user is logged into Google and previously consented
      try {
        this.tokenClient.requestAccessToken({ prompt: "" });
      } catch (error) {
        clearTimeout(timeout);
        console.error("Google Auth: Silent re-auth request failed:", error);
        resolve({ success: false, error: "Request failed" });
      }
    });
  }

  /**
   * Load Google Identity Services script
   */
  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google?.accounts) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google script"));
      document.head.appendChild(script);
    });
  }

  /**
   * Sign in with Google (OAuth flow with user interaction)
   */
  async signIn(): Promise<{ success: boolean; user?: GoogleUser; error?: string }> {
    try {
      if (!this.tokenClient) {
        await this.initialize();
      }

      return new Promise((resolve) => {
        this.tokenClient.callback = async (response: any) => {
          if (response.error) {
            console.error("Google OAuth error:", response.error);
            resolve({ success: false, error: response.error });
            return;
          }

          const accessToken = response.access_token;
          console.log("Google OAuth: Access token received");

          // Get user info
          const userInfo = await this.fetchUserInfo(accessToken);
          if (!userInfo) {
            console.error("Google OAuth: Failed to get user info");
            resolve({ success: false, error: "Failed to get user info" });
            return;
          }

          console.log("Google OAuth: User info received", userInfo.email);

          this.currentUser = {
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            accessToken: accessToken,
            expiresAt: Date.now() + (3500 * 1000), // Set expiry to 58 minutes (safety margin)
          };

          // Save to localStorage
          this.saveUser(this.currentUser);
          console.log("Google OAuth: User saved, sign-in complete");

          resolve({ success: true, user: this.currentUser });
        };

        // Request access token with consent prompt
        console.log("Google OAuth: Requesting access token...");
        this.tokenClient.requestAccessToken({ prompt: "consent" });
      });
    } catch (error) {
      console.error("Sign in failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "Sign in failed" };
    }
  }

  /**
   * Fetch user profile info
   */
  private async fetchUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch user info:", error);
      return null;
    }
  }

  /**
   * Sign out
   */
  signOut(): void {
    this.currentUser = null;
    this.clearSavedUser();
  }

  /**
   * Get current user
   */
  getCurrentUser(): GoogleUser | null {
    return this.currentUser;
  }

  /**
   * Check if user is signed in
   */
  isSignedIn(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Save user to localStorage
   */
  private saveUser(user: GoogleUser): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("google_user", JSON.stringify(user));
    }
  }

  /**
   * Clear saved user from localStorage
   */
  private clearSavedUser(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("google_user");
    }
  }

  /**
   * Load saved user from localStorage (without expiry check - handled by caller)
   */
  private loadSavedUser(): GoogleUser | null {
    if (typeof window === "undefined") return null;

    try {
      const saved = localStorage.getItem("google_user");
      if (!saved) return null;
      return JSON.parse(saved);
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh access token using Google Identity Services
   * Called automatically when token is near expiry or expired
   */
  async refreshAccessToken(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.tokenClient) {
        await this.initialize();
      }

      // First try silent refresh
      const silentResult = await this.attemptSilentReauth(this.currentUser?.email);
      
      if (silentResult.success) {
        return { success: true };
      }

      // Silent refresh failed - user needs to reconnect manually
      this.signOut();
      return { success: false, error: "Session expired. Please reconnect to Google." };
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.signOut();
      return { success: false, error: error instanceof Error ? error.message : "Refresh failed" };
    }
  }

  /**
   * Check if token needs refresh (within 5 minutes of expiry)
   */
  isTokenExpiringSoon(): boolean {
    if (!this.currentUser?.expiresAt) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() > (this.currentUser.expiresAt - fiveMinutes);
  }

  /**
   * Ensure valid token before API calls
   * Automatically refreshes if needed (silently if possible)
   */
  async ensureValidToken(): Promise<boolean> {
    if (!this.currentUser) return false;
    
    if (this.isTokenExpiringSoon()) {
      const result = await this.refreshAccessToken();
      return result.success;
    }
    
    return true;
  }

  /**
   * Upload backup to Google Drive
   */
  async uploadBackup(data: Blob, filename: string, folderPath?: string): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      if (!this.currentUser) {
        return { success: false, error: "Not signed in" };
      }

      // Ensure token is valid before upload
      const tokenValid = await this.ensureValidToken();
      if (!tokenValid) {
        return { success: false, error: "Session expired. Please reconnect to Google." };
      }

      // Get or create folder from path
      let parentId = "root";
      if (folderPath) {
        const folderResult = await this.getOrCreateFolder(folderPath);
        if (!folderResult.success) {
          return { success: false, error: folderResult.error };
        }
        parentId = folderResult.folderId!;
      }

      // Create file metadata
      const metadata = {
        name: filename,
        mimeType: "application/gzip",
        parents: [parentId],
      };

      // Upload to Drive
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", data);

      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.currentUser.accessToken}`,
          },
          body: form,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Upload failed: ${error}` };
      }

      const result = await response.json();
      return { success: true, fileId: result.id };
    } catch (error) {
      console.error("Backup upload failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "Upload failed" };
    }
  }

  /**
   * Get or create folder path in Google Drive
   */
  private async getOrCreateFolder(folderPath: string): Promise<{ success: boolean; folderId?: string; error?: string }> {
    try {
      const parts = folderPath.split("/").filter(p => p);
      let currentParentId = "root";
      
      for (const part of parts) {
        // Check if folder exists
        const query = `name='${part}' and mimeType='application/vnd.google-apps.folder' and '${currentParentId}' in parents and trashed=false`;
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
          {
            headers: {
              Authorization: `Bearer ${this.currentUser!.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          return { success: false, error: "Failed to check folder" };
        }

        const result = await response.json();
        
        if (result.files && result.files.length > 0) {
          // Folder exists
          currentParentId = result.files[0].id;
        } else {
          // Create folder
          const createResponse = await fetch(
            "https://www.googleapis.com/drive/v3/files",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${this.currentUser!.accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: part,
                mimeType: "application/vnd.google-apps.folder",
                parents: [currentParentId],
              }),
            }
          );

          if (!createResponse.ok) {
            return { success: false, error: "Failed to create folder" };
          }

          const createResult = await createResponse.json();
          currentParentId = createResult.id;
        }
      }

      return { success: true, folderId: currentParentId };
    } catch (error) {
      console.error("Folder creation failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "Folder operation failed" };
    }
  }

  /**
   * List backups from Google Drive
   */
  async listBackups(folderPath?: string): Promise<{ success: boolean; backups?: BackupMetadata[]; error?: string }> {
    try {
      if (!this.currentUser) {
        return { success: false, error: "Not signed in" };
      }

      // Ensure token is valid before listing
      const tokenValid = await this.ensureValidToken();
      if (!tokenValid) {
        return { success: false, error: "Session expired. Please reconnect to Google." };
      }

      let parentQuery = "'root' in parents";
      
      if (folderPath) {
        const folderResult = await this.getOrCreateFolder(folderPath);
        if (!folderResult.success) {
          // If folder doesn't exist, return empty list (no backups yet)
          return { success: true, backups: [] };
        }
        parentQuery = `'${folderResult.folderId}' in parents`;
      }

      const query = `name contains 'backup_' and ${parentQuery} and (mimeType='application/gzip' or mimeType='application/json') and trashed=false`;
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc`,
        {
          headers: {
            Authorization: `Bearer ${this.currentUser.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        // Handle token expiration/revocation
        if (response.status === 401) {
          // Try silent re-auth
          const reauth = await this.attemptSilentReauth(this.currentUser.email);
          if (reauth.success) {
            // Retry the request
            return this.listBackups(folderPath);
          }
          this.signOut();
          return { success: false, error: "Session expired. Please reconnect to Google." };
        }
        return { success: false, error: "Failed to list backups" };
      }

      const result = await response.json();
      return { success: true, backups: result.files || [] };
    } catch (error) {
      console.error("Failed to list backups:", error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to list backups" };
    }
  }

  /**
   * Download backup from Google Drive
   */
  async downloadBackup(fileId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!this.currentUser) {
        return { success: false, error: "Not signed in" };
      }

      // Ensure token is valid before download
      const tokenValid = await this.ensureValidToken();
      if (!tokenValid) {
        return { success: false, error: "Session expired. Please reconnect to Google." };
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${this.currentUser.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return { success: false, error: "Failed to download backup" };
      }

      const blob = await response.blob();
      
      // Try to decompress if gzip
      let jsonString: string;
      if (blob.type === "application/gzip" || blob.type === "application/x-gzip") {
        // Use DecompressionStream if available
        if ("DecompressionStream" in window) {
          const stream = blob.stream();
          const decompressedStream = stream.pipeThrough(
            new (window as any).DecompressionStream("gzip")
          );
          jsonString = await new Response(decompressedStream).text();
        } else {
          // Fallback: Try reading as text
          jsonString = await blob.text();
        }
      } else {
        jsonString = await blob.text();
      }

      const data = JSON.parse(jsonString);
      return { success: true, data };
    } catch (error) {
      console.error("Failed to download backup:", error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to download backup" };
    }
  }

  /**
   * Rename a backup file in Google Drive
   */
  async renameBackup(fileId: string, newName: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.currentUser) {
        return { success: false, error: "Not signed in" };
      }

      // Ensure token is valid before rename
      const tokenValid = await this.ensureValidToken();
      if (!tokenValid) {
        return { success: false, error: "Session expired. Please reconnect to Google." };
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${this.currentUser.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newName
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to rename file: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to rename backup:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Rename failed" 
      };
    }
  }

  /**
   * Delete a backup file from Google Drive
   */
  async deleteBackup(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.currentUser) {
        return { success: false, error: "Not signed in" };
      }

      // Ensure token is valid before delete
      const tokenValid = await this.ensureValidToken();
      if (!tokenValid) {
        return { success: false, error: "Session expired. Please reconnect to Google." };
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.currentUser.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to delete backup:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Delete failed" 
      };
    }
  }

  /**
   * Create calendar event for shift report
   */
  async createCalendarEvent(event: {
    summary: string;
    description: string;
    start: string;
    end: string;
  }): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      if (!this.currentUser) {
        return { success: false, error: "Not signed in" };
      }

      // Ensure token is valid before creating event
      const tokenValid = await this.ensureValidToken();
      if (!tokenValid) {
        return { success: false, error: "Session expired. Please reconnect to Google." };
      }

      const calendarEvent = {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.start,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: event.end,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.currentUser.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(calendarEvent),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Failed to create event: ${error}` };
      }

      const result = await response.json();
      return { success: true, eventId: result.id };
    } catch (error) {
      console.error("Failed to create calendar event:", error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to create event" };
    }
  }
}

// Export singleton instance
export const googleAuth = new GoogleAuthService();