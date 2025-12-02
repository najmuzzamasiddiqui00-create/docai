/**
 * Safe Environment Variable Management
 * 
 * This module provides type-safe, runtime-validated environment variable access.
 * - Prevents build-time failures from missing secrets
 * - Throws clear runtime errors when required vars are missing
 * - Server-side only - never expose secrets to client
 */

export class EnvError extends Error {
  constructor(
    message: string,
    public readonly missingVars: string[]
  ) {
    super(message);
    this.name = 'EnvError';
  }
}

/**
 * Require a single environment variable at runtime.
 * Throws EnvError if missing.
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new EnvError(
      `Missing required environment variable: ${key}`,
      [key]
    );
  }
  return value;
}

/**
 * Assert multiple environment variables are present.
 * Throws EnvError listing all missing vars if any are absent.
 */
export function assertEnvs(keys: string[]): void {
  const missing = keys.filter(k => !process.env[k] || process.env[k]?.trim() === '');
  if (missing.length > 0) {
    throw new EnvError(
      `Missing required environment variables: ${missing.join(', ')}`,
      missing
    );
  }
}

/**
 * Get an optional environment variable with a default fallback.
 */
export function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Type-safe environment variable getters for all services.
 * Use these instead of direct process.env access.
 */
export const ServerEnv = {
  // Clerk
  get clerkSecretKey() {
    return requireEnv('CLERK_SECRET_KEY');
  },
  get webhookSecret() {
    return requireEnv('WEBHOOK_SECRET');
  },

  // Supabase
  get supabaseUrl() {
    return requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  },
  get supabaseServiceRoleKey() {
    return requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  },

  // Gemini AI
  get geminiApiKey() {
    return requireEnv('GEMINI_API_KEY');
  },

  // Razorpay
  get razorpayKeyId() {
    return requireEnv('RAZORPAY_KEY_ID');
  },
  get razorpayKeySecret() {
    return requireEnv('RAZORPAY_KEY_SECRET');
  },

  // App config
  get appUrl() {
    return getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
  },
} as const;

/**
 * Validate all critical server-side environment variables.
 * Call this at server startup or in health check routes.
 */
export function validateServerEnv(): { valid: boolean; missing: string[] } {
  const requiredVars = [
    'CLERK_SECRET_KEY',
    'WEBHOOK_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
  ];

  const missing = requiredVars.filter(
    k => !process.env[k] || process.env[k]?.trim() === ''
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Check if we're in a build phase (prevents build-time errors)
 */
export function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * Safe environment loader for API routes.
 * Returns null during build phase to prevent failures.
 */
export function safeLoadEnv<T>(loader: () => T): T | null {
  if (isBuildPhase()) {
    return null;
  }
  return loader();
}
