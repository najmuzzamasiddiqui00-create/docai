/**
 * Simple In-Memory Rate Limiter
 * 
 * For production, use Redis/Upstash for distributed rate limiting.
 * This implementation is suitable for single-instance deployments.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (reset on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Default limits for different endpoints
export const RATE_LIMITS = {
  // Strict limit for uploads (prevent abuse)
  upload: { windowMs: 60000, maxRequests: 10 },
  
  // Moderate limit for processing
  process: { windowMs: 60000, maxRequests: 20 },
  
  // Higher limit for reads
  read: { windowMs: 60000, maxRequests: 100 },
  
  // Very strict for auth-related
  auth: { windowMs: 300000, maxRequests: 10 },
  
  // Default
  default: { windowMs: 60000, maxRequests: 60 },
} as const;

/**
 * Check rate limit for an identifier (e.g., userId or IP)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.default
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitStore.get(key);
  
  // Create new entry or reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }
  
  // Increment count
  entry.count++;
  
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  
  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
    retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  return headers;
}

/**
 * Get client identifier for rate limiting (prefer userId, fallback to IP)
 */
export function getRateLimitKey(
  userId: string | null,
  ip: string | null,
  endpoint: string
): string {
  const identifier = userId || ip || 'anonymous';
  return `${endpoint}:${identifier}`;
}
