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

    const { documentId, newName } = await req.json();

    if (!documentId || !newName) {
      return Response.json(
        { error: 'Document ID and new name required' },
        { status: 400 }
      );
    }

    // Validate name
    if (newName.trim().length === 0) {
      return Response.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      );
    }

    console.log(`\n✏️ === RENAME DOCUMENT: ${documentId} ===`);
    console.log(`   New name: ${newName}`);

    const supabase = createAdminClient();
    // Update document name
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        file_name: newName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Failed to rename document:', updateError);
      return Response.json(
        { error: 'Failed to rename document' },
        { status: 500 }
      );
    }

    console.log('✅ Document renamed successfully');

    return Response.json({
      success: true,
      message: 'Document renamed',
    });
  } catch (error: any) {
    console.error('❌ Rename error:', error);
    return Response.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
