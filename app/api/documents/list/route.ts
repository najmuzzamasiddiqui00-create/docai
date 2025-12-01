import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all documents for the user
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select(`
        *,
        processed_results (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return Response.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    const normalized = (documents || []).map((doc: any) => {
      let po = doc.processed_output;
      if (po && typeof po === 'string') {
        try {
          po = JSON.parse(po);
        } catch {}
      }
      return { ...doc, processed_output: po ?? null };
    });

    return Response.json({ documents: normalized });
  } catch (error) {
    console.error('Error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
