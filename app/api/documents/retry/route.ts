import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdminClient, isBuildPhase } from '@/lib/runtime';
import { extractText } from '@/lib/text-extractor';
import { analyzeTextWithGemini } from '@/lib/gemini';

export async function POST(req: Request) {
  let documentId: string | null = null;
  
  try {
    // Build phase guard
    if (isBuildPhase()) {
      return Response.json({ message: 'Skip during build' });
    }

    const { userId } = await auth();

    if (!userId) {
      console.log('❌ Unauthorized request to /api/documents/retry');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    documentId = body.documentId;

    if (!documentId) {
      return Response.json({ error: 'Document ID required' }, { status: 400 });
    }

    console.log(`\n🔄 === RETRY PROCESSING: ${documentId} ===`);
    console.log(`   User: ${userId}`);

    const supabase = getSupabaseAdminClient();
    
    // Get document
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !document) {
      console.error('❌ Document not found');
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Update to processing status
    await supabase
      .from('documents')
      .update({
        status: 'processing',
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    console.log('✅ Document status set to processing');

    // Download file from storage
    console.log('📥 Downloading file from storage...');
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
    console.log(`✅ File downloaded: ${fileBuffer.length} bytes`);

    // Extract text
    console.log('📄 Extracting text...');
    const extractedText = await extractText(
      fileBuffer,
      document.file_type,
      document.file_name
    );

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from file');
    }
    console.log(`✅ Text extracted: ${extractedText.length} characters`);

    // Analyze with Gemini
    console.log('🤖 Analyzing with Gemini...');
    const analysisResult = await analyzeTextWithGemini(extractedText);
    console.log('✅ Analysis complete');

    // Prepare processed output
    const processedOutput = {
      ...analysisResult,
      extracted_text: extractedText.substring(0, 10000),
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

    console.log('✅✅✅ RETRY PROCESSING COMPLETE ✅✅✅');

    return Response.json({
      success: true,
      message: 'Document reprocessed successfully',
      status: 'completed',
    });

  } catch (error: any) {
    console.error('❌ Retry processing error:', error.message);

    // Update document to failed status
    if (documentId) {
      try {
        const supabase = getSupabaseAdminClient();
        await supabase
          .from('documents')
          .update({
            status: 'failed',
            error: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId);
      } catch (updateError: any) {
        console.error('⚠️ Could not update failed status:', updateError.message);
      }
    }

    return Response.json(
      { error: error.message || 'Retry failed', success: false },
      { status: 500 }
    );
  }
}
