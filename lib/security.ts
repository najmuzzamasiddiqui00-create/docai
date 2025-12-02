/**
 * Security Utilities
 * 
 * Centralized security helpers for:
 * - Request validation
 * - Rate limiting (preparation)
 * - Safe error responses
 * - Audit logging
 */

import { NextResponse } from 'next/server';
import { EnvError } from './safeEnv';

/**
 * Safe error response that never leaks sensitive information.
 */
export function safeErrorResponse(
  error: unknown,
  statusCode: number = 500
): NextResponse {
  // Log full error server-side
  console.error('[Security] Error occurred:', error);

  // Return sanitized error to client
  if (error instanceof EnvError) {
    return NextResponse.json(
      {
        error: 'Server configuration error',
        message: 'Required service configuration is missing. Please contact support.',
        code: 'CONFIG_ERROR',
      },
      { status: 503 } // Service Unavailable
    );
  }

  if (error instanceof Error) {
    // Never expose internal error messages in production
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: isDev ? error.message : 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
      { status: statusCode }
    );
  }

  return NextResponse.json(
    {
      error: 'Unknown error',
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    },
    { status: statusCode }
  );
}

/**
 * Audit log for security-sensitive operations.
 */
export function auditLog(
  action: string,
  userId: string | null,
  details: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    userId: userId || 'anonymous',
    details,
    ip: details.ip || 'unknown',
  };

  // In production, send to logging service (Datadog, CloudWatch, etc.)
  console.log('[AUDIT]', JSON.stringify(logEntry));

  // TODO: Integrate with your logging service
  // await logService.send(logEntry);
}

/**
 * Mask sensitive data for logging (keeps last 4 chars).
 */
export function maskSecret(secret: string, visibleChars: number = 4): string {
  if (!secret || secret.length <= visibleChars) {
    return '***';
  }
  return '***' + secret.slice(-visibleChars);
}

/**
 * Validate webhook signature generically.
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Implement based on your webhook provider's signature algorithm
  // This is a placeholder - actual implementation depends on provider
  return signature.length > 0 && secret.length > 0;
}

/**
 * Check if request is from allowed origin (CORS helper).
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);

  return allowedOrigins.includes(origin);
}

/**
 * Rate limiting preparation (integrate with Upstash or similar).
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number }> {
  // TODO: Integrate with Redis/Upstash for distributed rate limiting
  // For now, return allowed (implement before production)
  
  return {
    allowed: true,
    remaining: limit,
  };
}

/**
 * Sanitize user input to prevent injection attacks.
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
}

/**
 * Generate secure random token for CSRF or similar.
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  
  return result;
}

/**
 * Check if environment is production.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Security headers for API responses.
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
} as const;

/**
 * Add security headers to a response.
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
