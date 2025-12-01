import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
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

    console.log(`\n🔄 === RETRY PROCESSING: ${documentId} ===`);

    const supabase = createAdminClient();
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

    // Reset document status
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'queued',
        error: null,
        error_message: null,
        processed_output: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('❌ Failed to reset document status:', updateError);
      return Response.json(
        { error: 'Failed to reset document status' },
        { status: 500 }
      );
    }

    console.log('✅ Document status reset to queued');

    // Trigger internal processing pipeline
    console.log('⚡ Re-triggering internal processor...');
    
    // Call internal processing route
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/process-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: document.id,
        }),
      });

      if (!response.ok) {
        console.error('⚠️ Processing invocation failed:', response.status, response.statusText);
      } else {
        console.log('✅ Processing triggered successfully');
      }
    } catch (processingError: any) {
      console.error('⚠️ Failed to trigger processing:', processingError.message);
      // Don't fail the request - document is queued and can be retried again
    }

    return Response.json({
      success: true,
      message: 'Processing retry initiated',
    });
  } catch (error: any) {
    console.error('❌ Retry error:', error);
    return Response.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
