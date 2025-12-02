/**
 * Supabase Client Wrappers
 * 
 * Re-exports runtime-safe clients from /lib/runtime.ts
 * Maintains backward compatibility with existing imports.
 * 
 * ZERO top-level initialization - all clients created at request time.
 */

export {
  getSupabaseClient as createClient,
  getSupabaseAdminClient as createAdminClient,
  getSupabaseClient,
  getSupabaseAdminClient,
  isBuildPhase,
  RuntimeError,
} from './runtime';

export type { SupabaseClient } from '@supabase/supabase-js';
