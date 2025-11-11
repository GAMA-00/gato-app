/**
 * Centralized logging system for the application
 * Provides different log levels and environment-aware logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabledInProduction: boolean;
  enabledInDevelopment: boolean;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enabledInProduction: false,
      enabledInDevelopment: true,
      ...config
    };
  }

  private shouldLog(): boolean {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    return isDevelopment ? this.config.enabledInDevelopment : this.config.enabledInProduction;
  }

  private formatMessage(level: LogLevel, message: string, prefix?: string): string {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const levelEmoji = this.getLevelEmoji(level);
    const finalPrefix = prefix || this.config.prefix || '';
    return `${levelEmoji} [${timestamp}] ${finalPrefix}${finalPrefix ? ' ' : ''}${message}`;
  }

  private getLevelEmoji(level: LogLevel): string {
    const emojis = {
      debug: '🔧',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    };
    return emojis[level];
  }

  debug(message: string, data?: any, prefix?: string): void {
    if (!this.shouldLog()) return;
    console.log(this.formatMessage('debug', message, prefix), data || '');
  }

  info(message: string, data?: any, prefix?: string): void {
    if (!this.shouldLog()) return;
    console.info(this.formatMessage('info', message, prefix), data || '');
  }

  warn(message: string, data?: any, prefix?: string): void {
    if (!this.shouldLog()) return;
    console.warn(this.formatMessage('warn', message, prefix), data || '');
  }

  error(message: string, error?: any, prefix?: string): void {
    if (!this.shouldLog()) return;
    console.error(this.formatMessage('error', message, prefix), error || '');
  }

  // Specialized methods for common use cases
  bookingOperation(message: string, data?: any): void {
    this.debug(message, data, '📅');
  }

  apiCall(message: string, data?: any): void {
    this.debug(message, data, '🌐');
  }

  dataProcessing(message: string, data?: any): void {
    this.debug(message, data, '⚙️');
  }

  userAction(message: string, data?: any): void {
    this.debug(message, data, '👤');
  }

  systemOperation(message: string, data?: any): void {
    this.debug(message, data, '🔄');
  }

  locationProcessing(message: string, data?: any): void {
    this.debug(message, data, '📍');
  }

  recurring(message: string, data?: any): void {
    this.debug(message, data, '🔁');
  }

  achievement(message: string, data?: any): void {
    this.debug(message, data, '🏆');
  }

  rating(message: string, data?: any): void {
    this.debug(message, data, '⭐');
  }

  calendar(message: string, data?: any): void {
    this.debug(message, data, '📆');
  }
}

// Create default logger instance
export const logger = new Logger();

// Create specialized loggers for different modules
export const bookingLogger = new Logger({ prefix: 'BOOKING' });
export const apiLogger = new Logger({ prefix: 'API' });
export const calendarLogger = new Logger({ prefix: 'CALENDAR' });
export const recurringLogger = new Logger({ prefix: 'RECURRING' });
export const locationLogger = new Logger({ prefix: 'LOCATION' });
export const authLogger = new Logger({ prefix: 'AUTH' });

// For backwards compatibility, maintain console.log behavior in development
export const devLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(message, data || '');
  }
};

export default logger;