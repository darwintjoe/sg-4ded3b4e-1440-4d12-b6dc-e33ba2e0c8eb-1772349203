/**
 * Google Sheets Transaction Export Service
 * Exports transactions to Google Sheets for business analysis
 * 
 * Philosophy:
 * - Analysis only, NOT for restore/backup
 * - Non-blocking, async export on shift close
 * - Silent failure (no internet = drop silently)
 * - Per-year sheets with monthly tabs
 */

import { googleAuth } from "./google-auth";
import type { ShiftTransactions, Shift, Transaction, TransactionRow } from "@/types";

interface SheetInfo {
  id: string;
  name: string;
  year: number;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export class SheetsExportService {
  private readonly FOLDER_NAME = "SellMore-Reports";

  /**
   * Export shift transactions to Google Sheets
   * Called on shift close (cashier logout)
   * Non-blocking, silent on failure
   */
  async exportShiftTransactions(
    shiftData: ShiftTransactions,
    shift: Shift,
    businessName: string,
    businessId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if signed in
      if (!googleAuth.isSignedIn()) {
        return { success: false, error: "Not signed in" };
      }

      const shiftEndTime = shiftData.shiftEnd;
      const year = new Date(shiftEndTime).getFullYear();
      const month = new Date(shiftEndTime).getMonth(); // 0-11
      const sheetName = `Sell More - ${businessName} ${year}`;

      // Get or create sheet for this year
      const sheet = await this.findOrCreateSheet(sheetName, businessId);

      if (!sheet) {
        return { success: false, error: "Failed to create/access sheet" };
      }

      // Get or create monthly tab
      const tabName = MONTH_NAMES[month];
      const tabId = await this.ensureTabExists(sheet.id, tabName, month);

      if (!tabId) {
        return { success: false, error: "Failed to create tab" };
      }

      // Convert transactions to rows
      const transactionRows = this.convertTransactionsToRows(shiftData.transactions);

      // Append transactions
      await this.appendTransactions(sheet.id, tabId, transactionRows);

      return { success: true };
    } catch (error) {
      // Silent failure - don't block cashier logout
      console.warn("Sheets export failed (silent):", error);
      return { success: false, error: error instanceof Error ? error.message : "Export failed" };
    }
  }

  /**
   * Convert Transaction[] to TransactionRow[] for sheet export
   */
  private convertTransactionsToRows(transactions: Transaction[]): TransactionRow[] {
    return transactions.map((tx, index) => {
      // Build description from items
      const description = tx.items
        .map(item => `${item.quantity}x ${item.name}`)
        .join(", ");

      // Calculate payment amounts by method
      let cashAmount = 0;
      let qrisAmount = 0;
      let transferAmount = 0;
      let primaryMethod = "cash";

      tx.payments.forEach(payment => {
        if (payment.method === "cash") {
          cashAmount += payment.amount;
          primaryMethod = "cash";
        } else if (payment.method === "qris-static" || payment.method === "qris-dynamic") {
          qrisAmount += payment.amount;
          primaryMethod = "qris";
        } else if (payment.method === "transfer") {
          transferAmount += payment.amount;
          primaryMethod = "transfer";
        }
      });

      return {
        receiptNumber: `${tx.shiftId}-${index + 1}`,
        timestamp: new Date(tx.timestamp).toISOString(),
        description,
        tax1: tx.tax1 || 0,
        tax2: tx.tax2 || 0,
        total: tx.total,
        paymentMethod: primaryMethod,
        cashAmount,
        qrisAmount,
        transferAmount
      };
    });
  }

