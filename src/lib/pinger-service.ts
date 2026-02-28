/**
 * POS Pinger Service
 * 
 * Pings the monitoring server to track active POS installations.
 * - Device ID = Business ID from settings
 * - Store Name = Business Name from settings
 * - Pings every 15 minutes while app is open
 * - Also pings when user returns to app (visibility change)
 * 
 * GPS location is optional - if unavailable, server keeps last known location.
 */

import { appLog } from "./logger";

const WORKER_URL = "https://pos-coverage.applocator.workers.dev";
const API_KEY = "applocatordevice123";
const PING_INTERVAL = 15 * 60 * 1000; // 15 minutes

interface PingerConfig {
  deviceId: string;    // Business ID
  storeName: string;   // Business Name
}

interface PingPayload {
  device_id: string;
  store_name: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

class POSPingerService {
  private deviceId: string = "";
  private storeName: string = "";
  private timer: ReturnType<typeof setInterval> | null = null;
  private visHandler: (() => void) | null = null;
  private running: boolean = false;

  /**
   * Configure and start the pinger with business settings
   */
  start(config: PingerConfig): void {
    if (!config.deviceId) {
      appLog("pinger", "warn", "Cannot start pinger - no Business ID configured");
      return;
    }

    // Stop any existing pinger first
    this.stop();

    this.deviceId = config.deviceId;
    this.storeName = config.storeName || "";
    this.running = true;

    // Immediate ping on start
    this.ping();

    // Set up interval pings
    this.timer = setInterval(() => this.ping(), PING_INTERVAL);

    // Ping when user returns to app
    this.visHandler = () => {
      if (document.visibilityState === "visible") {
        this.ping();
      }
    };
    document.addEventListener("visibilitychange", this.visHandler);

    appLog("pinger", "info", `Started - Device: ${this.deviceId}, Store: ${this.storeName}`);
  }

  /**
   * Stop the pinger
   */
  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.visHandler) {
      document.removeEventListener("visibilitychange", this.visHandler);
      this.visHandler = null;
    }
    appLog("pinger", "info", "Stopped");
  }

  /**
   * Update configuration (e.g., when settings change)
   */
  updateConfig(config: PingerConfig): void {
    if (this.running) {
      // Restart with new config
      this.start(config);
    } else if (config.deviceId) {
      // Start if we now have a valid device ID
      this.start(config);
    }
  }

  /**
   * Force an immediate ping
   */
  forcePing(): void {
    this.ping();
  }

  /**
   * Check if pinger is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Send ping to monitoring server
   */
  private async ping(): Promise<void> {
    if (!this.deviceId) return;

    const payload: PingPayload = {
      device_id: this.deviceId,
      store_name: this.storeName,
    };

    // Try to get GPS location - silently skip if unavailable
    try {
      const pos = await this.getGPSPosition();
      payload.latitude = pos.coords.latitude;
      payload.longitude = pos.coords.longitude;
      payload.accuracy = pos.coords.accuracy;
    } catch {
      // GPS unavailable - continue without location
    }

    try {
      const res = await fetch(`${WORKER_URL}/ping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      appLog("pinger", "debug", "Ping OK");
    } catch (err) {
      appLog("pinger", "warn", `Ping failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  /**
   * Get GPS position with timeout
   */
  private getGPSPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 3600000, // 1 hour cache
      });
    });
  }
}

// Singleton instance
export const pingerService = new POSPingerService();