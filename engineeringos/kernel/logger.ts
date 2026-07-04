export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, string | number | boolean | null>;
}

class EngineeringLogger {
  private readonly entries: LogEntry[] = [];

  info(message: string, context?: LogEntry["context"]): void {
    this.write("info", message, context);
  }

  warn(message: string, context?: LogEntry["context"]): void {
    this.write("warn", message, context);
  }

  error(message: string, context?: LogEntry["context"]): void {
    this.write("error", message, context);
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  private write(level: LogLevel, message: string, context?: LogEntry["context"]): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    this.entries.push(entry);

    const prefix = level.toUpperCase();
    const payload = context ? ` ${JSON.stringify(context)}` : "";

    if (level === "error") {
      console.error(`[${prefix}] ${message}${payload}`);
      return;
    }

    if (level === "warn") {
      console.warn(`[${prefix}] ${message}${payload}`);
      return;
    }

    console.log(`[${prefix}] ${message}${payload}`);
  }
}

export const Logger = new EngineeringLogger();
