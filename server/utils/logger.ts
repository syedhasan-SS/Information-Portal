/**
 * Structured Logging System
 *
 * Replaces console.log/error/warn with a centralized logging utility
 * - Development: Console output with color coding
 * - Production: Structured JSON logs ready for external services (Datadog, Sentry, etc.)
 */

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  userId?: string;
  requestId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Format log entry for console output with colors
   */
  private formatForConsole(entry: LogEntry): void {
    const colors = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m'  // Red
    };
    const reset = '\x1b[0m';
    const color = colors[entry.level];

    const parts = [
      `${color}[${entry.level}]${reset}`,
      `[${entry.timestamp}]`,
      entry.requestId ? `[${entry.requestId}]` : '',
      entry.userId ? `[User: ${entry.userId}]` : '',
      entry.message
    ].filter(Boolean);

    console.log(parts.join(' '), entry.context || '');

    if (entry.error) {
      console.error(`${color}Error Details:${reset}`, entry.error);
    }
  }

  /**
   * Format log entry for production JSON output
   */
  private formatForProduction(entry: LogEntry): void {
    // In production, output structured JSON that can be consumed by logging services
    console.log(JSON.stringify(entry));
  }

  /**
   * Create log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    userId?: string,
    requestId?: string
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) entry.context = context;
    if (userId) entry.userId = userId;
    if (requestId) entry.requestId = requestId;
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      };
    }

    return entry;
  }

  /**
   * Log a message
   */
  private log(entry: LogEntry): void {
    if (this.isProduction) {
      this.formatForProduction(entry);
    } else {
      this.formatForConsole(entry);
    }
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: LogContext, userId?: string, requestId?: string): void {
    if (!this.isDevelopment) return; // Only log in development

    const entry = this.createEntry(LogLevel.DEBUG, message, context, undefined, userId, requestId);
    this.log(entry);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext, userId?: string, requestId?: string): void {
    const entry = this.createEntry(LogLevel.INFO, message, context, undefined, userId, requestId);
    this.log(entry);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext, userId?: string, requestId?: string): void {
    const entry = this.createEntry(LogLevel.WARN, message, context, undefined, userId, requestId);
    this.log(entry);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, context?: LogContext, userId?: string, requestId?: string): void {
    const entry = this.createEntry(LogLevel.ERROR, message, context, error, userId, requestId);
    this.log(entry);
  }

  /**
   * Helper to extract user ID from Express request
   */
  static getUserId(req: any): string | undefined {
    return req.user?.id || req.user?.email || undefined;
  }

  /**
   * Helper to extract or generate request ID from Express request
   */
  static getRequestId(req: any): string | undefined {
    return req.headers['x-request-id'] as string || req.id || undefined;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for use in other files
export type { LogContext };
export { LogLevel };
