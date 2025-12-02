/**
 * Supabase Admin Client (Server-Side Only)
 * 
 * Centralized, hardened Supabase admin client with:
 * - Runtime environment validation
 * - Build-phase safety
 * - Typed error handling
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ServerEnv, isBuildPhase } from './safeEnv';

let _adminClientCache: SupabaseClient | null = null;

/**
 * Create Supabase admin client with service role key.
 * Safe for server-side API routes only.
 * 
 * @throws {EnvError} If required environment variables are missing
 */
export function createSupabaseAdmin(): SupabaseClient {
  // Return cached instance if available
  if (_adminClientCache) {
    return _adminClientCache;
  }

  // During build phase, return a mock (prevents build failures)
  if (isBuildPhase()) {
    throw new Error('Cannot create Supabase client during build phase');
  }

  // Validate and get environment variables
  const supabaseUrl = ServerEnv.supabaseUrl;
  const serviceRoleKey = ServerEnv.supabaseServiceRoleKey;

  // Create admin client with service role key
  _adminClientCache = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClientCache;
}

/**
 * Alias for backward compatibility.
 */
export const createAdminClient = createSupabaseAdmin;

/**
 * Get cached admin client (throws if not initialized).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_adminClientCache) {
    return createSupabaseAdmin();
  }
  return _adminClientCache;
}

/**
 * Reset admin client cache (useful for testing).
 */
export function resetAdminClient(): void {
  _adminClientCache = null;
}

// Re-export types for convenience
export type { SupabaseClient } from '@supabase/supabase-js';
