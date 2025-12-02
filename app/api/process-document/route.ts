/**
 * Internal Document Processing Route
 * 
 * NO Edge Functions, NO n8n - Pure Next.js backend processing
 * ZERO top-level initialization - all clients created at request time
 * 
 * Flow:
 * 1. Receive documentId from upload route (or retry)
 * 2. Update status to 'processing'
 * 3. Download file from Supabase Storage
 * 4. Extract text (pdf-parse, mammoth, or plain text)
 * 5. Analyze with AI (Gemini primary, OpenAI fallback)
 * 6. Save results and update status to 'completed' or 'failed'
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAdminClient, isBuildPhase } from '@/lib/supabase';
import { extractText } from '@/lib/text-extractor';
import { analyzeText } from '@/lib/gemini';
import { createRequestLogger, logAndSanitize } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS, rateLimitHeaders, getRateLimitKey } from '@/lib/rateLimit';
import { headers } from 'next/headers';

// Maximum text to store in database
const MAX_STORED_TEXT = 10000;

/**
 * Verify internal API secret for server-to-server calls
 * Returns true if valid, false otherwise
 */
function verifyInternalAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  const internalSecret = process.env.INTERNAL_API_SECRET;
  
  if (!internalSecret) {
    console.error('[process-document] INTERNAL_API_SECRET not configured');
    return false;
  }
  
  return token === internalSecret;
}

export async function POST(req: NextRequest) {
  let documentId: string | null = null;
  const log = createRequestLogger('process-document');

  try {
    // Build phase guard
    if (isBuildPhase()) {
      return NextResponse.json({ message: 'Skip during build' });
    }
    
    log.info('Processing request received');
    
    // Check for internal API auth (server-to-server) OR user auth (manual retry)
    const isInternalCall = verifyInternalAuth(req);
    const { userId } = await auth();
    
    if (!isInternalCall && !userId) {
      log.warn('Unauthorized processing request - no internal auth or user session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Log auth method for debugging
    log.info('Request authenticated', { 
      method: isInternalCall ? 'internal-api' : 'user-session',
      userId: userId || 'internal'
    });
    
    // Rate limiting
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitKey = getRateLimitKey(userId, ip, 'process');
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.process);
    
    if (!rateLimit.allowed) {
      log.warn('Rate limit exceeded', { userId });
      return NextResponse.json(
        { error: 'Too many requests. Please wait.', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }
    
    // Parse request body
    const body = await req.json();
    documentId = body.documentId;

    if (!documentId) {
      log.warn('Missing documentId in request');
      return NextResponse.json(
        { error: 'Missing documentId' },
        { status: 400 }
      );
    }

    log.info('Processing started', { documentId });

    // ===== STEP 1: Get document from database =====
    const supabaseAdmin = getAdminClient();
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      log.error('Document not found', { documentId, error: fetchError?.message });
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    log.info('Document retrieved', { 
      fileName: document.file_name,
      fileType: document.file_type,
      status: document.status 
    });

    // ===== STEP 2: Update status to processing =====
    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      log.error('Failed to update status', { error: updateError.message });
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    log.info('Status updated to processing');

    // ===== STEP 3: Download file from Supabase Storage =====
    log.info('Downloading file from storage', { path: document.file_path });

    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      log.error('File download failed', { error: downloadError?.message });
      throw new Error(`File download failed: ${downloadError?.message}`);
    }

    // Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    log.info('File downloaded', { sizeBytes: fileBuffer.length });

    // ===== STEP 4: Extract text =====
    log.info('Extracting text from file');
    
    let extractedText: string;
    try {
      extractedText = await extractText(
        fileBuffer,
        document.file_type,
        document.file_name
      );

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from file');
      }
      log.info('Text extracted', { 
        length: extractedText.length
      });    } catch (extractError) {
      log.error('Text extraction error', { 
        error: extractError instanceof Error ? extractError.message : 'Unknown' 
      });
      throw new Error(`Text extraction failed: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`);
    }

    // ===== STEP 5: Analyze with AI =====
    log.info('Starting AI analysis');
    
    let analysisResult;
    try {
      analysisResult = await analyzeText(extractedText);
      
      log.info('AI analysis complete', {
        summaryLength: analysisResult.summary.length,
        keyPointsCount: analysisResult.keyPoints.length,
        keywordsCount: analysisResult.keywords.length,
        category: analysisResult.category,
        sentiment: analysisResult.sentiment
      });
    } catch (aiError) {
      log.error('AI analysis error', { 
        error: aiError instanceof Error ? aiError.message : 'Unknown' 
      });
      throw new Error(`AI analysis failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`);
    }

    // Build processed output with truncated extracted text
    const processedOutput = {
      ...analysisResult,
      extracted_text: extractedText.substring(0, MAX_STORED_TEXT),
    };

    // ===== STEP 6: Save results to database =====
    log.info('Saving results to database');
    
    const { error: saveError } = await supabaseAdmin
      .from('documents')
      .update({
        status: 'completed',
        processed_output: processedOutput,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);
    
    if (saveError) {
      log.error('Failed to save results', { error: saveError.message });
      throw new Error(`Failed to save results: ${saveError.message}`);
    }

    log.info('Processing complete', { documentId, status: 'completed' });

    return NextResponse.json({
      success: true,
      documentId,
      status: 'completed',
      processed_output: processedOutput,
    });

  } catch (error) {
    const safeMessage = logAndSanitize(log, error, 'process-document');

    // Update document to failed status
    if (documentId) {
      log.info('Updating document status to failed', { documentId });
      try {
        const supabaseAdmin = getAdminClient();
        await supabaseAdmin
          .from('documents')
          .update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Processing failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId);
        
        log.info('Document marked as failed');
      } catch (updateError) {
        log.warn('Could not update failed status', { 
          error: updateError instanceof Error ? updateError.message : 'Unknown' 
        });
      }
    }

    // Return JSON error (never HTML)
    return NextResponse.json(
      {
        success: false,
        error: safeMessage,
        documentId,
      },
      { status: 500 }
    );
  }
}