  /**
   * Find existing sheet or create new one
   */
  private async findOrCreateSheet(sheetName: string, businessId?: string): Promise<SheetInfo | null> {
    try {
      const accessToken = googleAuth.getCurrentUser()?.accessToken;
      if (!accessToken) return null;

      // Search for existing sheet
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `name='${sheetName}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
        )}&fields=files(id,name)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!searchResponse.ok) return null;

      const searchResult = await searchResponse.json();

      if (searchResult.files && searchResult.files.length > 0) {
        // Sheet exists
        return {
          id: searchResult.files[0].id,
          name: searchResult.files[0].name,
          year: parseInt(sheetName.match(/\d{4}/)?.[0] || new Date().getFullYear().toString()),
        };
      }

      // Create new sheet
      const createResponse = await fetch(
        "https://www.googleapis.com/drive/v3/files",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: sheetName,
            mimeType: "application/vnd.google-apps.spreadsheet",
            parents: ["root"],
          }),
        }
      );

      if (!createResponse.ok) return null;

      const newFile = await createResponse.json();

      // Initialize with all monthly tabs
      await this.initializeMonthlyTabs(newFile.id);

      return {
        id: newFile.id,
        name: sheetName,
        year: parseInt(sheetName.match(/\d{4}/)?.[0] || new Date().getFullYear().toString()),
      };
    } catch (error) {
      console.error("Failed to find/create sheet:", error);
      return null;
    }
  }

  /**
   * Initialize sheet with all 12 monthly tabs
   */
  private async initializeMonthlyTabs(spreadsheetId: string): Promise<boolean> {
    try {
      const accessToken = googleAuth.getCurrentUser()?.accessToken;
      if (!accessToken) return false;

      // Get current sheets
      const getResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!getResponse.ok) return false;

      const spreadsheet = await getResponse.json();
      const existingSheets = spreadsheet.sheets || [];
      const existingTitles = existingSheets.map((s: any) => s.properties.title);

      // Add missing monthly tabs (keep default Sheet1 as Januari)
      const requests = [];

      // Rename Sheet1 to Januari if it exists and Januari doesn't
      if (existingTitles.includes("Sheet1") && !existingTitles.includes("Januari")) {
        requests.push({
          updateSheetProperties: {
            properties: {
              sheetId: existingSheets.find((s: any) => s.properties.title === "Sheet1")?.properties?.sheetId || 0,
              title: "Januari",
            },
            fields: "title",
          },
        });
      }

      // Add remaining months
      for (let i = 0; i < 12; i++) {
        const monthName = MONTH_NAMES[i];
        if (!existingTitles.includes(monthName)) {
          requests.push({
            addSheet: {
              properties: {
                title: monthName,
              },
            },
          });
        }
      }

      if (requests.length === 0) return true;

      // Execute batch update
      const batchResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ requests }),
        }
      );

      return batchResponse.ok;
    } catch (error) {
      console.error("Failed to initialize tabs:", error);
      return false;
    }
  }

  /**
   * Ensure monthly tab exists with proper header
   */
  private async ensureTabExists(spreadsheetId: string, tabName: string, monthIndex: number): Promise<number | null> {
    try {
      const accessToken = googleAuth.getCurrentUser()?.accessToken;
      if (!accessToken) return null;

      // Get sheet info
      const getResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!getResponse.ok) return null;

      const spreadsheet = await getResponse.json();
      const sheet = spreadsheet.sheets?.find((s: any) => s.properties.title === tabName);

      if (!sheet) {
        // Create tab if missing
        const addResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: tabName,
                    },
                  },
                },
              ],
            }),
          }
        );

        if (!addResponse.ok) return null;

        const addResult = await addResponse.json();
        const newSheetId = addResult.replies?.[0]?.addSheet?.properties?.sheetId;

        // Add header row
        await this.addHeaderRow(spreadsheetId, newSheetId, tabName);
        return newSheetId;
      }

      const sheetId = sheet.properties.sheetId;

      // Check if header exists
      const headerResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${tabName}!A1:I1`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (headerResponse.ok) {
        const headerData = await headerResponse.json();
        if (!headerData.values || headerData.values.length === 0) {
          await this.addHeaderRow(spreadsheetId, sheetId, tabName);
        }
      }

      return sheetId;
    } catch (error) {
      console.error("Failed to ensure tab exists:", error);
      return null;
    }
  }

  /**
   * Add header row with SUM formulas
   */
  private async addHeaderRow(spreadsheetId: string, sheetId: number, tabName: string): Promise<boolean> {
    try {
      const accessToken = googleAuth.getCurrentUser()?.accessToken;
      if (!accessToken) return false;

      // Header labels row 2
      const headers = [
        "No", "Waktu", "Deskripsi", "Tax1", "Tax2", "Total",
        "Tunai", "QRIS", "Transfer"
      ];

      // Update row 2 with headers
      const headerResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${tabName}!A2:I2?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: [headers],
          }),
        }
      );

      if (!headerResponse.ok) return false;

      // Add SUM formulas to row 1 (D1:I1)
      const formulas = [
        "", "", "", // A, B, C empty
        "=SUM(D3:D)",    // D: Tax1 sum
        "=SUM(E3:E)",    // E: Tax2 sum
        "=SUM(F3:F)",    // F: Total sum
        "=SUM(G3:G)",    // G: Tunai sum
        "=SUM(H3:H)",    // H: QRIS sum
        "=SUM(I3:I)",    // I: Transfer sum
      ];

      const formulaResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${tabName}!A1:I1?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: [formulas],
          }),
        }
      );

      // Format row 1 as bold and gray background
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: 0,
                    endRowIndex: 1,
                  },
                  cell: {
                    userEnteredFormat: {
                      textFormat: { bold: true },
                      backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    },
                  },
                  fields: "userEnteredFormat(textFormat,backgroundColor)",
                },
              },
              {
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: 1,
                    endRowIndex: 2,
                  },
                  cell: {
                    userEnteredFormat: {
                      textFormat: { bold: true },
                      backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
                    },
                  },
                  fields: "userEnteredFormat(textFormat,backgroundColor)",
                },
              },
            ],
          }),
        }
      );

      return formulaResponse.ok;
    } catch (error) {
      console.error("Failed to add header row:", error);
      return false;
    }
  }

  /**
   * Append transactions to sheet
   */
  private async appendTransactions(
    spreadsheetId: string,
    sheetId: number,
    transactions: TransactionRow[]
  ): Promise<boolean> {
    try {
      const accessToken = googleAuth.getCurrentUser()?.accessToken;
      if (!accessToken || transactions.length === 0) return false;

      // Find next empty row
      const findResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${MONTH_NAMES[new Date().getMonth()]}!A:A`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      let startRow = 3; // Start after headers

      if (findResponse.ok) {
        const findData = await findResponse.json();
        if (findData.values) {
          startRow = findData.values.length + 1;
        }
      }

      // Format transaction rows
      const rows = transactions.map((tx, index) => [
        startRow - 2 + index, // Auto-increment number
        this.formatTime(tx.timestamp),
        tx.description.substring(0, 100), // Limit description length
        tx.tax1,
        tx.tax2,
        tx.total,
        tx.cashAmount,
        tx.qrisAmount,
        tx.transferAmount,
      ]);

      // Append rows
      const appendResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${MONTH_NAMES[new Date().getMonth()]}!A${startRow}:I${startRow + rows.length - 1}?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: rows,
          }),
        }
      );

      return appendResponse.ok;
    } catch (error) {
      console.error("Failed to append transactions:", error);
      return false;
    }
  }

  /**
   * Format timestamp for display
   */
  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month} ${hours}:${minutes}`;
  }
}

// Export singleton
export const sheetsExport = new SheetsExportService();