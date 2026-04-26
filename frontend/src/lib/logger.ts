/**
 * Centralized logging utility
 * Provides structured logging with different levels and component tracking
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  component?: string
  [key: string]: any
}

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Format log message with timestamp
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const component = context?.component ? `[${context.component}]` : ''
  return `${timestamp} ${level.toUpperCase()} ${component} ${message}`
}

/**
 * Logger object with methods for different log levels
 */
export const logger = {
  /**
   * Debug level - detailed information for debugging
   */
  debug(message: string, context?: LogContext) {
    if (!isDevelopment) return

    const formatted = formatMessage('debug', message, context)
    console.debug(formatted, context)
  },

  /**
   * Info level - general informational messages
   */
  info(message: string, context?: LogContext) {
    const formatted = formatMessage('info', message, context)
  },

  /**
   * Warn level - warning messages for potentially problematic situations
   */
  warn(message: string, context?: LogContext) {
    const formatted = formatMessage('warn', message, context)
    console.warn(formatted, context)
  },

  /**
   * Error level - error messages for failures
   */
  error(message: string, error?: Error | any, context?: LogContext) {
    const formatted = formatMessage('error', message, context)
    console.error(formatted, error, context)
  }
}

