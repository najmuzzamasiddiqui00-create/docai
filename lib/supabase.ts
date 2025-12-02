/**
 * Supabase Client Wrappers
 * 
 * Normalized Supabase initialization for the entire project.
 * ZERO top-level initialization - all clients created at request time.
 * 
 * Usage:
 *   import { createClient, createAdminClient, getAdminClient } from '@/lib/supabase';
 *   
 *   // Public client (anon key) - safe for client-side
 *   const supabase = createClient();
 *   
 *   // Admin client (service role) - server-side only
 *   const admin = createAdminClient();  // Creates new instance
 *   const admin = getAdminClient();     // Returns cached singleton
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// BUILD PHASE DETECTION
// ============================================================================

/**
 * Check if we're in Vercel/Next.js build phase
 */
export function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * Custom error class for runtime configuration errors
 */
export class RuntimeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly missingVars?: string[]
  ) {
    super(message);
    this.name = 'RuntimeError';
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      missingVars: this.missingVars,
    };
  }
}

// ============================================================================
// PUBLIC CLIENT (Anon Key)
// ============================================================================

/**
 * Create a new Supabase public client with anon key.
 * Safe for client-side and server-side use.
 * Creates a new instance each call.
 * 
 * @throws RuntimeError if NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing
 */
export function createClient(): SupabaseClient {
  if (isBuildPhase()) {
    throw new RuntimeError(
      'Supabase client cannot be created during build phase',
      'BUILD_PHASE_ERROR'
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    throw new RuntimeError(
      'Supabase public configuration missing',
      'SUPABASE_PUBLIC_KEYS_MISSING',
      missing
    );
  }

  return createSupabaseClient(url!, anonKey!);
}

// ============================================================================
// ADMIN CLIENT (Service Role Key)
// ============================================================================

// Singleton instance for getAdminClient()
let _adminClientSingleton: SupabaseClient | null = null;

/**
 * Create a new Supabase admin client with service role key.
 * SERVER-SIDE ONLY - never expose to client.
 * Creates a new instance each call.
 * 
 * @throws RuntimeError if NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing
 */
export function createAdminClient(): SupabaseClient {
  if (isBuildPhase()) {
    throw new RuntimeError(
      'Supabase admin client cannot be created during build phase',
      'BUILD_PHASE_ERROR'
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    throw new RuntimeError(
      'Supabase admin configuration missing',
      'SUPABASE_ADMIN_KEYS_MISSING',
      missing
    );
  }

  return createSupabaseClient(url!, serviceKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get the singleton Supabase admin client.
 * SERVER-SIDE ONLY - never expose to client.
 * Returns cached instance (creates on first call).
 * 
 * @throws RuntimeError if NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing
 */
export function getAdminClient(): SupabaseClient {
  if (!_adminClientSingleton) {
    _adminClientSingleton = createAdminClient();
  }
  return _adminClientSingleton;
}

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================================

// Re-export for backward compatibility with existing imports
export const getSupabaseClient = createClient;
export const getSupabaseAdminClient = getAdminClient;

// Export SupabaseClient type
export type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Reset cached clients (for testing purposes only)
 */
export function resetClients(): void {
  _adminClientSingleton = null;
}
