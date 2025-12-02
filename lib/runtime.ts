/**
 * Runtime-Safe Client Initialization
 * 
 * DEPRECATED: This file is maintained for backward compatibility.
 * New code should import from:
 *   - @/lib/supabase for Supabase clients (getAdminClient, createClient, etc.)
 *   - @/lib/logger for logging
 *   - @/lib/gemini for AI analysis
 * 
 * All clients are created at REQUEST TIME ONLY - never at module load time.
 * This prevents Vercel build-phase failures when environment variables
 * are not available during static page generation.
 */

import Razorpay from 'razorpay';

// Re-export everything from lib/supabase for backward compatibility
export {
  isBuildPhase,
  RuntimeError,
  createClient,
  createAdminClient,
  getAdminClient,
  getSupabaseClient,
  getSupabaseAdminClient,
  type SupabaseClient,
} from './supabase';

// Import RuntimeError and resetClients for use in this file
import { RuntimeError, isBuildPhase, resetClients as resetSupabaseClients } from './supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface GeminiClient {
  apiKey: string;
  generateContent: (prompt: string) => Promise<GeminiResponse>;
}

export interface GeminiResponse {
  text: string;
  raw: any;
}

// ============================================================================
// HELPER: handleRuntimeError
// ============================================================================

/**
 * Helper to handle RuntimeError in API routes.
 * Returns a clean JSON response for client.
 */
export function handleRuntimeError(error: unknown): Response {
  if (error instanceof RuntimeError) {
    console.error(`[RuntimeError] ${error.code}: ${error.message}`);
    return Response.json(
      { error: error.message, code: error.code },
      { status: 500 }
    );
  }

  if (error instanceof Error) {
    console.error(`[Error] ${error.message}`);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }

  console.error('[UnknownError]', error);
  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

// ============================================================================
// GEMINI AI CLIENT
// ============================================================================

let _geminiApiKey: string | null = null;

/**
 * Get Gemini API client.
 * Uses REST API directly - no SDK required.
 * 
 * @deprecated Use analyzeDocument/analyzeText from @/lib/gemini instead
 * @throws RuntimeError if GEMINI_API_KEY missing
 */
export function getGeminiClient(): GeminiClient {
  if (isBuildPhase()) {
    throw new RuntimeError('GeminiClient cannot be initialized during build phase', 'BUILD_PHASE_ERROR');
  }

  // Get and cache API key
  if (!_geminiApiKey) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new RuntimeError(
        'Gemini API Key missing',
        'GEMINI_API_KEY_MISSING',
        ['GEMINI_API_KEY']
      );
    }
    _geminiApiKey = apiKey;
  }

  return {
    apiKey: _geminiApiKey,
    generateContent: async (prompt: string): Promise<GeminiResponse> => {
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${_geminiApiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new RuntimeError(
          `Gemini API error: ${response.status} - ${errText.substring(0, 200)}`,
          'GEMINI_API_ERROR'
        );
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return { text, raw: data };
    },
  };
}

/**
 * Get just the Gemini API key (for custom requests).
 * 
 * @deprecated Use analyzeDocument/analyzeText from @/lib/gemini instead
 * @throws RuntimeError if GEMINI_API_KEY missing
 */
export function getGeminiApiKey(): string {
  if (isBuildPhase()) {
    throw new RuntimeError('GeminiApiKey cannot be accessed during build phase', 'BUILD_PHASE_ERROR');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new RuntimeError(
      'Gemini API Key missing',
      'GEMINI_API_KEY_MISSING',
      ['GEMINI_API_KEY']
    );
  }
  return apiKey;
}

// ============================================================================
// RAZORPAY CLIENT
// ============================================================================

let _razorpayClient: Razorpay | null = null;

/**
 * Get Razorpay client.
 * SERVER-SIDE ONLY.
 * 
 * @throws RuntimeError if RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing
 */
export function getRazorpayClient(): Razorpay {
  if (isBuildPhase()) {
    throw new RuntimeError('RazorpayClient cannot be initialized during build phase', 'BUILD_PHASE_ERROR');
  }

  // Return cached instance
  if (_razorpayClient) {
    return _razorpayClient;
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  const missing: string[] = [];
  if (!keyId) missing.push('RAZORPAY_KEY_ID');
  if (!keySecret) missing.push('RAZORPAY_KEY_SECRET');

  if (missing.length > 0) {
    throw new RuntimeError(
      'Razorpay credentials missing',
      'RAZORPAY_KEYS_MISSING',
      missing
    );
  }

  _razorpayClient = new Razorpay({
    key_id: keyId!,
    key_secret: keySecret!,
  });

  return _razorpayClient;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Reset all cached clients (for testing).
 * Clears Supabase, Gemini, and Razorpay cached instances.
 */
export function resetAllClients(): void {
  resetSupabaseClients();
  _geminiApiKey = null;
  _razorpayClient = null;
}

/**
 * Validate all environment variables without creating clients.
 * Returns missing variables or empty array if all present.
 */
export function validateEnvVars(): string[] {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
  ];

  return required.filter(key => !process.env[key]);
}
