/**
 * POS Pinger Service
 * 
 * Pings monitoring server to track active POS installations.
 * - Starts with app, stops when app closes
 * - Requires location permission to ping
 * - Completely silent (no logs, no errors, no blocking)
 * - Pings every 15 minutes + on visibility change
 */

const WORKER_URL = "https://pos-coverage.applocator.workers.dev";
const API_KEY = "applocatordevice123";
const PING_INTERVAL = 15 * 60 * 1000; // 15 minutes

interface PingPayload {
  device_id: string;
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

  /**
   * Start the pinger - call on app init
   */
  start(businessName: string = ""): void {
    this.stop();
    this.businessName = businessName;
    
    // Request location permission, then start pinging
    this.requestLocationPermission().then(() => {
      if (this.hasLocationPermission) {
        this.ping();
        this.timer = setInterval(() => this.ping(), PING_INTERVAL);
        
        this.visHandler = () => {
          if (document.visibilityState === "visible") {
            this.ping();
          }
        };
        document.addEventListener("visibilitychange", this.visHandler);
      }
    });
  }

  /**
   * Stop the pinger - call on app close
   */
  stop(): void {
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
   * Request location permission - required for pinging
   */
  private async requestLocationPermission(): Promise<void> {
    try {
      if (!navigator.geolocation) return;
      
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
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
   * Send ping to monitoring server (silent, no errors)
   */
  private async ping(): Promise<void> {
    if (!this.hasLocationPermission) return;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000, // 5 min cache
        });
      });

      const payload: PingPayload = {
        device_id: this.businessName,
        store_name: "",
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };

      await fetch(`${WORKER_URL}/ping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      // Silent - no logging, no error handling
    }
  }
}

// Singleton instance
export const pingerService = new POSPingerService();