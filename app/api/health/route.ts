/**
 * Health Check API Route
 * 
 * Validates environment configuration and service health.
 * Safe for production - doesn't expose secret values.
 */

import { NextResponse } from 'next/server';
import { validateServerEnv, isBuildPhase } from '@/lib/safeEnv';
import { checkGeminiHealth } from '@/lib/geminiClient';

export async function GET() {
  try {
    // Skip during build
    if (isBuildPhase()) {
      return NextResponse.json({ 
        status: 'build-phase',
        message: 'Skipping health check during build'
      });
    }

    // Validate environment
    const { valid, missing } = validateServerEnv();
    
    // Check Gemini API
    const geminiHealth = await checkGeminiHealth();

    const response = {
      status: valid && geminiHealth.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {
        environment: {
          status: valid ? 'ok' : 'error',
          missing: valid ? undefined : missing,
        },
        gemini: {
          status: geminiHealth.healthy ? 'ok' : 'error',
          error: geminiHealth.error,
        },
        supabase: {
          status: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'error',
        },
        clerk: {
          status: process.env.CLERK_SECRET_KEY ? 'ok' : 'error',
        },
        razorpay: {
          status: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? 'ok' : 'error',
        },
      },
    };

    return NextResponse.json(response, {
      status: response.status === 'healthy' ? 200 : 503,
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Health check failed',
    }, { status: 500 });
  }
}
