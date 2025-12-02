/**
 * Health Check API Route
 * 
 * Validates environment configuration and service health.
 * Safe for production - doesn't expose secret values.
 */

import { NextResponse } from 'next/server';
import { isBuildPhase, validateEnvVars } from '@/lib/runtime';

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
    const missingVars = validateEnvVars();
    const envValid = missingVars.length === 0;

    const response = {
      status: envValid ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {
        environment: {
          status: envValid ? 'ok' : 'error',
          missing: envValid ? undefined : missingVars,
        },
        gemini: {
          status: process.env.GEMINI_API_KEY ? 'ok' : 'error',
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
