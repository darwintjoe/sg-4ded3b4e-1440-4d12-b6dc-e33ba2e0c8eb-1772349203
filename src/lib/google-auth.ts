/**
 * Google API Service
 * Handles Google Drive and Calendar API calls
 * Authentication is managed by NextAuth - this service only uses the access token
 */

interface BackupMetadata {
  id: string;
  name: string;
  createdTime: string;
  size: number;
}

class GoogleAuthService {
  private accessToken: string | null = null;

  /**
   * Set access token from NextAuth session
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Clear access token (on sign out)
   */
  clearAccessToken(): void {
    this.accessToken = null;
  }

  /**
   * Check if we have an access token
   */
  hasAccessToken(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Get the current access token
   */
  private getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Upload backup to Google Drive
   */
  async uploadBackup(data: Blob, filename: string, folderPath?: string): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      const token = this.getAccessToken();
      if (!token) {
        return { success: false, error: "Not signed in" };
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
            Authorization: `Bearer ${token}`,
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
      const token = this.getAccessToken();
      if (!token) {
        return { success: false, error: "Not signed in" };
      }

      const parts = folderPath.split("/").filter(p => p);
      let currentParentId = "root";
      
      for (const part of parts) {
        // Check if folder exists
        const query = `name='${part}' and mimeType='application/vnd.google-apps.folder' and '${currentParentId}' in parents and trashed=false`;
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
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
                Authorization: `Bearer ${token}`,
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
      const token = this.getAccessToken();
      if (!token) {
        return { success: false, error: "Not signed in" };
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
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
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
  async downloadBackup(fileId: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const token = this.getAccessToken();
      if (!token) {
        return { success: false, error: "Not signed in" };
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
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
            new (window as unknown as { DecompressionStream: new (format: string) => TransformStream }).DecompressionStream("gzip")
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
      const token = this.getAccessToken();
      if (!token) {
        return { success: false, error: "Not signed in" };
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
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
      const token = this.getAccessToken();
      if (!token) {
        return { success: false, error: "Not signed in" };
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
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
      const token = this.getAccessToken();
      if (!token) {
        return { success: false, error: "Not signed in" };
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
            Authorization: `Bearer ${token}`,
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