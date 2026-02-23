/**
 * Bluetooth Thermal Printer Service
 * ESC/POS command generation and Web Bluetooth API wrapper
 * Android Chrome PWA only
 */

import { Settings, Transaction, CartItem } from "@/types";

// ESC/POS Commands
const ESC = 0x1b;
const GS = 0x1d;

// CP437 Code Page Table for thermal printers
// Maps Unicode characters to CP437 byte values
const CP437_TABLE: Record<number, number> = {
  // Control characters
  0x0000: 0x00, 0x0001: 0x01, 0x0002: 0x02, 0x0003: 0x03,
  0x0004: 0x04, 0x0005: 0x05, 0x0006: 0x06, 0x0007: 0x07,
  0x0008: 0x08, 0x0009: 0x09, 0x000a: 0x0a, 0x000b: 0x0b,
  0x000c: 0x0c, 0x000d: 0x0d, 0x000e: 0x0e, 0x000f: 0x0f,
  0x0010: 0x10, 0x0011: 0x11, 0x0012: 0x12, 0x0013: 0x13,
  0x0014: 0x14, 0x0015: 0x15, 0x0016: 0x16, 0x0017: 0x17,
  0x0018: 0x18, 0x0019: 0x19, 0x001a: 0x1a, 0x001b: 0x1b,
  0x001c: 0x1c, 0x001d: 0x1d, 0x001e: 0x1e, 0x001f: 0x1f,
  
  // Standard ASCII
  0x0020: 0x20, 0x0021: 0x21, 0x0022: 0x22, 0x0023: 0x23,
  0x0024: 0x24, 0x0025: 0x25, 0x0026: 0x26, 0x0027: 0x27,
  0x0028: 0x28, 0x0029: 0x29, 0x002a: 0x2a, 0x002b: 0x2b,
  0x002c: 0x2c, 0x002d: 0x2d, 0x002e: 0x2e, 0x002f: 0x2f,
  0x0030: 0x30, 0x0031: 0x31, 0x0032: 0x32, 0x0033: 0x33,
  0x0034: 0x34, 0x0035: 0x35, 0x0036: 0x36, 0x0037: 0x37,
  0x0038: 0x38, 0x0039: 0x39, 0x003a: 0x3a, 0x003b: 0x3b,
  0x003c: 0x3c, 0x003d: 0x3d, 0x003e: 0x3e, 0x003f: 0x3f,
  0x0040: 0x40, 0x0041: 0x41, 0x0042: 0x42, 0x0043: 0x43,
  0x0044: 0x44, 0x0045: 0x45, 0x0046: 0x46, 0x0047: 0x47,
  0x0048: 0x48, 0x0049: 0x49, 0x004a: 0x4a, 0x004b: 0x4b,
  0x004c: 0x4c, 0x004d: 0x4d, 0x004e: 0x4e, 0x004f: 0x4f,
  0x0050: 0x50, 0x0051: 0x51, 0x0052: 0x52, 0x0053: 0x53,
  0x0054: 0x54, 0x0055: 0x55, 0x0056: 0x56, 0x0057: 0x57,
  0x0058: 0x58, 0x0059: 0x59, 0x005a: 0x5a, 0x005b: 0x5b,
  0x005c: 0x5c, 0x005d: 0x5d, 0x005e: 0x5e, 0x005f: 0x5f,
  0x0060: 0x60, 0x0061: 0x61, 0x0062: 0x62, 0x0063: 0x63,
  0x0064: 0x64, 0x0065: 0x65, 0x0066: 0x66, 0x0067: 0x67,
  0x0068: 0x68, 0x0069: 0x69, 0x006a: 0x6a, 0x006b: 0x6b,
  0x006c: 0x6c, 0x006d: 0x6d, 0x006e: 0x6e, 0x006f: 0x6f,
  0x0070: 0x70, 0x0071: 0x71, 0x0072: 0x72, 0x0073: 0x73,
  0x0074: 0x74, 0x0075: 0x75, 0x0076: 0x76, 0x0077: 0x77,
  0x0078: 0x78, 0x0079: 0x79, 0x007a: 0x7a, 0x007b: 0x7b,
  0x007c: 0x7c, 0x007d: 0x7d, 0x007e: 0x7e, 0x007f: 0x7f,
  
  // Extended CP437 characters
  0x00c7: 0x80, // Ç
  0x00fc: 0x81, // ü
  0x00e9: 0x82, // é
  0x00e2: 0x83, // â
  0x00e4: 0x84, // ä
  0x00e0: 0x85, // à
  0x00e5: 0x86, // å
  0x00e7: 0x87, // ç
  0x00ea: 0x88, // ê
  0x00eb: 0x89, // ë
  0x00e8: 0x8a, // è
  0x00ef: 0x8b, // ï
  0x00ee: 0x8c, // î
  0x00ec: 0x8d, // ì
  0x00c4: 0x8e, // Ä
  0x00c5: 0x8f, // Å
  0x00c9: 0x90, // É
  0x00e6: 0x91, // æ
  0x00c6: 0x92, // Æ
  0x00f4: 0x93, // ô
  0x00f6: 0x94, // ö
  0x00f2: 0x95, // ò
  0x00fb: 0x96, // û
  0x00f9: 0x97, // ù
  0x00ff: 0x98, // ÿ
  0x00d6: 0x99, // Ö
  0x00dc: 0x9a, // Ü
  0x00f8: 0x9b, // ø
  0x00a3: 0x9c, // £
  0x00d8: 0x9d, // Ø
  0x00d7: 0x9e, // ×
  0x0192: 0x9f, // ƒ
  0x00e1: 0xa0, // á
  0x00ed: 0xa1, // í
  0x00f3: 0xa2, // ó
  0x00fa: 0xa3, // ú
  0x00f1: 0xa4, // ñ
  0x00d1: 0xa5, // Ñ
  0x00aa: 0xa6, // ª
  0x00ba: 0xa7, // º
  0x00bf: 0xa8, // ¿
  0x00ae: 0xa9, // ®
  0x00ac: 0xaa, // ¬
  0x00bd: 0xab, // ½
  0x00bc: 0xac, // ¼
  0x00a1: 0xad, // ¡
  0x00ab: 0xae, // «
  0x00bb: 0xaf, // »
  0x2591: 0xb0, // ░
  0x2592: 0xb1, // ▒
  0x2593: 0xb2, // ▓
  0x2502: 0xb3, // │
  0x2524: 0xb4, // ┤
  0x00c1: 0xb5, // Á
  0x00c2: 0xb6, // Â
  0x00c0: 0xb7, // À
  0x00a9: 0xb8, // ©
  0x2563: 0xb9, // ╣
  0x2551: 0xba, // ║
  0x2557: 0xbb, // ╗
  0x255d: 0xbc, // ╝
  0x00a2: 0xbd, // ¢
  0x00a5: 0xbe, // ¥
  0x2510: 0xbf, // ┐
  0x2514: 0xc0, // └
  0x2534: 0xc1, // ┴
  0x252c: 0xc2, // ┬
  0x251c: 0xc3, // ├
  0x2500: 0xc4, // ─
  0x253c: 0xc5, // ┼
  0x00e3: 0xc6, // ã
  0x00c3: 0xc7, // Ã
  0x255a: 0xc8, // ╚
  0x2554: 0xc9, // ╔
  0x2569: 0xca, // ╩
  0x2566: 0xcb, // ╦
  0x2560: 0xcc, // ╠
  0x2550: 0xcd, // ═
  0x256c: 0xce, // ╬
  0x00a4: 0xcf, // ¤
  0x00f0: 0xd0, // ð
  0x00d0: 0xd1, // Ð
  0x00ca: 0xd2, // Ê
  0x00cb: 0xd3, // Ë
  0x00c8: 0xd4, // È
  0x0131: 0xd5, // ı
  0x00cd: 0xd6, // Í
  0x00ce: 0xd7, // Î
  0x00cf: 0xd8, // Ï
  0x2518: 0xd9, // ┘
  0x250c: 0xda, // ┌
  0x2588: 0xdb, // █
  0x2584: 0xdc, // ▄
  0x00a6: 0xdd, // ¦
  0x00cc: 0xde, // Ì
  0x2580: 0xdf, // ▀
  0x00d3: 0xe0, // Ó
  0x00df: 0xe1, // ß
  0x00d4: 0xe2, // Ô
  0x00d2: 0xe3, // Ò
  0x00f5: 0xe4, // õ
  0x00d5: 0xe5, // Õ
  0x00b5: 0xe6, // µ
  0x00fe: 0xe7, // þ
  0x00de: 0xe8, // Þ
  0x00da: 0xe9, // Ú
  0x00db: 0xea, // Û
  0x00d9: 0xeb, // Ù
  0x00fd: 0xec, // ý
  0x00dd: 0xed, // Ý
  0x00af: 0xee, // ¯
  0x00b4: 0xef, // ´
  0x00ad: 0xf0, // ­
  0x00b1: 0xf1, // ±
  0x2017: 0xf2, // ‗
  0x00be: 0xf3, // ¾
  0x00b6: 0xf4, // ¶
  0x00a7: 0xf5, // §
  0x00f7: 0xf6, // ÷
  0x00b8: 0xf7, // ¸
  0x00b0: 0xf8, // °
  0x00a8: 0xf9, // ¨
  0x00b7: 0xfa, // ·
  0x00b9: 0xfb, // ¹
  0x00b3: 0xfc, // ³
  0x00b2: 0xfd, // ²
  0x25a0: 0xfe, // ■
  0x00a0: 0xff, // NBSP
};

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
   * ESC/POS: Select code page (CP437)
   */
  private cmdSelectCodePage(): Uint8Array {
    return new Uint8Array([ESC, 0x74, 0x00]); // ESC t 0 (CP437)
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
   * Convert Unicode string to CP437 bytes
   */
  private encodeText(text: string): Uint8Array {
    const bytes: number[] = [];
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      
      if (charCode < 0x80) {
        // Standard ASCII - direct mapping
        bytes.push(charCode);
      } else if (CP437_TABLE[charCode] !== undefined) {
        // Extended CP437 character - use lookup table
        bytes.push(CP437_TABLE[charCode]);
      } else {
        // Fallback for unsupported characters
        // Map common replacements
        const fallback = this.getFallbackChar(charCode);
        bytes.push(fallback);
      }
    }
    
    return new Uint8Array(bytes);
  }

  /**
   * Get fallback character for unsupported Unicode
   */
  private getFallbackChar(charCode: number): number {
    const fallbacks: Record<number, number> = {
      // Smart quotes to regular quotes
      0x2018: 0x27, // ' -> '
      0x2019: 0x27, // ' -> '
      0x201c: 0x22, // " -> "
      0x201d: 0x22, // " -> "
      0x201e: 0x22, // " -> "
      
      // Dashes
      0x2013: 0x2d, // en-dash -> -
      0x2014: 0x2d, // em-dash -> -
      
      // Spaces
      0x2002: 0x20, // en space -> space
      0x2003: 0x20, // em space -> space
      0x2009: 0x20, // thin space -> space
      0x200a: 0x20, // hair space -> space
      0x00a0: 0x20, // NBSP -> space
      
      // Currency
      0x20ac: 0x65, // Euro -> e (fallback)
      0x00a5: 0x59, // Yen -> Y
      
      // Math
      0x2212: 0x2d, // minus sign -> -
      0x00d7: 0x78, // multiplication -> x
      0x00f7: 0x2f, // division -> /
      
      // Box drawing fallback to simple dashes
      0x2500: 0x2d, // ─ -> -
      0x2501: 0x3d, // ━ -> =
      0x2502: 0x7c, // │ -> |
      0x2503: 0x7c, // ┃ -> |
      0x252c: 0x2d, // ┬ -> -
      0x2534: 0x2d, // ┴ -> -
      0x251c: 0x2d, // ├ -> -
      0x2524: 0x2d, // ┤ -> -
      
      // Additional Indonesian characters
      0x25b2: 0x5e, // ▲ -> ^
      0x25bc: 0x76, // ▼ -> v
    };
    
    return fallbacks[charCode] ?? 0x3f; // ? for unknown characters
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
   * Generate separator line using simple dashes for compatibility
   */
  private separatorLine(width: number): string {
    return "-".repeat(width);
  }

  /**
   * Convert logo image to ESC/POS bitmap for thermal printer
   */
  private async imageToBitmap(base64Image: string): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        try {
          // Create canvas
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          // Calculate target width (max 384 pixels for 58mm printer at 203 DPI)
          // Scale proportionally
          const maxWidth = 384;
          const scale = Math.min(1, maxWidth / img.width);
          const width = Math.floor(img.width * scale);
          const height = Math.floor(img.height * scale);
          
          // Set canvas size
          canvas.width = width;
          canvas.height = height;
          
          // Fill white background first (clear any transparency)
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, width, height);
          
          // Draw image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;
          
          // Convert to monochrome using threshold
          const threshold = 128;
          const monochrome: boolean[][] = [];
          
          for (let y = 0; y < height; y++) {
            monochrome[y] = [];
            for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4;
              // Convert RGB to grayscale using luminance formula
              const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
              // Black if below threshold
              monochrome[y][x] = gray < threshold;
            }
          }
          
          // ESC/POS bitmap command: ESC * m nL nH d1...dk
          // Use mode 0 (8-dot single-density) for maximum compatibility
          const bytesPerLine = Math.ceil(width / 8);
          const commands: number[] = [];
          
          // Process image in 8-pixel high strips
          for (let y = 0; y < height; y += 8) {
            // ESC * 0 nL nH - 8-dot single-density
            commands.push(ESC, 0x2a, 0x00);
            commands.push(bytesPerLine & 0xff); // nL (low byte)
            commands.push((bytesPerLine >> 8) & 0xff); // nH (high byte)
            
            // Generate bitmap data for this strip
            for (let x = 0; x < width; x += 8) {
              let byte = 0;
              for (let bit = 0; bit < 8; bit++) {
                const py = y + bit;
                if (py < height && monochrome[py][x]) {
                  byte |= (1 << (7 - bit)); // MSB first
                }
              }
              commands.push(byte);
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
      
      // Set src after handlers
      img.src = base64Image;
    });
  }

  /**
   * Initialize printer with proper setup sequence
   */
  private async initializePrinter(): Promise<void> {
    const initCommands = new Uint8Array([
      ESC, 0x40,        // ESC @ - Initialize printer
      ESC, 0x74, 0x00,  // ESC t 0 - Select CP437 code page
      ESC, 0x4d, 0x00,  // ESC M 0 - Select font A (12x24)
    ]);
    
    await this.sendBytes(initCommands);
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

      // Initialize printer with proper encoding
      await this.initializePrinter();

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

      // Initialize printer with proper encoding
      await this.initializePrinter();

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

        // Row 2: Qty x Base Price -> Total Price
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
        commands.push(this.encodeText(`i Prices inclusive of ${settings.tax1Label}`));
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