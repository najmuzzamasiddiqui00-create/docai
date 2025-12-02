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

    // Generate signed URL (valid for 60 minutes)
    const { data: signedData, error: signError } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.file_path, 3600);

    if (signError || !signedData) {
      console.error('❌ Failed to generate signed URL:', signError);
      return Response.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    return Response.json({
      url: signedData.signedUrl,
      fileName: document.file_name,
    });
  } catch (error: any) {
    console.error('❌ Download error:', error);
    return Response.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
