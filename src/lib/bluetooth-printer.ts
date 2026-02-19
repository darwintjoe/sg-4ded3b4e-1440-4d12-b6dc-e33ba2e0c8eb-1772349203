/**
 * Bluetooth Thermal Printer Service
 * ESC/POS command generation and Web Bluetooth API wrapper
 * Android Chrome PWA only
 */

import { Settings, Transaction, CartItem } from "@/types";

// ESC/POS Commands
const ESC = 0x1b;
const GS = 0x1d;

class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private connected = false;

  // Standard ESC/POS service UUID (most thermal printers)
  private readonly SERVICE_UUID = "000018f0-0000-1000-8000-00805f9b34fb";
  private readonly CHARACTERISTIC_UUID = "00002af1-0000-1000-8000-00805f9b34fb";

  /**
   * Check if Web Bluetooth API is available
   */
  isSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  /**
   * Check if currently connected to a printer
   */
  isConnected(): boolean {
    return this.connected && this.device !== null && this.device.gatt?.connected === true;
  }

  /**
   * Get connected printer name
   */
  getPrinterName(): string | null {
    return this.device?.name || null;
  }

  /**
   * Get connected printer ID
   */
  getPrinterId(): string | null {
    return this.device?.id || null;
  }

  /**
   * Connect to a Bluetooth thermal printer
   */
  async connect(): Promise<{ success: boolean; printerName?: string; printerId?: string; error?: string }> {
    try {
      if (!this.isSupported()) {
        return {
          success: false,
          error: "Web Bluetooth API not supported. Please use Android Chrome browser.",
        };
      }

      // Request device
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [this.SERVICE_UUID] },
          { namePrefix: "Print" },
          { namePrefix: "Thermal" },
          { namePrefix: "BlueTooth" },
          { namePrefix: "BT-" },
          { namePrefix: "RPP" },
          { namePrefix: "MTP" },
        ],
        optionalServices: [this.SERVICE_UUID],
      });

      if (!this.device) {
        return { success: false, error: "No device selected" };
      }

      // Connect to GATT server
      const server = await this.device.gatt?.connect();
      if (!server) {
        return { success: false, error: "Failed to connect to GATT server" };
      }

      // Get service
      const service = await server.getPrimaryService(this.SERVICE_UUID);

      // Get characteristic
      this.characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID);

      this.connected = true;

      // Handle disconnection
      this.device.addEventListener("gattserverdisconnected", () => {
        this.connected = false;
        console.log("Printer disconnected");
      });

      return {
        success: true,
        printerName: this.device.name || "Unknown Printer",
        printerId: this.device.id,
      };
    } catch (error) {
      this.connected = false;
      console.error("Bluetooth connection error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to connect to printer",
      };
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    this.connected = false;
  }

  /**
   * Send raw bytes to printer
   */
  private async sendBytes(data: Uint8Array): Promise<void> {
    if (!this.characteristic) {
      throw new Error("Printer not connected");
    }

    // Split large data into chunks (max 512 bytes per write for most printers)
    const chunkSize = 512;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.characteristic.writeValue(chunk);
      // Small delay between chunks
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /**
   * ESC/POS: Initialize printer
   */
  private cmdInit(): Uint8Array {
    return new Uint8Array([ESC, 0x40]); // ESC @
  }

  /**
   * ESC/POS: Set text alignment
   */
  private cmdAlign(align: "left" | "center" | "right"): Uint8Array {
    const alignCode = align === "left" ? 0 : align === "center" ? 1 : 2;
    return new Uint8Array([ESC, 0x61, alignCode]); // ESC a n
  }

  /**
   * ESC/POS: Set text size
   */
  private cmdTextSize(width: number, height: number): Uint8Array {
    const size = ((width - 1) << 4) | (height - 1);
    return new Uint8Array([GS, 0x21, size]); // GS ! n
  }

  /**
   * ESC/POS: Set bold
   */
  private cmdBold(enable: boolean): Uint8Array {
    return new Uint8Array([ESC, 0x45, enable ? 1 : 0]); // ESC E n
  }

  /**
   * ESC/POS: Line feed
   */
  private cmdLineFeed(lines = 1): Uint8Array {
    return new Uint8Array(Array(lines).fill(0x0a));
  }

  /**
   * ESC/POS: Cut paper
   */
  private cmdCut(): Uint8Array {
    return new Uint8Array([GS, 0x56, 0x41, 0x00]); // GS V A 0 (full cut)
  }

  /**
   * Convert string to bytes (with encoding)
   */
  private encodeText(text: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(text);
  }

  /**
   * Format currency without symbol (e.g., "100.000")
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(amount);
  }

  /**
   * Pad text for receipt line (58mm = ~32 chars, 80mm = ~42 chars)
   */
  private padLine(left: string, right: string, width: number): string {
    const totalLength = left.length + right.length;
    const spacesNeeded = Math.max(0, width - totalLength);
    return left + " ".repeat(spacesNeeded) + right;
  }

  /**
   * Generate separator line
   */
  private separatorLine(width: number): string {
    return "─".repeat(width);
  }

  /**
   * Convert logo image to ESC/POS bitmap for thermal printer
   */
  private async imageToBitmap(base64Image: string): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Create canvas
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          // Set canvas size to image size
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image
          ctx.drawImage(img, 0, 0);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Convert to monochrome bitmap
          const width = canvas.width;
          const height = canvas.height;
          const bytesPerLine = Math.ceil(width / 8);
          
          // ESC/POS bitmap command: ESC * m nL nH d1...dk
          // m=33 (24-dot double-density)
          const commands: number[] = [];
          
          // Process image in 24-pixel vertical strips
          for (let y = 0; y < height; y += 24) {
            // ESC * 33 nL nH
            commands.push(ESC, 0x2a, 0x21);
            commands.push(width & 0xff); // nL
            commands.push((width >> 8) & 0xff); // nH
            
            // Process each column
            for (let x = 0; x < width; x++) {
              // 24 dots = 3 bytes
              let byte1 = 0, byte2 = 0, byte3 = 0;
              
              for (let bit = 0; bit < 8; bit++) {
                const py = y + bit;
                if (py < height) {
                  const idx = (py * width + x) * 4;
                  const gray = data[idx]; // R channel (already grayscale)
                  if (gray < 128) byte1 |= (1 << (7 - bit));
                }
              }
              
              for (let bit = 0; bit < 8; bit++) {
                const py = y + 8 + bit;
                if (py < height) {
                  const idx = (py * width + x) * 4;
                  const gray = data[idx];
                  if (gray < 128) byte2 |= (1 << (7 - bit));
                }
              }
              
              for (let bit = 0; bit < 8; bit++) {
                const py = y + 16 + bit;
                if (py < height) {
                  const idx = (py * width + x) * 4;
                  const gray = data[idx];
                  if (gray < 128) byte3 |= (1 << (7 - bit));
                }
              }
              
              commands.push(byte1, byte2, byte3);
            }
            
            // Line feed after each strip
            commands.push(0x0a);
          }
          
          resolve(new Uint8Array(commands));
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error("Failed to load logo image"));
      };
      
      img.src = base64Image;
    });
  }

  /**
   * Print a test receipt
   */
  async printTest(settings: Settings): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConnected()) {
        return { success: false, error: "Printer not connected" };
      }

      const width = settings.printerWidth === 58 ? 32 : 42;
      const commands: Uint8Array[] = [];

      // Initialize
      commands.push(this.cmdInit());

      // Business name (centered, bold, large)
      commands.push(this.cmdAlign("center"));
      commands.push(this.cmdBold(true));
      commands.push(this.cmdTextSize(2, 2));
      commands.push(this.encodeText(settings.businessName || "My Store"));
      commands.push(this.cmdLineFeed(1));

      // Reset size
      commands.push(this.cmdTextSize(1, 1));
      commands.push(this.cmdBold(false));

      // Test message
      commands.push(this.cmdLineFeed(1));
      commands.push(this.encodeText("TEST PRINT"));
      commands.push(this.cmdLineFeed(1));
      commands.push(this.cmdAlign("left"));
      commands.push(this.encodeText(`Printer Width: ${settings.printerWidth}mm`));
      commands.push(this.cmdLineFeed(1));
      commands.push(this.encodeText(`Date: ${new Date().toLocaleString()}`));
      commands.push(this.cmdLineFeed(1));

      // Separator
      commands.push(this.cmdAlign("center"));
      commands.push(this.encodeText(this.separatorLine(width)));
      commands.push(this.cmdLineFeed(1));

      // Footer
      commands.push(this.encodeText(settings.receiptFooter || "Thank you!"));
      commands.push(this.cmdLineFeed(3));

      // Cut paper
      commands.push(this.cmdCut());

      // Combine all commands
      const totalLength = commands.reduce((sum, cmd) => sum + cmd.length, 0);
      const buffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const cmd of commands) {
        buffer.set(cmd, offset);
        offset += cmd.length;
      }

      // Send to printer
      await this.sendBytes(buffer);

      return { success: true };
    } catch (error) {
      console.error("Print test error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to print test",
      };
    }
  }

  /**
   * Print full receipt
   */
  async printReceipt(
    transaction: Transaction,
    settings: Settings,
    cashierName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConnected()) {
        return { success: false, error: "Printer not connected" };
      }

      const width = settings.printerWidth === 58 ? 32 : 42;
      const commands: Uint8Array[] = [];

      // Initialize
      commands.push(this.cmdInit());

      // Logo (if exists and is not explicitly removed/empty)
      if (settings.receiptLogoBase64 && settings.receiptLogoBase64.length > 0) {
        try {
          const logoBitmap = await this.imageToBitmap(settings.receiptLogoBase64);
          if (logoBitmap.length > 0) {
            commands.push(this.cmdAlign("center"));
            commands.push(logoBitmap);
            commands.push(this.cmdLineFeed(1));
          }
        } catch (error) {
          console.warn("Failed to print logo, continuing without it:", error);
          // Silent skip - continue printing receipt without logo
        }
      } else if (settings.businessLogo && !settings.receiptLogoBase64) {
        // Fallback to businessLogo if receiptLogoBase64 is undefined (legacy support)
        // But if receiptLogoBase64 is "" (empty string), it means explicitly removed, so don't print
        try {
          const logoBitmap = await this.imageToBitmap(settings.businessLogo);
          if (logoBitmap.length > 0) {
            commands.push(this.cmdAlign("center"));
            commands.push(logoBitmap);
            commands.push(this.cmdLineFeed(1));
          }
        } catch (error) {
          console.warn("Failed to print logo, continuing without it:", error);
          // Silent skip - continue printing receipt without logo
        }
      }

      // Business name (centered, bold, large)
      commands.push(this.cmdAlign("center"));
      commands.push(this.cmdBold(true));
      commands.push(this.cmdTextSize(2, 2));
      commands.push(this.encodeText(settings.businessName || "My Store"));
      commands.push(this.cmdLineFeed(1));
      commands.push(this.cmdTextSize(1, 1));
      commands.push(this.cmdBold(false));

      // Business address (if exists)
      if (settings.businessAddress) {
        commands.push(this.encodeText(settings.businessAddress));
        commands.push(this.cmdLineFeed(1));
      }

      // Tax ID (if exists)
      if (settings.taxId) {
        commands.push(this.encodeText(settings.taxId));
        commands.push(this.cmdLineFeed(1));
      }

      // Separator
      commands.push(this.encodeText(this.separatorLine(width)));
      commands.push(this.cmdLineFeed(1));

      // Receipt info (left aligned)
      commands.push(this.cmdAlign("left"));
      commands.push(this.encodeText(`Date: ${new Date(transaction.timestamp).toLocaleString()}`));
      commands.push(this.cmdLineFeed(1));
      commands.push(this.encodeText(`Receipt: #${transaction.id}`));
      commands.push(this.cmdLineFeed(1));
      commands.push(this.encodeText(`Cashier: ${cashierName}`));
      commands.push(this.cmdLineFeed(1));

      // Separator
      commands.push(this.cmdAlign("center"));
      commands.push(this.encodeText(this.separatorLine(width)));
      commands.push(this.cmdLineFeed(1));

      // Items (2-row format)
      commands.push(this.cmdAlign("left"));
      for (const item of transaction.items) {
        // Row 1: Item name
        commands.push(this.encodeText(item.name));
        commands.push(this.cmdLineFeed(1));

        // Row 2: Qty x Base Price → Total Price
        const qtyPrice = `${item.quantity} x ${this.formatCurrency(item.basePrice)}`;
        const total = this.formatCurrency(item.totalPrice);
        commands.push(this.encodeText(this.padLine(qtyPrice, total, width)));
        commands.push(this.cmdLineFeed(2));
      }

      // Separator
      commands.push(this.cmdAlign("center"));
      commands.push(this.encodeText(this.separatorLine(width)));
      commands.push(this.cmdLineFeed(1));

      // Totals
      commands.push(this.cmdAlign("left"));

      // Subtotal
      commands.push(
        this.encodeText(
          this.padLine("Subtotal:", this.formatCurrency(transaction.subtotal), width)
        )
      );
      commands.push(this.cmdLineFeed(1));

      // Tax (if > 0)
      if (transaction.tax > 0) {
        const taxLabel = settings.tax1Enabled && settings.tax1Inclusive 
          ? `${settings.tax1Label} (included)` 
          : settings.tax1Label || "Tax";
        
        commands.push(
          this.encodeText(
            this.padLine(`${taxLabel}:`, this.formatCurrency(transaction.tax), width)
          )
        );
        commands.push(this.cmdLineFeed(1));
      }

      // Separator
      commands.push(this.cmdAlign("center"));
      commands.push(this.encodeText(this.separatorLine(width)));
      commands.push(this.cmdLineFeed(1));

      // Total (bold, large)
      commands.push(this.cmdAlign("left"));
      commands.push(this.cmdBold(true));
      commands.push(this.cmdTextSize(2, 2));
      commands.push(
        this.encodeText(
          this.padLine("TOTAL:", this.formatCurrency(transaction.total), width - 10)
        )
      );
      commands.push(this.cmdLineFeed(1));
      commands.push(this.cmdTextSize(1, 1));
      commands.push(this.cmdBold(false));

      // Separator
      commands.push(this.cmdAlign("center"));
      commands.push(this.encodeText(this.separatorLine(width)));
      commands.push(this.cmdLineFeed(1));

      // Payment info (multiple payments support)
      commands.push(this.cmdAlign("left"));
      for (const payment of transaction.payments) {
        const methodLabel = payment.method === "qris-static" ? "QRIS" 
          : payment.method === "qris-dynamic" ? "QRIS (Dynamic)" 
          : payment.method === "voucher" ? "Voucher"
          : "Cash";
        
        commands.push(
          this.encodeText(
            this.padLine(`Payment (${methodLabel}):`, this.formatCurrency(payment.amount), width)
          )
        );
        commands.push(this.cmdLineFeed(1));
      }

      // Change (if exists)
      if (transaction.change && transaction.change > 0) {
        commands.push(
          this.encodeText(this.padLine("Change:", this.formatCurrency(transaction.change), width))
        );
        commands.push(this.cmdLineFeed(1));
      }

      // Separator
      commands.push(this.cmdAlign("center"));
      commands.push(this.encodeText(this.separatorLine(width)));
      commands.push(this.cmdLineFeed(1));

      // Footer
      if (settings.receiptFooter) {
        commands.push(this.encodeText(settings.receiptFooter));
        commands.push(this.cmdLineFeed(1));
      }

      // Inclusive tax note
      if (settings.tax1Enabled && settings.tax1Inclusive) {
        commands.push(this.cmdLineFeed(1));
        commands.push(this.encodeText(`ⓘ Prices inclusive of ${settings.tax1Label}`));
        commands.push(this.cmdLineFeed(1));
      }

      // Feed and cut
      commands.push(this.cmdLineFeed(3));
      commands.push(this.cmdCut());

      // Combine all commands
      const totalLength = commands.reduce((sum, cmd) => sum + cmd.length, 0);
      const buffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const cmd of commands) {
        buffer.set(cmd, offset);
        offset += cmd.length;
      }

      // Send to printer
      await this.sendBytes(buffer);

      return { success: true };
    } catch (error) {
      console.error("Print receipt error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to print receipt",
      };
    }
  }
}

// Export singleton instance
export const bluetoothPrinter = new BluetoothPrinterService();