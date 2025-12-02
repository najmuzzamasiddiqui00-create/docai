import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/razorpay',
  '/api/webhooks/clerk',
  '/api/health',
  '/api/process-document', // Internal API - has its own auth
]);

export default clerkMiddleware((auth, request) => {
  // Allow public routes without auth
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }
  
  // Protect all other routes - auth() returns the auth object
  const { userId } = auth();
  
  if (!userId) {
    const url = new URL(request.url);
    // For API routes, return 401
    if (url.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // For pages, redirect to sign-in
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
