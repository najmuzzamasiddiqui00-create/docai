import { supabaseAdmin } from '@/lib/supabase';
import { extractTextFromFile, summarizeText, analyzeDocument } from '@/lib/document-processor';

// Sanitize text to remove problematic Unicode escape sequences
function sanitizeText(text: string): string {
  if (!text) return '';
  
  try {
    // Remove null bytes and other problematic characters
    return text
      .replace(/\0/g, '') // Remove null bytes
      .replace(/\\u0000/g, '') // Remove Unicode null escapes
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
        try {
          return String.fromCharCode(parseInt(hex, 16));
        } catch {
          return '';
        }
      })
      .trim();
  } catch (err) {
    console.error('Error sanitizing text:', err);
    return text.replace(/[^\x20-\x7E\n\r\t]/g, ''); // Fallback: keep only printable ASCII
  }
}

export async function processDocument(documentId: string) {
  const startTime = Date.now();
  
  try {
    console.log(`\n🚀 === PROCESSING STARTED for document ${documentId} ===`);

    // Get document from database
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('❌ Document not found:', docError);
      throw new Error('Document not found');
    }

    console.log(`📄 Document found: ${document.file_name} (${document.file_type}, ${document.file_size} bytes)`);

    // Update status to processing
    const { error: statusError } = await supabaseAdmin
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId);
    
    if (statusError) {
      console.error('⚠️ Failed to update status to processing:', statusError);
    } else {
      console.log('✅ Status updated to "processing"');
    }

    console.log(`📄 Processing document: ${document.file_name} (${document.file_type})`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}`);
    }

    // Convert to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text
    const extractedText = await extractTextFromFile(buffer, document.file_type);

    // Check if this is a file type that doesn't support text extraction
    const isNonTextFile = 
      document.file_type.startsWith('image/') ||
      document.file_type.includes('spreadsheet') ||
      document.file_type.includes('excel') ||
      document.file_type.includes('presentation') ||
      document.file_type.includes('powerpoint') ||
      document.file_type.includes('zip') ||
      document.file_type.includes('rar') ||
      document.file_type.includes('archive') ||
      extractedText.includes('[Image file:') ||
      extractedText.includes('[Spreadsheet file:') ||
      extractedText.includes('[Presentation file:') ||
      extractedText.includes('[Archive file:');

    // Generate summary (skip AI for non-text files to avoid hanging)
    let summary = '';
    if (isNonTextFile) {
      console.log('⚠️ Skipping AI processing for non-text file type:', document.file_type);
      summary = `File uploaded successfully. Type: ${document.file_type}. This file type requires specialized processing for content extraction.`;
    } else if (extractedText.length > 100 && !extractedText.includes('specialized parsing') && !extractedText.includes('Cannot extract')) {
      try {
        console.log('🤖 Starting Gemini AI summary for text-based file...');
        summary = await summarizeText(extractedText);
      } catch (summaryError: any) {
        console.error('⚠️ Summary generation failed:', summaryError);
        console.error('⚠️ Error message:', summaryError.message);
        summary = 'Summary generation failed. Text extraction successful but AI processing encountered an error.';
      }
    } else {
      summary = 'File uploaded successfully. Text content is too short for meaningful summarization.';
    }

    // Analyze document
    const analysis = await analyzeDocument(extractedText);

    // Sanitize all text fields before database insertion
    const sanitizedExtractedText = sanitizeText(extractedText);
    const sanitizedSummary = sanitizeText(summary);

    // Save processed results
    const { error: insertError } = await supabaseAdmin.from('processed_results').insert({
      document_id: documentId,
      user_id: document.user_id,
      extracted_text: sanitizedExtractedText.substring(0, 50000), // Limit size
      summary: sanitizedSummary,
      metadata: analysis,
    });

    if (insertError) {
      console.error('❌ Failed to insert processed results:', insertError);
      console.error('❌ Insert error details:', JSON.stringify(insertError, null, 2));
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    console.log('✅ Processed results saved successfully');

    // Update document status to completed
    console.log(`📝 Updating document ${documentId} status to completed...`);
    const updateData = {
      status: 'completed',
      processed_at: new Date().toISOString(),
    };
    console.log('📝 Update data:', JSON.stringify(updateData, null, 2));

    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update(updateData)
      .eq('id', documentId);

    if (updateError) {
      console.error('❌ Failed to update document status:', updateError);
      console.error('❌ Update error details:', JSON.stringify(updateError, null, 2));
      console.error('❌ Attempted to update columns:', Object.keys(updateData));
      throw new Error(`Status update failed: ${updateError.message}`);
    }

    console.log('✅ Document status updated to completed');

    const duration = Date.now() - startTime;
    console.log(`✅✅✅ Document processed successfully: ${document.file_name}`);
    console.log(`⏱️ Total processing time: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
    console.log(`🎉 === PROCESSING COMPLETED for document ${documentId} ===\n`);

    return {
      success: true,
      message: 'Document processed successfully',
      processingTime: duration,
    };

  } catch (processingError: any) {
    console.error('❌ Processing error:', processingError);

    // Get document to get user_id
    const { data: document } = await supabaseAdmin
      .from('documents')
      .select('user_id')
      .eq('id', documentId)
      .single();

    // Update status to failed
    await supabaseAdmin
      .from('documents')
      .update({ 
        status: 'failed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    // Store error in processed_results so frontend can display it
    if (document) {
      await supabaseAdmin.from('processed_results').insert({
        document_id: documentId,
        user_id: document.user_id,
        extracted_text: '',
        summary: `Processing failed: ${processingError.message || 'Unknown error'}`,
        metadata: { error: true, errorMessage: processingError.message },
      });
    }

    throw processingError;
  }
}
