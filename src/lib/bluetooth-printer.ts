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
const CP437_TABLE: Record<number, number> = {
  // Control characters and ASCII (0x00-0x7f)
  0x0000: 0x00, 0x0001: 0x01, 0x0002: 0x02, 0x0003: 0x03,
  0x0004: 0x04, 0x0005: 0x05, 0x0006: 0x06, 0x0007: 0x07,
  0x0008: 0x08, 0x0009: 0x09, 0x000a: 0x0a, 0x000b: 0x0b,
  0x000c: 0x0c, 0x000d: 0x0d, 0x000e: 0x0e, 0x000f: 0x0f,
  0x0010: 0x10, 0x0011: 0x11, 0x0012: 0x12, 0x0013: 0x13,
  0x0014: 0x14, 0x0015: 0x15, 0x0016: 0x16, 0x0017: 0x17,
  0x0018: 0x18, 0x0019: 0x19, 0x001a: 0x1a, 0x001b: 0x1b,
  0x001c: 0x1c, 0x001d: 0x1d, 0x001e: 0x1e, 0x001f: 0x1f,
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
  0x005c: 0x5c, 0x005d: 0x005d, 0x005e: 0x5e, 0x005f: 0x5f,
  0x0060: 0x60, 0x0061: 0x61, 0x0062: 0x62, 0x0063: 0x63,
  0x0064: 0x64, 0x0065: 0x65, 0x0066: 0x66, 0x0067: 0x67,
  0x0068: 0x68, 0x0069: 0x69, 0x006a: 0x6a, 0x006b: 0x6b,
  0x006c: 0x6c, 0x006d: 0x6d, 0x006e: 0x6e, 0x006f: 0x6f,
  0x0070: 0x70, 0x0071: 0x71, 0x0072: 0x72, 0x0073: 0x73,
  0x0074: 0x74, 0x0075: 0x75, 0x0076: 0x76, 0x0077: 0x77,
  0x0078: 0x78, 0x0079: 0x79, 0x007a: 0x7a, 0x007b: 0x7b,
  0x007c: 0x7c, 0x007d: 0x7d, 0x007e: 0x7e, 0x007f: 0x7f,
  // Extended CP437 characters (0x80-0xff)
  0x00c7: 0x80, 0x00fc: 0x81, 0x00e9: 0x82, 0x00e2: 0x83,
  0x00e4: 0x84, 0x00e0: 0x85, 0x00e5: 0x86, 0x00e7: 0x87,
  0x00ea: 0x88, 0x00eb: 0x89, 0x00e8: 0x8a, 0x00ef: 0x8b,
  0x00ee: 0x8c, 0x00ec: 0x8d, 0x00c4: 0x8e, 0x00c5: 0x8f,
  0x00c9: 0x90, 0x00e6: 0x91, 0x00c6: 0x92, 0x00f4: 0x93,
  0x00f6: 0x94, 0x00f2: 0x95, 0x00fb: 0x96, 0x00f9: 0x97,
  0x00ff: 0x98, 0x00d6: 0x99, 0x00dc: 0x9a, 0x00f8: 0x9b,
  0x00a3: 0x9c, 0x00d8: 0x9d, 0x00d7: 0x9e, 0x0192: 0x9f,
  0x00e1: 0xa0, 0x00ed: 0xa1, 0x00f3: 0xa2, 0x00fa: 0xa3,
  0x00f1: 0xa4, 0x00d1: 0xa5, 0x00aa: 0xa6, 0x00ba: 0xa7,
  0x00bf: 0xa8, 0x00ae: 0xa9, 0x00ac: 0xaa, 0x00bd: 0xab,
  0x00bc: 0xac, 0x00a1: 0xad, 0x00ab: 0xae, 0x00bb: 0xaf,
  0x2591: 0xb0, 0x2592: 0xb1, 0x2593: 0xb2, 0x2502: 0xb3,
  0x2524: 0xb4, 0x00c1: 0xb5, 0x00c2: 0xb6, 0x00c0: 0xb7,
  0x00a9: 0xb8, 0x2563: 0xb9, 0x2551: 0xba, 0x2557: 0xbb,
  0x255d: 0xbc, 0x00a2: 0xbd, 0x00a5: 0xbe, 0x2510: 0xbf,
  0x2514: 0xc0, 0x2534: 0xc1, 0x252c: 0xc2, 0x251c: 0xc3,
  0x2500: 0xc4, 0x253c: 0xc5, 0x00e3: 0xc6, 0x00c3: 0xc7,
  0x255a: 0xc8, 0x2554: 0xc9, 0x2569: 0xca, 0x2566: 0xcb,
  0x2560: 0xcc, 0x2550: 0xcd, 0x256c: 0xce, 0x00a4: 0xcf,
  0x00f0: 0xd0, 0x00d0: 0xd1, 0x00ca: 0xd2, 0x00cb: 0xd3,
  0x00c8: 0xd4, 0x0131: 0xd5, 0x00cd: 0xd6, 0x00ce: 0xd7,
  0x00cf: 0xd8, 0x2518: 0xd9, 0x250c: 0xda, 0x2588: 0xdb,
  0x2584: 0xdc, 0x00a6: 0xdd, 0x00cc: 0xde, 0x2580: 0xdf,
  0x00d3: 0xe0, 0x00df: 0xe1, 0x00d4: 0xe2, 0x00d2: 0xe3,
  0x00f5: 0xe4, 0x00d5: 0xe5, 0x00b5: 0xe6, 0x00fe: 0xe7,
  0x00de: 0xe8, 0x00da: 0xe9, 0x00db: 0xea, 0x00d9: 0xeb,
  0x00fd: 0xec, 0x00dd: 0xed, 0x00af: 0xee, 0x00b4: 0xef,
  0x00ad: 0xf0, 0x00b1: 0xf1, 0x2017: 0xf2, 0x00be: 0xf3,
  0x00b6: 0xf4, 0x00a7: 0xf5, 0x00f7: 0xf6, 0x00b8: 0xf7,
  0x00b0: 0xf8, 0x00a8: 0xf9, 0x00b7: 0xfa, 0x00b9: 0xfb,
  0x00b3: 0xfc, 0x00b2: 0xfd, 0x25a0: 0xfe, 0x00a0: 0xff,
};

