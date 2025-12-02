/**
 * Production-Safe Centralized Logger
 * 
 * Features:
 * - Timestamps with request context
 * - Log levels: debug, info, warn, error
 * - Safe truncation of sensitive data
 * - JSON output for structured logging
 * - Minimal client-facing error messages
 * 
 * Usage:
 *   import { logger, createRequestLogger } from '@/lib/logger';
 *   
 *   // Global logger
 *   logger.info('Server started');
 *   
 *   // Request-scoped logger
 *   const log = createRequestLogger('upload', documentId);
 *   log.info('Processing started');
 */

// ============================================================================
// TYPES
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context?: string;
  requestId?: string;
  message: string;
  data?: Record<string, unknown>;
}

interface LoggerInstance {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Only show debug logs in development
const MIN_LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Maximum length for logged strings (prevent log bloat)
const MAX_STRING_LENGTH = 500;
const MAX_PREVIEW_LENGTH = 200;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Truncate a string safely for logging
 */
function truncate(value: string, maxLength: number = MAX_STRING_LENGTH): string {
  if (value.length <= maxLength) return value;
  return value.substring(0, maxLength) + `... (${value.length - maxLength} more chars)`;
}

/**
 * Safely stringify data for logging, truncating long strings
 */
function safeStringify(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Never log sensitive keys
    if (key.toLowerCase().includes('key') || 
        key.toLowerCase().includes('secret') || 
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('token')) {
      result[key] = '[REDACTED]';
      continue;
    }
    
    if (typeof value === 'string') {
      result[key] = truncate(value);
    } else if (value instanceof Error) {
      result[key] = {
        name: value.name,
        message: truncate(value.message),
        stack: value.stack ? truncate(value.stack, MAX_PREVIEW_LENGTH) : undefined,
      };
    } else if (typeof value === 'object' && value !== null) {
      try {
        // Handle arrays separately to preserve structure
        if (Array.isArray(value)) {
          const sanitizedArray = value.map((item) =>
            typeof item === 'object' && item !== null
              ? safeStringify(item as Record<string, unknown>)
              : item
          );
          const json = JSON.stringify(sanitizedArray);
          result[key] = json.length > MAX_STRING_LENGTH ? truncate(json) : sanitizedArray;
        } else {
          // Recursively sanitize nested objects
          const sanitized = safeStringify(value as Record<string, unknown>);
          const json = JSON.stringify(sanitized);
          result[key] = json.length > MAX_STRING_LENGTH ? truncate(json) : sanitized;
        }
      } catch {
        result[key] = '[Circular or non-serializable]';
      }    } else {
      result[key] = value;
    }
  }
  
  return result;
}
/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LOG_LEVEL];
}

/**
 * Format and output a log entry
 */
function writeLog(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;
  
  const output = {
    ...entry,
    data: entry.data ? safeStringify(entry.data) : undefined,
  };
  
  // Remove undefined fields
  Object.keys(output).forEach(key => {
    if (output[key as keyof typeof output] === undefined) {
      delete output[key as keyof typeof output];
    }
  });
  
  const jsonLog = JSON.stringify(output);
  
  switch (entry.level) {
    case 'error':
      console.error(jsonLog);
      break;
    case 'warn':
      console.warn(jsonLog);
      break;
    case 'debug':
      console.debug(jsonLog);
      break;
    default:
      console.log(jsonLog);
  }
}

// ============================================================================
// LOGGER FACTORY
// ============================================================================

/**
 * Create a logger instance with optional context
 */
function createLogger(context?: string, requestId?: string): LoggerInstance {
  const log = (level: LogLevel) => (message: string, data?: Record<string, unknown>) => {
    writeLog({
      timestamp: new Date().toISOString(),
      level,
      context,
      requestId,
      message,
      data,
    });
  };
  
  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
  };
}

/**
 * Create a request-scoped logger with context and request ID
 * 
 * @param context - The route or operation name (e.g., 'upload', 'process-document')
 * @param requestId - Optional unique identifier for this request (e.g., documentId)
 */
export function createRequestLogger(context: string, requestId?: string): LoggerInstance {
  return createLogger(context, requestId);
}

// ============================================================================
// GLOBAL LOGGER
// ============================================================================

/**
 * Global logger instance for general logging
 */
export const logger = createLogger();

// ============================================================================
// ERROR HELPERS
// ============================================================================

/**
 * Create a minimal, safe error message for client responses
 * Never expose internal error details to clients
 */
export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Only expose known safe error types
    if (error.name === 'RuntimeError') {
      return error.message;
    }
    // For other errors, return generic message
    return 'An error occurred. Please try again.';
  }
  return 'An unexpected error occurred.';
}

/**
 * Log an error and return a safe client message
 */
export function logAndSanitize(
  log: LoggerInstance,
  error: unknown,
  context?: string
): string {
  const errorData: Record<string, unknown> = {};
  
  if (error instanceof Error) {
    errorData.name = error.name;
    errorData.message = error.message;
    errorData.stack = error.stack;
  } else {
    errorData.raw = String(error);
  }
  
  if (context) {
    errorData.context = context;
  }
  
  log.error('Operation failed', errorData);
  
  return safeErrorMessage(error);
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { LogLevel, LogEntry, LoggerInstance };
