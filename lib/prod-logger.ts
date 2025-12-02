/**
 * Production-Safe Logging Utility
 * 
 * Only logs in production when ENABLE_PROD_LOGS=true
 * Logs to console (Vercel captures) and /tmp/docai.log (ephemeral)
 * 
 * Usage:
 *   import { createLogger } from '@/lib/prod-logger';
 *   const logger = createLogger(request);
 *   logger.logInfo('Upload started', { fileSize: 1024 });
 *   logger.logError('Processing failed', { error: err.message });
 */

import { NextRequest } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  route: string;
  message: string;
  meta?: Record<string, unknown>;
}

interface LogMeta {
  [key: string]: unknown;
}

// Check if logging is enabled
function isLoggingEnabled(): boolean {
  // Always log errors in production
  // For info/warn, check ENABLE_PROD_LOGS
  const isProd = process.env.NODE_ENV === 'production';
  const enableProdLogs = process.env.ENABLE_PROD_LOGS === 'true';
  
  // In development, always log
  if (!isProd) return true;
  
  // In production, only log if ENABLE_PROD_LOGS=true
  return enableProdLogs;
}

// Extract route from request URL
function extractRoute(request?: NextRequest | Request | null): string {
  if (!request?.url) return 'unknown';
  
  try {
    const url = new URL(request.url);
    return url.pathname;
  } catch {
    return 'unknown';
  }
}

// Format log entry as JSON
function formatLogEntry(
  level: LogLevel,
  message: string,
  route: string,
  meta?: LogMeta
): LogEntry {
  return {
    level,
    timestamp: new Date().toISOString(),
    route,
    message,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  };
}

// Write to /tmp/docai.log (ephemeral on Vercel)
async function writeToFile(entry: LogEntry): Promise<void> {
  try {
    const logPath = path.join('/tmp', 'docai.log');
    const logLine = JSON.stringify(entry) + '\n';
    await fs.promises.appendFile(logPath, logLine, 'utf8');
  } catch {
    // Silently fail if file write fails (e.g., read-only filesystem)
  }
}
// Core log function
function log(
  level: LogLevel,
  message: string,
  route: string,
  meta?: LogMeta
): void {
  // Always log errors, check flag for info/warn
  const shouldLog = level === 'error' || isLoggingEnabled();
  if (!shouldLog) return;
  
  const entry = formatLogEntry(level, message, route, meta);
  const jsonLog = JSON.stringify(entry);
  
  // Log to console (Vercel captures this)
  switch (level) {
    case 'error':
      console.error(jsonLog);
      break;
    case 'warn':
      console.warn(jsonLog);
      break;
    default:
      console.log(jsonLog);
  }
  
  // Write to ephemeral file for debugging (fire-and-forget with error handling)
  void writeToFile(entry).catch(() => {
    // Silently ignore file write errors (already handled in writeToFile)
  });
}

/**
 * Create a logger instance bound to a specific request/route
 * 
 * @param request - NextRequest or Request object (optional)
 * @returns Logger instance with logInfo, logWarn, logError methods
 * 
 * @example
 * // In an API route
 * export async function POST(request: NextRequest) {
 *   const logger = createLogger(request);
 *   logger.logInfo('Request received');
 *   // ... handle request
 * }
 */
export function createLogger(request?: NextRequest | Request | null) {
  const route = extractRoute(request);
  
  return {
    /**
     * Log informational message
     * @param message - Log message
     * @param meta - Optional metadata object
     */
    logInfo(message: string, meta?: LogMeta): void {
      log('info', message, route, meta);
    },
    
    /**
     * Log warning message
     * @param message - Log message
     * @param meta - Optional metadata object
     */
    logWarn(message: string, meta?: LogMeta): void {
      log('warn', message, route, meta);
    },
    
    /**
     * Log error message (always logs, even if ENABLE_PROD_LOGS=false)
     * @param message - Log message
     * @param meta - Optional metadata object
     */
    logError(message: string, meta?: LogMeta): void {
      log('error', message, route, meta);
    },
  };
}

/**
 * Standalone logging functions (use 'unknown' as route)
 * Prefer createLogger(request) when request is available
 */
export function logInfo(message: string, meta?: LogMeta): void {
  log('info', message, 'unknown', meta);
}

export function logWarn(message: string, meta?: LogMeta): void {
  log('warn', message, 'unknown', meta);
}

export function logError(message: string, meta?: LogMeta): void {
  log('error', message, 'unknown', meta);
}

/**
 * ============================================
 * USAGE EXAMPLES
 * ============================================
 * 
 * Example 1: /api/upload route
 * -------------------------------------------
 * import { createLogger } from '@/lib/prod-logger';
 * 
 * export async function POST(request: NextRequest) {
 *   const logger = createLogger(request);
 *   
 *   try {
 *     logger.logInfo('Upload started', { userId: user.id });
 *     
 *     const formData = await request.formData();
 *     const file = formData.get('file') as File;
 *     
 *     logger.logInfo('File received', { 
 *       fileName: file.name, 
 *       fileSize: file.size,
 *       fileType: file.type 
 *     });
 *     
 *     // ... upload logic
 *     
 *     logger.logInfo('Upload complete', { documentId: doc.id });
 *     return NextResponse.json({ success: true });
 *     
 *   } catch (error) {
 *     logger.logError('Upload failed', { 
 *       error: error instanceof Error ? error.message : 'Unknown error',
 *       stack: error instanceof Error ? error.stack : undefined
 *     });
 *     return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
 *   }
 * }
 * 
 * 
 * Example 2: /api/process-document route
 * -------------------------------------------
 * import { createLogger } from '@/lib/prod-logger';
 * 
 * export async function POST(request: NextRequest) {
 *   const logger = createLogger(request);
 *   let text: string | undefined = undefined;
 *   
 *   try {
 *     const { documentId } = await request.json();
 *     logger.logInfo('Processing started', { documentId });
 *     
 *     // Extract text
 *     text = await extractText(document);
 *     logger.logInfo('Text extracted', { 
 *       documentId, 
 *       textLength: text.length 
 *     });
 *     
 *     // Call Gemini
 *     const result = await processWithGemini(text);
 *     logger.logInfo('Gemini processing complete', { 
 *       documentId,
 *       resultKeys: Object.keys(result)
 *     });
 *     
 *     return NextResponse.json({ success: true, data: result });
 *     
 *   } catch (error) {
 *     logger.logError('Gemini processing failed', { 
 *       statusCode: 500,
 *       textLength: text?.length ?? 0,
 *       error: error instanceof Error ? error.message : 'Unknown error'
 *     });
 *     return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
 *   }
 * }
 * 
 * 
 * Example 3: Standalone logging (no request context)
 * -------------------------------------------
 * import { logError, logInfo } from '@/lib/prod-logger';
 * 
 * // In a utility function
 * function processData(data: unknown) {
 *   logInfo('Processing data', { dataType: typeof data });
 *   
 *   if (!data) {
 *     logError('No data provided');
 *     throw new Error('No data');
 *   }
 * }
 * 
 * 
 * Environment Variables:
 * -------------------------------------------
 * ENABLE_PROD_LOGS=true   # Enable info/warn logs in production
 * 
 * Note: Errors are ALWAYS logged regardless of this flag
 */