class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private connected = false;
  private autoReconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;

  private readonly SERVICE_UUID = "000018f0-0000-1000-8000-00805f9b34fb";
  private readonly CHARACTERISTIC_UUID = "00002af1-0000-1000-8000-00805f9b34fb";

  private onDisconnectCallback: (() => void) | null = null;
  private onConnectCallback: ((name: string) => void) | null = null;

  setOnConnect(callback: (name: string) => void) {
    this.onConnectCallback = callback;
  }

  setOnDisconnect(callback: () => void) {
    this.onDisconnectCallback = callback;
  }

  /**
   * Save printer ID to settings for auto-reconnect
   */
  private savePrinterId(id: string): void {
    if (typeof window === "undefined") return;
    try {
      const settingsJson = localStorage.getItem("sellmore_settings");
      const settings = settingsJson ? JSON.parse(settingsJson) : {};
      settings.bluetoothPrinterId = id;
      localStorage.setItem("sellmore_settings", JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving printer ID:", e);
    }
  }

  /**
   * Get stored printer ID from settings
   */
  private getStoredPrinterId(): string | null {
    if (typeof window === "undefined") return null;
    try {
      const settings = localStorage.getItem("sellmore_settings");
      if (settings) {
        const parsed = JSON.parse(settings);
        return parsed.bluetoothPrinterId || null;
      }
    } catch (e) {
      console.error("Error reading stored printer ID:", e);
    }
    return null;
  }

  /**
   * Clear stored printer ID (called on manual disconnect)
   */
  private clearPrinterId(): void {
    if (typeof window === "undefined") return;
    try {
      const settingsJson = localStorage.getItem("sellmore_settings");
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        delete settings.bluetoothPrinterId;
        localStorage.setItem("sellmore_settings", JSON.stringify(settings));
      }
    } catch (e) {
      console.error("Error clearing printer ID:", e);
    }
  }

  async autoReconnect(): Promise<{ success: boolean; printerName?: string; error?: string }> {
    const storedId = this.getStoredPrinterId();
    if (!storedId) {
      return { success: false, error: "No previously connected printer found" };
    }
    if (!this.isSupported()) {
      return { success: false, error: "Bluetooth not supported" };
    }
    this.autoReconnectAttempts = 0;
    try {
      const devices = await navigator.bluetooth.getDevices?.() || [];
      const knownDevice = devices.find(d => d.id === storedId);
      if (knownDevice) {
        return await this.connectToDevice(knownDevice);
      }
      return { success: false, error: "Please manually connect - auto-reconnect requires previous permission" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Auto-reconnect failed" };
    }
  }

  private async connectToDevice(device: BluetoothDevice): Promise<{ success: boolean; printerName?: string; printerId?: string; error?: string }> {
    try {
      this.device = device;
      const server = await device.gatt?.connect();
      if (!server) {
        return { success: false, error: "Failed to connect to GATT server" };
      }
      const service = await server.getPrimaryService(this.SERVICE_UUID);
      this.characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID);
      this.connected = true;
      
      // Save printer ID for future auto-reconnect
      this.savePrinterId(device.id);
      
      device.addEventListener("gattserverdisconnected", () => {
        this.connected = false;
        this.onDisconnectCallback?.();
        setTimeout(() => this.attemptReconnect(), 2000);
      });
      
      this.onConnectCallback?.(device.name || "Unknown Printer");
      
      return {
        success: true,
        printerName: device.name || "Unknown Printer",
        printerId: device.id,
      };
    } catch (error) {
      this.connected = false;
      return { success: false, error: error instanceof Error ? error.message : "Failed to connect" };
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.autoReconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) return;
    this.autoReconnectAttempts++;
    const storedId = this.getStoredPrinterId();
    if (!storedId) return;
    try {
      const devices = await navigator.bluetooth.getDevices?.() || [];
      const device = devices.find(d => d.id === storedId);
      if (device) {
        const result = await this.connectToDevice(device);
        if (result.success) {
          this.autoReconnectAttempts = 0;
        }
      }
    } catch (error) {
      setTimeout(() => this.attemptReconnect(), 3000);
    }
  }

  isSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  isConnected(): boolean {
    return this.connected && this.device !== null && this.device.gatt?.connected === true;
  }

  getPrinterName(): string | null {
    return this.device?.name || null;
  }

  getPrinterId(): string | null {
    return this.device?.id || null;
  }

  async connect(): Promise<{ success: boolean; printerName?: string; printerId?: string; error?: string }> {
    try {
      if (!this.isSupported()) {
        return { success: false, error: "Web Bluetooth API not supported. Please use Android Chrome browser." };
      }
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
      const server = await this.device.gatt?.connect();
      if (!server) {
        return { success: false, error: "Failed to connect to GATT server" };
      }
      const service = await server.getPrimaryService(this.SERVICE_UUID);
      this.characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID);
      this.connected = true;
      
      // Save printer ID for future auto-reconnect
      this.savePrinterId(this.device.id);
      
      this.device.addEventListener("gattserverdisconnected", () => {
        this.connected = false;
        this.onDisconnectCallback?.();
        setTimeout(() => this.attemptReconnect(), 2000);
      });
      
      this.onConnectCallback?.(this.device.name || "Unknown Printer");
      
      return {
        success: true,
        printerName: this.device.name || "Unknown Printer",
        printerId: this.device.id,
      };
    } catch (error) {
      this.connected = false;
      return { success: false, error: error instanceof Error ? error.message : "Failed to connect to printer" };
    }
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.clearPrinterId();
    this.device = null;
    this.characteristic = null;
    this.connected = false;
  }

  private async sendBytes(data: Uint8Array): Promise<void> {
    if (!this.characteristic) {
      throw new Error("Printer not connected");
    }
    
    // Web Bluetooth has 512-byte limit per write
    // Use 256 bytes to be safe with BLE overhead
    const CHUNK_SIZE = 256;
    
    if (data.length <= CHUNK_SIZE) {
      await this.characteristic.writeValue(data);
      return;
    }
    
    // Split into chunks and send sequentially
    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      const chunk = data.slice(offset, Math.min(offset + CHUNK_SIZE, data.length));
      await this.characteristic.writeValue(chunk);
      // Small delay between chunks to prevent buffer overflow
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }

  private cmdInit(): Uint8Array {
    return new Uint8Array([ESC, 0x40]);
  }

  private cmdSelectCodePage(): Uint8Array {
    return new Uint8Array([ESC, 0x74, 0x00]);
  }

  private cmdAlign(align: "left" | "center" | "right"): Uint8Array {
    const alignCode = align === "left" ? 0 : align === "center" ? 1 : 2;
    return new Uint8Array([ESC, 0x61, alignCode]);
  }

  private cmdTextSize(width: number, height: number): Uint8Array {
    const size = ((width - 1) << 4) | (height - 1);
    return new Uint8Array([GS, 0x21, size]);
  }

  private cmdBold(enable: boolean): Uint8Array {
    return new Uint8Array([ESC, 0x45, enable ? 1 : 0]);
  }

  private cmdLineFeed(lines = 1): Uint8Array {
    return new Uint8Array(Array(lines).fill(0x0a));
  }

  private cmdCut(): Uint8Array {
    return new Uint8Array([GS, 0x56, 0x41, 0x00]);
  }

  private encodeText(text: string): Uint8Array {
    const bytes: number[] = [];
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      if (charCode < 0x80) {
        bytes.push(charCode);
      } else if (CP437_TABLE[charCode] !== undefined) {
        bytes.push(CP437_TABLE[charCode]);
      } else {
        bytes.push(this.getFallbackChar(charCode));
      }
    }
    return new Uint8Array(bytes);
  }

  private encodeTextRaw(text: string): Uint8Array {
    const bytes: number[] = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 32 && code <= 126) {
        bytes.push(code);
      } else if (code === 10 || code === 13) {
        bytes.push(code);
      } else {
        bytes.push(63);
      }
    }
    return new Uint8Array(bytes);
  }

  private async sendText(text: string, align: "left" | "center" | "right" = "left"): Promise<void> {
    await this.sendBytes(this.cmdAlign(align));
    await this.sendBytes(this.encodeTextRaw(text));
    await this.sendBytes(this.cmdLineFeed(1));
  }

  private getFallbackChar(charCode: number): number {
    const fallbacks: Record<number, number> = {
      0x2018: 0x27, 0x2019: 0x27, 0x201c: 0x22, 0x201d: 0x22, 0x201e: 0x22,
      0x2013: 0x2d, 0x2014: 0x2d, 0x2002: 0x20, 0x2003: 0x20, 0x2009: 0x20,
      0x200a: 0x20, 0x00a0: 0x20, 0x20ac: 0x65, 0x00a5: 0x59, 0x2212: 0x2d,
      0x00d7: 0x78, 0x00f7: 0x2f, 0x2500: 0x2d, 0x2501: 0x3d, 0x2502: 0x7c,
      0x2503: 0x7c, 0x252c: 0x2d, 0x2534: 0x2d, 0x251c: 0x2d, 0x2524: 0x2d,
      0x25b2: 0x5e, 0x25bc: 0x76,
    };
    return fallbacks[charCode] ?? 0x3f;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(amount);
  }

  private padLine(left: string, right: string, width: number): string {
    const totalLength = left.length + right.length;
    const spacesNeeded = Math.max(0, width - totalLength);
    return left + " ".repeat(spacesNeeded) + right;
  }

  private separatorLine(width: number): string {
    return "-".repeat(width);
  }

  private async imageToBitmap(base64Image: string): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }
          
          // Max width for 58mm = 384 dots, 80mm = 576 dots
          // Use 384 as safe default for both
          const maxWidth = 384;
          const scale = Math.min(1, maxWidth / img.width);
          let width = Math.floor(img.width * scale);
          const height = Math.floor(img.height * scale);
          
          // Width must be multiple of 8 for byte alignment
          width = Math.floor(width / 8) * 8;
          if (width === 0) width = 8;
          
          canvas.width = width;
          canvas.height = height;
          
          // White background
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;
          
          // Convert to monochrome bitmap (1 bit per pixel)
          // Using Floyd-Steinberg dithering for better quality
          const grayscale: number[][] = [];
          for (let y = 0; y < height; y++) {
            grayscale[y] = [];
            for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4;
              // Convert to grayscale
              grayscale[y][x] = Math.round(
                0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
              );
            }
          }
          
          // Apply simple threshold (can add dithering later if needed)
          const threshold = 128;
          const monochrome: boolean[][] = [];
          for (let y = 0; y < height; y++) {
            monochrome[y] = [];
            for (let x = 0; x < width; x++) {
              monochrome[y][x] = grayscale[y][x] < threshold;
            }
          }
          
          // Build GS v 0 raster bit image command
          // Format: GS v 0 m xL xH yL yH [data]
          // m = 0 (normal), 1 (double width), 2 (double height), 3 (quadruple)
          const bytesPerLine = width / 8;
          const xL = bytesPerLine & 0xff;
          const xH = (bytesPerLine >> 8) & 0xff;
          const yL = height & 0xff;
          const yH = (height >> 8) & 0xff;
          
          // Calculate total data size
          const dataSize = bytesPerLine * height;
          const headerSize = 8; // GS v 0 m xL xH yL yH
          const commands = new Uint8Array(headerSize + dataSize);
          
          // Header: GS v 0 m xL xH yL yH
          commands[0] = GS;      // 0x1D
          commands[1] = 0x76;    // 'v'
          commands[2] = 0x30;    // '0'
          commands[3] = 0x00;    // m = normal mode
          commands[4] = xL;
          commands[5] = xH;
          commands[6] = yL;
          commands[7] = yH;
          
          // Image data: row by row, MSB first
          let offset = headerSize;
          for (let y = 0; y < height; y++) {
            for (let xByte = 0; xByte < bytesPerLine; xByte++) {
              let byte = 0;
              for (let bit = 0; bit < 8; bit++) {
                const x = xByte * 8 + bit;
                if (x < width && monochrome[y][x]) {
                  // MSB first: bit 7 is leftmost pixel
                  byte |= (0x80 >> bit);
                }
              }
              commands[offset++] = byte;
            }
          }
          
          resolve(commands);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error("Failed to load logo image"));
      img.src = base64Image;
    });
  }

  private async initializePrinter(): Promise<void> {
    const initCommands = new Uint8Array([
      ESC, 0x40,
      ESC, 0x74, 0x00,
      ESC, 0x4d, 0x00,
    ]);
    await this.sendBytes(initCommands);
  }

  async printLogoTest(settings: Settings): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConnected()) {
        return { success: false, error: "Printer not connected" };
      }
      await this.sendBytes(this.cmdInit());
      await new Promise((r) => setTimeout(r, 100));
      if (settings.receiptLogoBase64 && settings.receiptLogoBase64.length > 100) {
        try {
          const logoBitmap = await this.imageToBitmap(settings.receiptLogoBase64);
          if (logoBitmap && logoBitmap.length > 10) {
            await this.sendBytes(this.cmdAlign("center"));
            await this.sendBytes(logoBitmap);
            await this.sendBytes(this.cmdLineFeed(1));
          }
        } catch (error) {
          await this.sendText("Logo print failed", "center");
        }
      } else {
        await this.sendText("No logo configured", "center");
        await this.sendText("Add logo in Settings > Business", "center");
      }
      await this.sendBytes(this.cmdLineFeed(5));
      await this.sendBytes(this.cmdCut());
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to print logo test" };
    }
  }

  async printTest(settings: Settings): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConnected()) {
        return { success: false, error: "Printer not connected" };
      }
      const width = settings.printerWidth === 58 ? 32 : 42;
      const name = settings.businessName || "My Store";
      await this.sendBytes(this.cmdInit());
      await new Promise((r) => setTimeout(r, 100));
      await this.sendBytes(this.cmdAlign("center"));
      await this.sendBytes(this.cmdBold(true));
      await this.sendBytes(this.cmdTextSize(2, 2));
      await this.sendBytes(this.encodeTextRaw(name));
      await this.sendBytes(this.cmdLineFeed(1));
      await this.sendBytes(this.cmdTextSize(1, 1));
      await this.sendBytes(this.cmdBold(false));
      await this.sendText("TEST PRINT", "center");
      await this.sendText(`Printer: ${settings.printerWidth}mm`, "left");
      await this.sendText(`Date: ${new Date().toLocaleString()}`, "left");
      await this.sendText("-".repeat(width), "center");
      await this.sendText("MOCK RECEIPT TEST", "center");
      await this.sendText("Kopi Susu", "left");
      await this.sendText(this.padLine("2 x 15.000", "30.000", width), "left");
      await this.sendText("Nasi Goreng Special", "left");
      await this.sendText(this.padLine("1 x 25.000", "25.000", width), "left");
      await this.sendText("Teh Manis Dingin", "left");
      await this.sendText(this.padLine("3 x 8.000", "24.000", width), "left");
      await this.sendText("Mie Goreng Seafood", "left");
      await this.sendText(this.padLine("1 x 35.000", "35.000", width), "left");
      await this.sendText("-".repeat(width), "center");
      await this.sendText(this.padLine("Subtotal:", "114.000", width), "left");
      await this.sendText(this.padLine("PPN (10%):", "11.400", width), "left");
      await this.sendText("-".repeat(width), "center");
      await this.sendBytes(this.cmdBold(true));
      await this.sendBytes(this.cmdTextSize(1, 2));
      await this.sendText(this.padLine("TOTAL:", "125.400", width), "left");
      await this.sendBytes(this.cmdTextSize(1, 1));
      await this.sendBytes(this.cmdBold(false));
      await this.sendText("-".repeat(width), "center");
      await this.sendText(this.padLine("Cash:", "150.000", width), "left");
      await this.sendText(this.padLine("Change:", "24.600", width), "left");
      await this.sendText("-".repeat(width), "center");
      await this.sendText(settings.receiptFooter || "Thank you!", "center");
      await this.sendText("Test OK", "center");
      await this.sendBytes(this.cmdCut());
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to print test" };
    }
  }

  async printReceipt(
    transaction: Transaction,
    settings: Settings,
    cashierName: string,
    isReprint: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConnected()) {
        return { success: false, error: "Printer not connected" };
      }
      const width = settings.printerWidth === 58 ? 32 : 42;
      
      // ========== CHUNK 1: Initialize + Logo ==========
      await this.initializePrinter();
      await new Promise(r => setTimeout(r, 50));
      
      if (settings.receiptLogoBase64 && settings.receiptLogoBase64.length > 100) {
        try {
          const logoBitmap = await this.imageToBitmap(settings.receiptLogoBase64);
          if (logoBitmap && logoBitmap.length > 10) {
            await this.sendBytes(this.cmdAlign("center"));
            await this.sendBytes(logoBitmap);
            await this.sendBytes(this.cmdLineFeed(1));
            // Wait for printer to process logo before sending text
            await new Promise(r => setTimeout(r, 200));
            // Re-initialize after logo to reset text mode
            await this.sendBytes(this.cmdInit());
            await this.sendBytes(this.cmdSelectCodePage());
          }
        } catch (error) {
          console.warn("Failed to print logo, continuing without it:", error);
        }
      }
      
      // ========== CHUNK 2: Text Content ==========
      const commands: Uint8Array[] = [];
      
      // Store name (header)
      commands.push(this.cmdAlign("center"));
      commands.push(this.cmdBold(true));
      commands.push(this.cmdTextSize(2, 2));
      commands.push(this.encodeText(settings.businessName || "My Store"));
      commands.push(this.cmdLineFeed(1));
      commands.push(this.cmdTextSize(1, 1));
      commands.push(this.cmdBold(false));
      
      if (settings.businessAddress) {
        commands.push(this.encodeText(settings.businessAddress));
        commands.push(this.cmdLineFeed(1));
      }
      if (settings.taxId) {
        commands.push(this.encodeText(settings.taxId));
        commands.push(this.cmdLineFeed(1));
      }
      
      commands.push(this.encodeText(this.separatorLine(width)));
      commands.push(this.cmdLineFeed(1));
      
      // Transaction info
      commands.push(this.cmdAlign("left"));
      commands.push(this.encodeText(`Date: ${new Date(transaction.timestamp).toLocaleString("id-ID")}`));
      commands.push(this.cmdLineFeed(1));
      
      const txnNumber = transaction.id 
        ? transaction.id.toString().padStart(5, "0")
        : new Date(transaction.timestamp).getTime().toString().slice(-10);
      commands.push(this.encodeText(`Receipt: #${txnNumber}`));
      commands.push(this.cmdLineFeed(1));
      
      commands.push(this.encodeText(`Cashier: ${cashierName}`));
      commands.push(this.cmdLineFeed(1));
      
      // REPRINTED marker (if reprint)
      if (isReprint) {
        commands.push(this.cmdAlign("center"));
        commands.push(this.cmdBold(true));
        commands.push(this.encodeText("*** REPRINTED ***"));
        commands.push(this.cmdLineFeed(1));
        commands.push(this.cmdBold(false));
        commands.push(this.cmdAlign("left"));
      }
      
      commands.push(this.cmdAlign("center"));
      commands.push(this.encodeText(this.separatorLine(width)));
      commands.push(this.cmdLineFeed(1));
      
      // Items
      commands.push(this.cmdAlign("left"));
      for (let i = 0; i < transaction.items.length; i++) {
        const item = transaction.items[i];
        const name = item.name.length > width ? item.name.substring(0, width - 3) + "..." : item.name;
        commands.push(this.encodeText(name));
        commands.push(this.cmdLineFeed(1));
        const qtyPrice = `${item.quantity} x ${this.formatCurrency(item.basePrice)}`;
        const total = this.formatCurrency(item.totalPrice);
        commands.push(this.encodeText(this.padLine(qtyPrice, total, width)));
        commands.push(this.cmdLineFeed(1));
        if (i < transaction.items.length - 1) {
          commands.push(this.cmdLineFeed(1));
        }
      }
      
      commands.push(this.cmdAlign("center"));
      commands.push(this.encodeText(this.separatorLine(width)));
      commands.push(this.cmdLineFeed(1));
      
      // Totals
      commands.push(this.cmdAlign("left"));
      commands.push(this.encodeText(this.padLine("Subtotal:", this.formatCurrency(transaction.subtotal), width)));
      commands.push(this.cmdLineFeed(1));
      
      if (transaction.tax > 0) {
        const taxLabel = settings.tax1Enabled && settings.tax1Inclusive 
          ? `${settings.tax1Label} (included)` 
          : settings.tax1Label || "Tax";
        commands.push(this.encodeText(this.padLine(`${taxLabel}:`, this.formatCurrency(transaction.tax), width)));
        commands.push(this.cmdLineFeed(1));
      }
      
      commands.push(this.cmdAlign("center"));
      commands.push(this.encodeText(this.separatorLine(width)));
      commands.push(this.cmdLineFeed(1));
      
      // Grand total
      commands.push(this.cmdAlign("left"));
      commands.push(this.cmdBold(true));
      commands.push(this.cmdTextSize(1, 2));
      commands.push(this.encodeText(this.padLine("TOTAL:", this.formatCurrency(transaction.total), width)));
      commands.push(this.cmdLineFeed(1));
      commands.push(this.cmdTextSize(1, 1));
      commands.push(this.cmdBold(false));
      
      commands.push(this.cmdAlign("center"));
      commands.push(this.encodeText(this.separatorLine(width)));
      commands.push(this.cmdLineFeed(1));
      
      // Payments
      commands.push(this.cmdAlign("left"));
      for (const payment of transaction.payments) {
        const methodLabel = payment.method === "qris-static" ? "QRIS" 
          : payment.method === "qris-dynamic" ? "QRIS (Dynamic)" 
          : payment.method === "voucher" ? "Voucher"
          : "Cash";
        commands.push(this.encodeText(this.padLine(`Payment (${methodLabel}):`, this.formatCurrency(payment.amount), width)));
        commands.push(this.cmdLineFeed(1));
      }
      
      if (transaction.change && transaction.change > 0) {
        commands.push(this.encodeText(this.padLine("Change:", this.formatCurrency(transaction.change), width)));
        commands.push(this.cmdLineFeed(1));
      }
      
      commands.push(this.cmdAlign("center"));
      commands.push(this.encodeText(this.separatorLine(width)));
      commands.push(this.cmdLineFeed(1));
      
      // Footer
      if (settings.receiptFooter) {
        commands.push(this.encodeText(settings.receiptFooter));
        commands.push(this.cmdLineFeed(1));
      }
      
      if (settings.tax1Enabled && settings.tax1Inclusive) {
        commands.push(this.cmdLineFeed(1));
        commands.push(this.encodeText(`* Prices inclusive of ${settings.tax1Label}`));
        commands.push(this.cmdLineFeed(1));
      }
      
      commands.push(this.cmdLineFeed(5));
      commands.push(this.cmdCut());
      
      // Combine text commands and send
      const totalLength = commands.reduce((sum, cmd) => sum + cmd.length, 0);
      const buffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const cmd of commands) {
        buffer.set(cmd, offset);
        offset += cmd.length;
      }
      await this.sendBytes(buffer);
      
      return { success: true };
    } catch (error) {
      console.error("Print receipt error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to print receipt" };
    }
  }
}

export const bluetoothPrinter = new BluetoothPrinterService();