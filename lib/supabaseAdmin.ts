/**
 * Supabase Admin Client (Server-Side Only)
 * 
 * Re-exports runtime-safe admin client from /lib/runtime.ts
 * Maintains backward compatibility with existing imports.
 * 
 * ZERO top-level initialization - all clients created at request time.
 */

export {
  getSupabaseAdminClient as createSupabaseAdmin,
  getSupabaseAdminClient as createAdminClient,
  getSupabaseAdminClient as getSupabaseAdmin,
  getSupabaseAdminClient,
  isBuildPhase,
  RuntimeError,
} from './runtime';

export type { SupabaseClient } from '@supabase/supabase-js';
