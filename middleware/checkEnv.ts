/**
 * Environment Check Middleware for API Routes
 * 
 * Validates required environment variables before processing requests.
 * Returns safe error responses if configuration is missing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEnvVars, isBuildPhase } from '@/lib/runtime';

/**
 * Middleware to check environment variables before route execution.
 * Use this wrapper for API routes that require external services.
 * 
 * @example
 * export const POST = withEnvCheck(async (req: NextRequest) => {
 *   // Your route logic here
 * });
 */
export function withEnvCheck(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Skip check during build phase
      if (isBuildPhase()) {
        return NextResponse.json({ message: 'Build phase - skipped' });
      }

      // Validate environment
      const missing = validateEnvVars();
      
      if (missing.length > 0) {
        console.error('[EnvCheck] Missing environment variables:', missing);
        return NextResponse.json(
          {
            error: 'Server configuration error',
            message: 'Required service configuration is missing. Please contact support.',
            code: 'CONFIG_ERROR',
          },
          { status: 503 }
        );
      }

      // Execute route handler
      return await handler(req);
    } catch (error: any) {
      console.error('[EnvCheck] Error:', error.message);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Check specific environment variables required for a route.
 */
export function requireEnvs(...keys: string[]) {
  return function (
    handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
  ) {
    return async (req: NextRequest): Promise<NextResponse> => {
      try {
        // Skip during build
        if (isBuildPhase()) {
          return NextResponse.json({ message: 'Build phase - skipped' });
        }

        // Check specific keys
        const missing = keys.filter(k => !process.env[k]);
        if (missing.length > 0) {
          console.error('[EnvCheck] Missing required vars:', missing);
          return NextResponse.json(
            {
              error: 'Server configuration error',
              message: 'Service temporarily unavailable',
              code: 'CONFIG_ERROR',
            },
            { status: 503 }
          );
        }

        return await handler(req);
      } catch (error: any) {
        console.error('[EnvCheck] Error:', error.message);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Health check endpoint to verify environment configuration.
 */
export function createHealthCheck() {
  return async (): Promise<NextResponse> => {
    if (isBuildPhase()) {
      return NextResponse.json({ status: 'build-phase' });
    }

    const missing = validateEnvVars();
    const valid = missing.length === 0;
    
    return NextResponse.json({
      status: valid ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      missingVars: valid ? undefined : missing,
    }, {
      status: valid ? 200 : 503,
    });
  };
}
