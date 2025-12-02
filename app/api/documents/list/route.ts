import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdminClient, isBuildPhase, handleRuntimeError } from '@/lib/runtime';

export async function GET() {
  try {
    // Build phase guard
    if (isBuildPhase()) {
      return Response.json({ documents: [] });
    }
    
    const { userId } = await auth();

    if (!userId) {
      console.log('❌ Unauthorized request to /api/documents/list');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📋 GET /api/documents/list for user: ${userId}`);

    // Get all documents for the user
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching documents:', error);
      return Response.json(
        { error: 'Failed to fetch documents', documents: [] },
        { status: 500 }
      );
    }

    // Normalize documents - ensure processed_output is always an object or null
    const normalized = (documents || []).map((doc: any) => {
      let po = doc.processed_output;
      if (po && typeof po === 'string') {
        try {
          po = JSON.parse(po);
        } catch {
          po = null;
        }
      }
      return { 
        ...doc, 
        processed_output: po ?? null,
        error: doc.error ?? null,
      };
    });

    console.log(`✅ Found ${normalized.length} documents`);

    return Response.json({ documents: normalized });
  } catch (error: any) {
    console.error('❌ Error in /api/documents/list:', error.message);
    return Response.json(
      { error: 'Internal server error', documents: [] },
      { status: 500 }
    );
  }
}
