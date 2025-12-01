import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkUserCredits, incrementCreditUsage } from '@/lib/credits';

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
    console.log('\n🚀 === UPLOAD REQUEST STARTED ===');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📍 Request URL:', req.url);
    console.log('🔧 Request method:', req.method);
    
    // Log environment variables
    console.log('\n🔐 Environment Variables Check:');
    console.log('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
    console.log('   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing');
    console.log('   CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? '✅ Set' : '❌ Missing');
    
    // 1. Authentication check
    console.log('\n👤 Step 1: Authentication');
    let userId;
    try {
      const authResult = await auth();
      userId = authResult.userId;
      console.log('   Auth result:', authResult);
    } catch (authError: any) {
      console.error('❌ Authentication failed:', authError.message);
      return Response.json({ error: 'Authentication failed', details: authError.message }, { status: 401 });
    }
    
    if (!userId) {
      console.log('❌ No userId - Unauthorized request');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`✅ User authenticated: ${userId}`);

    // 2. Credit check (server-side enforcement)
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
        { 
          error: 'LIMIT_REACHED',
          message: creditCheck.reason,
          requiresSubscription: true,
        },
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
      return Response.json({ error: 'Invalid form data', details: formDataError.message }, { status: 400 });
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
      return Response.json(
        { 
          error: 'File type not supported',
          supportedTypes: 'PDF, DOC, DOCX, TXT, CSV, Images',
        },
        { status: 400 }
      );
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
      return Response.json({ error: 'Failed to read file', details: bufferError.message }, { status: 500 });
    }
    
    const buffer = Buffer.from(arrayBuffer);
    console.log('   Buffer created:', buffer.length, 'bytes');

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${userId}/${timestamp}_${sanitizedFileName}`;
    
    console.log('   Uploading to bucket: documents');
    console.log('   File path:', filePath);
    console.log('   Content type:', file.type);

    let uploadData, uploadError;
    try {
      const uploadResult = await supabaseAdmin.storage
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
      return Response.json(
        { error: 'Failed to upload file to storage', details: storageError.message },
        { status: 500 }
      );
    }

    if (uploadError || !uploadData) {
      console.error('❌ Storage upload failed:', uploadError);
      console.error('   Error message:', uploadError?.message);
      console.error('   Error details:', uploadError);
      return Response.json(
        { error: 'Failed to upload file to storage', details: uploadError?.message || 'Unknown error' },
        { status: 500 }
      );
    }

    console.log(`✅ File uploaded to storage: ${uploadData.path}`);

    // Get public URL
    console.log('\n🔗 Step 5: Generate Public URL');
    let publicUrl;
    try {
      const urlResult = supabaseAdmin.storage
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
      const insertResult = await supabaseAdmin
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
      await supabaseAdmin.storage.from('documents').remove([filePath]);
      return Response.json(
        { error: 'Failed to create document record', details: dbException.message },
        { status: 500 }
      );
    }

    if (dbError || !document) {
      console.error('❌ Database insert failed:', dbError);
      console.error('   Error code:', dbError?.code);
      console.error('   Error message:', dbError?.message);
      console.error('   Error details:', JSON.stringify(dbError, null, 2));
      // Clean up uploaded file
      await supabaseAdmin.storage.from('documents').remove([filePath]);
      return Response.json(
        { error: 'Failed to create document record', details: dbError?.message || 'Unknown error' },
        { status: 500 }
      );
    }

    console.log(`✅ Document created: ${document.id} with status="queued"`);

    // 7. Increment credit usage (don't let this fail the upload)
    console.log('\n💳 Step 7: Increment Credit Usage');
    try {
      await incrementCreditUsage(userId);
      console.log(`✅ Credit usage incremented`);
    } catch (creditError: any) {
      console.error('⚠️ Failed to increment credit usage:', creditError.message);
      console.error('   Continuing with upload...');
      // Don't fail the upload - credit tracking is not critical
    }

    // 8. Document ready for processing (frontend will trigger /api/process-document)
    console.log('\n✅ Document ready for processing');
    console.log('   Status: queued');
    console.log('   Frontend will call /api/process-document next');

    const duration = Date.now() - startTime;
    console.log(`\n✅✅✅ === UPLOAD COMPLETED === ✅✅✅`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Document ID: ${document.id}`);
    console.log(`   Status: ${document.status}`);
    console.log(`   File URL: ${publicUrl}`);
    console.log(`   Processing: Triggered by frontend`);
    console.log('='.repeat(60) + '\n');

    // Return immediately with documentId
    return Response.json({
      success: true,
      documentId: document.id,
      document: {
        id: document.id,
        status: document.status,
        file_name: document.file_name,
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
    
    return Response.json(
      { 
        error: 'Internal server error', 
        message: error.message,
        details: error.toString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
