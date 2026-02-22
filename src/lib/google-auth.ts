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
  private tokenClient: any = null;

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
   * Initialize Google Identity Services
   */
  async initialize(): Promise<boolean> {
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
        this.currentUser = savedUser;
        return true;
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize Google Auth:", error);
      return false;
    }
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
   * Sign in with Google (OAuth flow)
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

        // Request access token
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
    if (typeof window !== "undefined") {
      localStorage.removeItem("google_user");
    }
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
   * Load saved user from localStorage
   */
  private loadSavedUser(): GoogleUser | null {
    if (typeof window === "undefined") return null;

    try {
      const saved = localStorage.getItem("google_user");
      if (!saved) return null;

      const user = JSON.parse(saved);
      
      // Check if token is expired (or missing expiry which means it's an old format token)
      // If expired or no expiry date, treat as invalid to prevent 401 errors
      if (!user.expiresAt || Date.now() > user.expiresAt) {
        this.signOut(); // Clean up invalid session
        return null;
      }

      return user;
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

      return new Promise((resolve) => {
        this.tokenClient.callback = async (response: any) => {
          if (response.error) {
            // If refresh fails, sign out to force re-authentication
            this.signOut();
            resolve({ success: false, error: response.error });
            return;
          }

          const accessToken = response.access_token;

          // Get user info to verify token
          const userInfo = await this.fetchUserInfo(accessToken);
          if (!userInfo) {
            this.signOut();
            resolve({ success: false, error: "Failed to verify refreshed token" });
            return;
          }

          // Update current user with new token
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

        // Request new token without prompt (silent refresh)
        this.tokenClient.requestAccessToken({ prompt: "" });
      });
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
   * Automatically refreshes if needed
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
        return { success: false, error: "Session expired. Please sign in again." };
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
        return { success: false, error: "Session expired. Please sign in again." };
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
          this.signOut();
          return { success: false, error: "Session expired. Please sign in again." };
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
        return { success: false, error: "Session expired. Please sign in again." };
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
        return { success: false, error: "Session expired. Please sign in again." };
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
        return { success: false, error: "Session expired. Please sign in again." };
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
        return { success: false, error: "Session expired. Please sign in again." };
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