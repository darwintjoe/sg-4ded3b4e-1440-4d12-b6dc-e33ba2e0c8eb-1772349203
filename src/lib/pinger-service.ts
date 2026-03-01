/**
 * POS Pinger Service
 * 
 * Pings monitoring server to track active POS installations.
 * 
 * FIRST LAUNCH:
 *   No ID in localStorage → POST /register → server assigns hex ID → saved forever
 * 
 * EVERY LAUNCH AFTER:
 *   Has ID → POST /ping directly
 * 
 * LIFECYCLE:
 *   - Starts with app, stops when app closes
 *   - Requires location permission to ping
 *   - Completely silent (no logs, no errors, no blocking)
 *   - Pings every 15 minutes + on visibility change
 */

const WORKER_URL = "https://pos-coverage.applocator.workers.dev";
const API_KEY = "applocatordevice123";
const PING_INTERVAL = 15 * 60 * 1000; // 15 minutes
const DEVICE_ID_KEY = "pos_device_id";

interface PingPayload {
  device_id?: string;
  store_name: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

class POSPingerService {
  private businessName: string = "";
  private timer: ReturnType<typeof setInterval> | null = null;
  private visHandler: (() => void) | null = null;
  private hasLocationPermission: boolean = false;
  private running: boolean = false;

  /**
   * Start the pinger - call on app init
   */
  async start(businessName: string = ""): Promise<void> {
    if (this.running) return;
    this.businessName = businessName;
    
    // Request location permission first
    await this.requestLocationPermission();
    if (!this.hasLocationPermission) return;

    this.running = true;

    // Ensure device is registered before first ping
    await this.ensureRegistered();

    // First ping immediately
    await this.ping();

    // Recurring ping every 15 minutes
    this.timer = setInterval(() => this.ping(), PING_INTERVAL);

    // Ping when user returns to app
    this.visHandler = () => {
      if (document.visibilityState === "visible") {
        this.ping();
      }
    };
    document.addEventListener("visibilitychange", this.visHandler);
  }

  /**
   * Stop the pinger - call on app close
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
  }

  /**
   * Update business name (when settings change)
   */
  updateBusinessName(businessName: string): void {
    this.businessName = businessName;
  }

  /**
   * Get device ID from localStorage
   */
  private getDeviceId(): string | null {
    return localStorage.getItem(DEVICE_ID_KEY);
  }

  /**
   * Request location permission - required for pinging
   */
  private async requestLocationPermission(): Promise<void> {
    try {
      if (!navigator.geolocation) return;
      
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      
      this.hasLocationPermission = true;
    } catch {
      this.hasLocationPermission = false;
    }
  }

  /**
   * Ensure device is registered with server
   * Called once on start(). If no ID exists, registers with server.
   */
  private async ensureRegistered(): Promise<void> {
    if (this.getDeviceId()) return; // Already registered

    const payload: PingPayload = { store_name: this.businessName };

    // Attach GPS if available
    try {
      const pos = await this.getPosition();
      payload.latitude = pos.coords.latitude;
      payload.longitude = pos.coords.longitude;
      payload.accuracy = pos.coords.accuracy;
    } catch {}

    try {
      const res = await fetch(`${WORKER_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Register HTTP ${res.status}`);
      const data = await res.json();

      // Server assigned hex ID - save permanently
      localStorage.setItem(DEVICE_ID_KEY, data.device_id);
    } catch {
      // Silent - registration will retry on next start()
    }
  }

  /**
   * Send ping to monitoring server
   */
  private async ping(): Promise<void> {
    const device_id = this.getDeviceId();
    if (!device_id) return; // Not registered yet

    const payload: PingPayload = {
      device_id,
      store_name: this.businessName,
    };

    // Attach GPS if available
    try {
      const pos = await this.getPosition();
      payload.latitude = pos.coords.latitude;
      payload.longitude = pos.coords.longitude;
      payload.accuracy = pos.coords.accuracy;
    } catch {}

    try {
      await fetch(`${WORKER_URL}/ping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      // Silent - no error handling
    }
  }

  /**
   * Get current GPS position
   */
  private getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject();
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