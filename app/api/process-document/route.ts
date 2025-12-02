// Internal Document Processing Route
// NO Edge Functions, NO n8n - Pure Next.js backend processing
// ZERO top-level initialization - all clients created at request time
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdminClient, isBuildPhase, handleRuntimeError } from '@/lib/runtime';
import { extractText } from '@/lib/text-extractor';
import { analyzeTextWithGemini } from '@/lib/gemini';
import { checkRateLimit, RATE_LIMITS, rateLimitHeaders, getRateLimitKey } from '@/lib/rateLimit';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  console.log('\n🔄 === INTERNAL PROCESSING STARTED ===');
  console.log('⏰ Timestamp:', new Date().toISOString());

  let documentId: string | null = null;

  try {
    // Build phase guard
    if (isBuildPhase()) {
      return NextResponse.json({ message: 'Skip during build' });
    }
    
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      console.log('❌ Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limiting
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitKey = getRateLimitKey(userId, ip, 'process');
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.process);
    
    if (!rateLimit.allowed) {
      console.log(`❌ Rate limit exceeded for ${rateLimitKey}`);
      return NextResponse.json(
        { error: 'Too many requests. Please wait.', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }
    
    // Parse request body
    const body = await req.json();
    documentId = body.documentId;

    console.log('📋 Request payload:', { documentId });

    if (!documentId) {
      console.error('❌ Missing documentId');
      return NextResponse.json(
        { error: 'Missing documentId' },
        { status: 400 }
      );
    }

    // ===== STEP 1: Get document from database =====
    console.log('\n📝 Step 1: Fetching document from database...');
    
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      console.error('❌ Document not found:', fetchError?.message);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    console.log('✅ Document found:', document.file_name);
    console.log('   File path:', document.file_path);
    console.log('   File type:', document.file_type);
    console.log('   Current status:', document.status);

    // ===== STEP 2: Update status to processing =====
    console.log('\n📝 Step 2: Updating status to processing...');
    
    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('❌ Failed to update status:', updateError.message);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log('✅ Status updated to processing');

    // ===== STEP 3: Download file from Supabase Storage =====
    console.log('\n📥 Step 3: Downloading file from storage...');
    console.log('   Bucket: documents');
    console.log('   Path:', document.file_path);

    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      console.error('❌ File download failed:', downloadError?.message);
      throw new Error(`File download failed: ${downloadError?.message}`);
    }

    console.log('✅ File downloaded');
    console.log('   Size:', fileData.size, 'bytes');

    // Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    console.log('✅ File buffer created:', fileBuffer.length, 'bytes');

    // ===== STEP 4: Extract text =====
    console.log('\n📄 Step 4: Extracting text from file...');
    
    let extractedText: string;
    try {
      extractedText = await extractText(
        fileBuffer,
        document.file_type,
        document.file_name
      );
      
      console.log('✅ Text extracted');
      console.log('   Length:', extractedText.length, 'characters');
      console.log('   Preview:', extractedText.substring(0, 100).replace(/\n/g, ' '));

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from file');
      }
    } catch (extractError: any) {
      console.error('❌ Text extraction error:', extractError.message);
      throw new Error(`Text extraction failed: ${extractError.message}`);
    }

    // ===== STEP 5: Analyze with Gemini =====
    console.log('\n🤖 Step 5: Analyzing with Gemini...');
    
    let analysisResult;
    try {
      analysisResult = await analyzeTextWithGemini(extractedText);
      
      console.log('✅ Gemini analysis complete');
      console.log('   Summary:', analysisResult.summary.substring(0, 100));
      console.log('   Key points:', analysisResult.keyPoints.length);
      console.log('   Keywords:', analysisResult.keywords.length);
    } catch (geminiError: any) {
      console.error('❌ Gemini analysis error:', geminiError.message);
      throw new Error(`AI analysis failed: ${geminiError.message}`);
    }

    // Add extracted text to result
    const processedOutput = {
      ...analysisResult,
      extracted_text: extractedText.substring(0, 10000), // Store first 10k chars
    };

    // ===== STEP 6: Save results to database =====
    console.log('\n💾 Step 6: Saving results to database...');
    
    const { error: saveError } = await supabaseAdmin
      .from('documents')
      .update({
        status: 'completed',
        processed_output: processedOutput,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error: null,
      })
      .eq('id', documentId);

    if (saveError) {
      console.error('❌ Failed to save results:', saveError.message);
      throw new Error(`Failed to save results: ${saveError.message}`);
    }

    console.log('✅ Results saved to database');

    console.log('\n✅✅✅ === PROCESSING COMPLETE === ✅✅✅');
    console.log('   Document ID:', documentId);
    console.log('   Status: completed');
    console.log('   Summary length:', processedOutput.summary.length);
    console.log('   Key points:', processedOutput.keyPoints.length);
    console.log('   Keywords:', processedOutput.keywords.length);

    return NextResponse.json({
      success: true,
      documentId,
      status: 'completed',
      processed_output: processedOutput,
    });

  } catch (error: any) {
    console.error('\n❌❌❌ === PROCESSING FAILED === ❌❌❌');
    console.error('   Error name:', error.name);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack?.substring(0, 500));

    // Update document to failed status
    if (documentId) {
      console.log('\n🔄 Updating document status to failed...');
      try {
        const supabaseAdmin = getSupabaseAdminClient();
        await supabaseAdmin
          .from('documents')
          .update({
            status: 'failed',
            error: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId);
        
        console.log('✅ Document marked as failed');
      } catch (updateError: any) {
        console.error('⚠️ Could not update failed status:', updateError.message);
      }
    }

    // Return JSON error (never HTML)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Processing failed',
        documentId,
      },
      { status: 500 }
    );
  }
}
