import { auth } from '@clerk/nextjs/server';
import { getAdminClient, isBuildPhase } from '@/lib/supabase';
import { checkUserCredits, incrementCreditUsage } from '@/lib/credits';
import { checkRateLimit, RATE_LIMITS, rateLimitHeaders, getRateLimitKey } from '@/lib/rateLimit';
import { createRequestLogger, logAndSanitize } from '@/lib/logger';
import { headers } from 'next/headers';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const FREE_CREDIT_LIMIT = 5; // Default free credits
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/rtf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Fire-and-forget enqueue processing with 3 retries
 * Does not block upload response
 */
async function safeEnqueueProcessing(documentId: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL 
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');  
  const url = `${baseUrl}/api/process-document`;
  const body = JSON.stringify({ documentId });
  
  // Try 3 times with exponential backoff
  for (let i = 0; i < 3; i++) {
    try {
      // Use keepalive to ensure request completes even if response is ignored
      await fetch(url, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        // Short timeout - we don't wait for processing to complete
        signal: AbortSignal.timeout(5000),
      });
      // Request sent successfully, exit loop
      return;
    } catch {
      // Wait before retry with exponential backoff
      if (i < 2) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
  }
  // All retries failed - document will stay in 'queued' status
  // User can retry from UI
}

/**
 * INSTANT UPLOAD ROUTE - Internal Processing Pipeline
 * 
 * This route:
 * 1. Authenticates user with Clerk
 * 2. Checks credit limits (server-side enforcement)
 * 3. Uploads file to Supabase Storage
 * 4. Creates document record with status="queued"
 * 5. Enqueues processing (fire-and-forget)
 * 6. Returns documentId immediately
 */
export async function POST(req: Request) {
  const startTime = Date.now();
  const log = createRequestLogger('upload');
  
  try {
    // Skip during build phase
    if (isBuildPhase()) {
      return Response.json({ message: 'Skip during build' });
    }

    log.info('Upload request started');

    // 1. Authentication check
    const { userId } = await auth();
    
    if (!userId) {
      log.warn('Unauthorized upload attempt');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    log.info('User authenticated', { userId });

    // 1.5 Rate limiting check
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 
               headersList.get('x-real-ip') || 
               'unknown';
    const rateLimitKey = getRateLimitKey(userId, ip, 'upload');
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.upload);
    
    if (!rateLimit.allowed) {
      log.warn('Rate limit exceeded', { userId, remaining: rateLimit.remaining });
      return Response.json(
        { error: 'Too many requests. Please wait before uploading again.', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    // 2. Check credit limits
    let creditCheck;
    try {
      creditCheck = await checkUserCredits(userId);
    } catch (creditError) {
      log.warn('Credit check failed, allowing upload', { 
        error: creditError instanceof Error ? creditError.message : 'Unknown' 
      });
      creditCheck = {
        allowed: true,
        creditsRemaining: FREE_CREDIT_LIMIT,
        requiresSubscription: false,
      };
    }
    
    if (!creditCheck.allowed) {
      log.info('Credit limit reached', { userId, reason: creditCheck.reason });
      return Response.json(
        { error: creditCheck.reason || 'Credit limit reached', requiresSubscription: true },
        { status: 403 }
      );
    }

    // 3. Parse and validate file
    let formData;
    try {
      formData = await req.formData();
    } catch (formDataError) {
      log.error('Failed to parse FormData', { 
        error: formDataError instanceof Error ? formDataError.message : 'Unknown' 
      });
      return Response.json({ error: 'Invalid form data' }, { status: 400 });
    }
    
    const file = formData.get('file') as File;

    if (!file) {
      log.warn('No file in FormData');
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      log.warn('File too large', { size: file.size, max: MAX_FILE_SIZE });
      return Response.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      log.warn('Unsupported file type', { type: file.type });
      return Response.json({ error: 'File type not supported' }, { status: 400 });
    }

    log.info('File validated', { name: file.name, size: file.size, type: file.type });

    // 4. Upload to Supabase Storage
    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (bufferError) {
      log.error('Failed to read file buffer');
      return Response.json({ error: 'Failed to read file' }, { status: 500 });
    }
    
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${userId}/${timestamp}_${sanitizedFileName}`;

    const supabase = getAdminClient();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError || !uploadData) {
      log.error('Storage upload failed', { error: uploadError?.message });
      return Response.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    log.info('File uploaded to storage', { path: uploadData.path });

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(uploadData.path);
    
    const publicUrl = urlData.publicUrl;

    // 5. Create document record with status="queued"
    const documentData = {
      user_id: userId,
      file_name: file.name,
      file_path: uploadData.path,
      file_url: publicUrl,
      file_size: file.size,
      file_type: file.type,
      status: 'queued' as const,
    };
    
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single();

    if (dbError || !document) {
      log.error('Database insert failed', { error: dbError?.message });
      // Clean up uploaded file
      await supabase.storage.from('documents').remove([filePath]);
      return Response.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    log.info('Document record created', { documentId: document.id });

    // 6. Increment credit usage
    try {
      await incrementCreditUsage(userId);
    } catch (creditError) {
      log.warn('Failed to increment credit usage', { 
        error: creditError instanceof Error ? creditError.message : 'Unknown' 
      });
      // Don't fail the upload - credit tracking is not critical
    }

    // 7. Fire-and-forget: Enqueue processing
    // This does NOT block the upload response
    void safeEnqueueProcessing(document.id);

    const duration = Date.now() - startTime;
    log.info('Upload completed', { documentId: document.id, durationMs: duration });

    // Return immediately with documentId
    return Response.json({
      success: true,
      documentId: document.id,
      document: {
        id: document.id,
        status: document.status,
        file_name: document.file_name,
        file_url: publicUrl,
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const safeMessage = logAndSanitize(log, error, 'upload');
    log.error('Upload failed', { durationMs: duration });
    
    return Response.json(
      { error: safeMessage },
      { status: 500 }
    );
  }
}