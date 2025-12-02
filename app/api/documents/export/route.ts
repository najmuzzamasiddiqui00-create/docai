import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdminClient, isBuildPhase, handleRuntimeError } from '@/lib/runtime';

export async function POST(req: Request) {
  try {
    // Build phase guard
    if (isBuildPhase()) {
      return Response.json({ message: 'Skip during build' });
    }

    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await req.json();

    if (!documentId) {
      return Response.json({ error: 'Document ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    // Get document
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!document.processed_output) {
      return Response.json(
        { error: 'Document not yet processed' },
        { status: 400 }
      );
    }

    // Generate report
    const report = {
      documentId: document.id,
      fileName: document.file_name,
      fileType: document.file_type,
      fileSize: document.file_size,
      processedAt: document.processed_at,
      summary: document.processed_output.summary || '',
      keyPoints: document.processed_output.keyPoints || [],
      keywords: document.processed_output.keywords || [],
      sentiment: document.processed_output.sentiment || 'N/A',
      category: document.processed_output.category || 'N/A',
      wordCount: document.processed_output.wordCount || 0,
      charCount: document.processed_output.charCount || 0,
      extractedText: document.processed_output.extracted_text || '',
      generatedAt: new Date().toISOString(),
    };

    return Response.json(report);
  } catch (error: any) {
    console.error('❌ Export error:', error);
    return Response.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
