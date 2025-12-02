/**
 * Document Retry Processing Route
 * 
 * Allows users to retry failed document processing.
 * Increments retry_count and processes document inline.
 */

import { auth } from '@clerk/nextjs/server';
import { getAdminClient, isBuildPhase } from '@/lib/supabase';
import { extractText } from '@/lib/text-extractor';
import { analyzeText } from '@/lib/gemini';
import { createRequestLogger, logAndSanitize } from '@/lib/logger';

// Maximum text to store in database
const MAX_STORED_TEXT = 10000;

export async function POST(req: Request) {
  let documentId: string | null = null;
  const log = createRequestLogger('documents/retry');
  
  try {
    // Build phase guard
    if (isBuildPhase()) {
      return Response.json({ message: 'Skip during build' });
    }

    const { userId } = await auth();

    if (!userId) {
      log.warn('Unauthorized retry request');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    documentId = body.documentId;

    if (!documentId) {
      log.warn('Missing documentId in retry request');
      return Response.json({ error: 'Document ID required' }, { status: 400 });
    }

    log.info('Retry processing started', { documentId, userId });

    const supabase = getAdminClient();
    
    // Get document and verify ownership
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !document) {
      log.warn('Document not found for retry', { documentId });
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Update to processing status and increment retry count
    const retryCount = (document.retry_count || 0) + 1;
    const MAX_RETRIES = 3;
    
    if (retryCount > MAX_RETRIES) {
      log.warn('Maximum retry attempts exceeded', { documentId, retryCount });
      return Response.json(
        { error: 'Maximum retry attempts exceeded', retryCount: document.retry_count },
        { status: 429 }
      );
    }
    
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'processing',
        error: null,
        retry_count: retryCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (updateError) {
      log.error('Failed to update status for retry', { error: updateError.message });
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    log.info('Document status set to processing', { retryCount });
    // Download file from storage
    log.info('Downloading file from storage');
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error(`File download failed: ${downloadError?.message}`);
    }

    // Convert to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    log.info('File downloaded', { sizeBytes: fileBuffer.length });

    // Extract text
    log.info('Extracting text');
    const extractedText = await extractText(
      fileBuffer,
      document.file_type,
      document.file_name
    );

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from file');
    }
    log.info('Text extracted', { length: extractedText.length });

    // Analyze with AI
    log.info('Starting AI analysis');
    const analysisResult = await analyzeText(extractedText);
    log.info('AI analysis complete');

    // Prepare processed output
    const processedOutput = {
      ...analysisResult,
      extracted_text: extractedText.substring(0, MAX_STORED_TEXT),
    };

    // Save results
    const { error: saveError } = await supabase
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
      throw new Error(`Failed to save results: ${saveError.message}`);
    }

    log.info('Retry processing complete', { documentId, retryCount });

    return Response.json({
      success: true,
      message: 'Document reprocessed successfully',
      status: 'completed',
      retryCount,
    });

  } catch (error) {
    const safeMessage = logAndSanitize(log, error, 'retry');

    // Update document to failed status
    if (documentId) {
      try {
        const supabase = getAdminClient();
        await supabase
          .from('documents')
          .update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Retry processing failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId);
      } catch (updateError) {
        log.warn('Could not update failed status', { 
          error: updateError instanceof Error ? updateError.message : 'Unknown' 
        });
      }
    }

    return Response.json(
      { error: safeMessage, success: false },
      { status: 500 }
    );
  }
}
