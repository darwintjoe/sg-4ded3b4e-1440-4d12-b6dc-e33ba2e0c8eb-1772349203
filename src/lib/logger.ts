/**
 * Logging Service
 * Centralized logging with log levels and optional persistence
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enablePersistence: boolean;
  maxPersistedLogs: number;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const LOG_LEVEL_ICONS: Record<LogLevel, string> = {
  debug: "🔍",
  info: "ℹ️",
  warn: "⚠️",
  error: "❌"
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "color: gray",
  info: "color: blue",
  warn: "color: orange",
  error: "color: red"
};

class Logger {
  private config: LoggerConfig = {
    minLevel: "info",
    enableConsole: true,
    enablePersistence: false,
    maxPersistedLogs: 1000
  };

  private persistedLogs: LogEntry[] = [];
  private readonly STORAGE_KEY = "app_logs";

  constructor() {
    // Load persisted logs on init
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          this.persistedLogs = JSON.parse(stored);
        }
      } catch (e) {
        // Silent fail
      }
    }
  }

  /**
   * Configure the logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  /**
   * Enable/disable persistence
   */
  setPersistence(enabled: boolean): void {
    this.config.enablePersistence = enabled;
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, category: string, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data
    };

    // Console output
    if (this.config.enableConsole) {
      const icon = LOG_LEVEL_ICONS[level];
      const color = LOG_LEVEL_COLORS[level];
      const prefix = `${icon} [${category}]`;
      
      if (data !== undefined) {
        console.log(`%c${prefix} ${message}`, color, data);
      } else {
        console.log(`%c${prefix} ${message}`, color);
      }
    }

    // Persistence
    if (this.config.enablePersistence) {
      this.persistedLogs.push(entry);
      
      // Trim if exceeds max
      if (this.persistedLogs.length > this.config.maxPersistedLogs) {
        this.persistedLogs = this.persistedLogs.slice(-this.config.maxPersistedLogs);
      }

      // Save to localStorage
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.persistedLogs));
      } catch (e) {
        // Storage full or unavailable
      }
    }
  }

  /**
   * Debug level log
   */
  debug(category: string, message: string, data?: unknown): void {
    this.log("debug", category, message, data);
  }

  /**
   * Info level log
   */
  info(category: string, message: string, data?: unknown): void {
    this.log("info", category, message, data);
  }

  /**
   * Warning level log
   */
  warn(category: string, message: string, data?: unknown): void {
    this.log("warn", category, message, data);
  }

  /**
   * Error level log
   */
  error(category: string, message: string, data?: unknown): void {
    this.log("error", category, message, data);
  }

  /**
   * Get all persisted logs
   */
  getLogs(): LogEntry[] {
    return [...this.persistedLogs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.persistedLogs.filter(log => log.level === level);
  }

  /**
   * Get logs filtered by category
   */
  getLogsByCategory(category: string): LogEntry[] {
    return this.persistedLogs.filter(log => log.category === category);
  }

  /**
   * Clear all persisted logs
   */
  clearLogs(): void {
    this.persistedLogs = [];
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.persistedLogs, null, 2);
  }

  /**
   * Export logs as downloadable file
   */
  downloadLogs(): void {
    const data = this.exportLogs();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `app-logs-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience exports for common categories
export const appLog = {
  debug: (msg: string, data?: unknown) => logger.debug("App", msg, data),
  info: (msg: string, data?: unknown) => logger.info("App", msg, data),
  warn: (msg: string, data?: unknown) => logger.warn("App", msg, data),
  error: (msg: string, data?: unknown) => logger.error("App", msg, data)
};

export const dbLog = {
  debug: (msg: string, data?: unknown) => logger.debug("DB", msg, data),
  info: (msg: string, data?: unknown) => logger.info("DB", msg, data),
  warn: (msg: string, data?: unknown) => logger.warn("DB", msg, data),
  error: (msg: string, data?: unknown) => logger.error("DB", msg, data)
};

export const authLog = {
  debug: (msg: string, data?: unknown) => logger.debug("Auth", msg, data),
  info: (msg: string, data?: unknown) => logger.info("Auth", msg, data),
  warn: (msg: string, data?: unknown) => logger.warn("Auth", msg, data),
  error: (msg: string, data?: unknown) => logger.error("Auth", msg, data)
};

export const backupLog = {
  debug: (msg: string, data?: unknown) => logger.debug("Backup", msg, data),
  info: (msg: string, data?: unknown) => logger.info("Backup", msg, data),
  warn: (msg: string, data?: unknown) => logger.warn("Backup", msg, data),
  error: (msg: string, data?: unknown) => logger.error("Backup", msg, data)
};