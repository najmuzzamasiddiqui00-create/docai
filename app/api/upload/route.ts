import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdminClient, isBuildPhase, handleRuntimeError } from '@/lib/runtime';
import { checkUserCredits, incrementCreditUsage } from '@/lib/credits';
import { checkRateLimit, RATE_LIMITS, rateLimitHeaders, getRateLimitKey } from '@/lib/rateLimit';
import { postToN8n } from '@/lib/postToN8n';
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
 * INSTANT UPLOAD ROUTE - Internal Processing Pipeline
 * 
 * This route ONLY:
 * 1. Authenticates user with Clerk
 * 2. Checks credit limits (server-side enforcement)
 * 3. Uploads file to Supabase Storage
 * 4. Creates document record with status="queued"
 * 5. Returns documentId immediately
 * 
 * Processing is triggered by frontend calling /api/process-document
 * In-app internal analysis pipeline powered by gemini-1.5-pro
 */
export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    // Skip during build phase
    if (isBuildPhase()) {
      return Response.json({ message: 'Skip during build' });
    }

    console.log('\n🚀 === UPLOAD REQUEST STARTED ===');
    console.log('⏰ Timestamp:', new Date().toISOString());

    // 1. Authentication check
    console.log('\n👤 Step 1: Authentication');
    const { userId } = await auth();
    
    if (!userId) {
      console.log('❌ No userId - Unauthorized request');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`✅ User authenticated: ${userId}`);

    // 1.5 Rate limiting check
    console.log('\n🚦 Step 1.5: Rate Limit Check');
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 
               headersList.get('x-real-ip') || 
               'unknown';
    const rateLimitKey = getRateLimitKey(userId, ip, 'upload');
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.upload);
    
    if (!rateLimit.allowed) {
      console.log(`❌ Rate limit exceeded for ${rateLimitKey}`);
      return Response.json(
        { error: 'Too many requests. Please wait before uploading again.', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }
    console.log(`✅ Rate limit OK: ${rateLimit.remaining} requests remaining`);

    // 2. Check credit limits
    console.log('\n💳 Step 2: Credit Check');
    let creditCheck;
    try {
      creditCheck = await checkUserCredits(userId);
      console.log('   Credit check result:', creditCheck);
    } catch (creditError: any) {
      console.error('❌ Credit check failed:', creditError.message);
      console.error('   Allowing upload despite credit check failure');
      // Allow upload even if credit check fails
      creditCheck = {
        allowed: true,
        creditsRemaining: FREE_CREDIT_LIMIT,
        requiresSubscription: false,
      };
    }
    
    if (!creditCheck.allowed) {
      console.log(`❌ Credit limit reached: ${creditCheck.reason}`);
      return Response.json(
        { error: creditCheck.reason || 'Credit limit reached', requiresSubscription: true },
        { status: 403 }
      );
    }

    console.log(`✅ Credits available: ${creditCheck.creditsRemaining}`);

    // 3. Parse and validate file
    console.log('\n📄 Step 3: Parse FormData');
    let formData;
    try {
      formData = await req.formData();
      console.log('   FormData parsed successfully');
      console.log('   FormData entries:', Array.from(formData.keys()));
    } catch (formDataError: any) {
      console.error('❌ Failed to parse FormData:', formDataError.message);
      return Response.json({ error: 'Invalid form data' }, { status: 400 });
    }
    
    const file = formData.get('file') as File;

    if (!file) {
      console.error('❌ No file in FormData');
      console.error('   Available keys:', Array.from(formData.keys()));
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }
    
    console.log('   File found:', file.name);
    console.log('   File size:', file.size, 'bytes');
    console.log('   File type:', file.type);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.log(`❌ File too large: ${file.size} bytes (max: ${MAX_FILE_SIZE})`);
      return Response.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.log(`❌ Unsupported file type: ${file.type}`);
      console.log('   Allowed types:', ALLOWED_TYPES);
      return Response.json({ error: 'File type not supported' }, { status: 400 });
    }

    console.log(`✅ File validated: ${file.name} (${file.size} bytes, ${file.type})`);

    // 4. Upload to Supabase Storage
    console.log('\n📤 Step 4: Upload to Supabase Storage');
    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
      console.log('   ArrayBuffer created:', arrayBuffer.byteLength, 'bytes');
    } catch (bufferError: any) {
      console.error('❌ Failed to create ArrayBuffer:', bufferError.message);
      return Response.json({ error: 'Failed to read file' }, { status: 500 });
    }
    
    const buffer = Buffer.from(arrayBuffer);
    console.log('   Buffer created:', buffer.length, 'bytes');

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${userId}/${timestamp}_${sanitizedFileName}`;
    
    console.log('   Uploading to bucket: documents');
    console.log('   File path:', filePath);
    console.log('   Content type:', file.type);

    const supabase = getSupabaseAdminClient();
    let uploadData, uploadError;
    try {
      const uploadResult = await supabase.storage
        .from('documents')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        });
      
      uploadData = uploadResult.data;
      uploadError = uploadResult.error;
      
      console.log('   Upload result:', { data: uploadData, error: uploadError });
    } catch (storageError: any) {
      console.error('❌ Storage upload exception:', storageError.message);
      console.error('   Error details:', storageError);
      return Response.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    if (uploadError || !uploadData) {
      console.error('❌ Storage upload failed:', uploadError);
      console.error('   Error message:', uploadError?.message);
      return Response.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    console.log(`✅ File uploaded to storage: ${uploadData.path}`);

    // Get public URL
    console.log('\n🔗 Step 5: Generate Public URL');
    let publicUrl;
    try {
      const urlResult = supabase.storage
        .from('documents')
        .getPublicUrl(uploadData.path);
      
      publicUrl = urlResult.data.publicUrl;
      console.log('   Public URL generated:', publicUrl);
    } catch (urlError: any) {
      console.error('❌ Failed to generate public URL:', urlError.message);
      // Continue anyway - URL generation shouldn't fail
      publicUrl = `https://dqqpzdgpolmghqkxumqz.supabase.co/storage/v1/object/public/documents/${uploadData.path}`;
      console.log('   Using fallback URL:', publicUrl);
    }

    // 6. Create document record with status="queued"
    console.log('\n💾 Step 6: Insert Document Record');
    console.log('   Inserting into documents table...');
    
    const documentData = {
      user_id: userId,
      file_name: file.name,
      file_path: uploadData.path,
      file_url: publicUrl,
      file_size: file.size,
      file_type: file.type,
      status: 'queued' as const,
    };
    
    console.log('   Document data:', JSON.stringify(documentData, null, 2));
    
    let document, dbError;
    try {
      const insertResult = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single();
      
      document = insertResult.data;
      dbError = insertResult.error;
      
      console.log('   Insert result:', { data: document, error: dbError });
    } catch (dbException: any) {
      console.error('❌ Database insert exception:', dbException.message);
      console.error('   Error details:', dbException);
      // Clean up uploaded file
      await supabase.storage.from('documents').remove([filePath]);
      return Response.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    if (dbError || !document) {
      console.error('❌ Database insert failed:', dbError);
      console.error('   Error code:', dbError?.code);
      console.error('   Error message:', dbError?.message);
      // Clean up uploaded file
      await supabase.storage.from('documents').remove([filePath]);
      return Response.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    console.log(`✅ Document record created: ${document.id}`);

    // 7. Increment credit usage
    console.log('\n💳 Step 7: Increment Credit Usage');
    try {
      await incrementCreditUsage(userId);
      console.log('   Credit usage incremented');
    } catch (creditError: any) {
      console.error('❌ Failed to increment credit usage:', creditError.message);
      console.error('   Continuing with upload...');
      // Don't fail the upload - credit tracking is not critical
    }

    // 8. Post to N8N webhook (if configured) with retry
    console.log('\n🔗 Step 8: Post to N8N Webhook');
    const n8nResult = await postToN8n({
      documentId: document.id,
      fileUrl: publicUrl,
      userId: userId,
      fileName: file.name,
      fileType: file.type,
    });

    if (!n8nResult.success && process.env.N8N_WEBHOOK_URL) {
      // N8N is configured but failed - mark document as failed
      console.error('❌ N8N webhook failed - marking document as failed');
      await supabase
        .from('documents')
        .update({
          status: 'failed',
          error: `Webhook failed: ${n8nResult.error}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', document.id);
      
      return Response.json({
        success: false,
        error: 'Failed to queue document for processing',
        documentId: document.id,
        document: {
          id: document.id,
          status: 'failed',
          file_name: document.file_name,
          error: n8nResult.error,
        },
      }, { status: 500 });
    }

    console.log('✅ N8N webhook handled (or not configured)');

    const duration = Date.now() - startTime;
    console.log(`\n✅✅✅ === UPLOAD COMPLETED === ✅✅✅`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Document ID: ${document.id}`);
    console.log(`   Status: ${document.status}`);
    console.log(`   File URL: ${publicUrl}`);
    console.log(`   N8N configured: ${!!process.env.N8N_WEBHOOK_URL}`);
    console.log(`   Processing: ${process.env.N8N_WEBHOOK_URL ? 'N8N webhook triggered' : 'Frontend triggers /api/process-document'}`);
    console.log('='.repeat(60) + '\n');

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

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`\n❌❌❌ === UPLOAD FAILED === ❌❌❌`);
    console.error(`   Duration: ${duration}ms`);
    console.error(`   Error name: ${error.name}`);
    console.error(`   Error message: ${error.message}`);
    console.error(`   Error stack:`);
    console.error(error.stack);
    console.error('='.repeat(60) + '\n');
    
    return handleRuntimeError(error);
  }
}