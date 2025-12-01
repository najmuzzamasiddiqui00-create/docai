import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.log('❌ Unauthorized request to /api/documents/[id]');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;

    console.log(`\n📄 GET /api/documents/${documentId}`);
    console.log(`   User: ${userId}`);

    // Get document from database
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (error || !document) {
      console.error('❌ Document not found:', error?.message);
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    console.log(`✅ Document found`);
    console.log(`   Status: ${document.status}`);
    console.log(`   Has processed_output: ${!!document.processed_output}`);
    console.log(`   Has error: ${!!document.error}`);

    // Normalize processed_output to object if stored as TEXT
    let processedOutput: any = document.processed_output || null;
    if (processedOutput && typeof processedOutput === 'string') {
      try {
        processedOutput = JSON.parse(processedOutput);
      } catch {
        // leave as null to avoid UI crashes if invalid JSON
        processedOutput = null;
      }
    }

    // ALWAYS return JSON - never HTML
    const response = {
      document: {
        id: document.id,
        status: document.status,
        file_name: document.file_name,
        file_size: document.file_size,
        file_type: document.file_type,
        file_url: document.file_url,
        created_at: document.created_at,
        processed_at: document.processed_at,
        updated_at: document.updated_at,
        processed_output: processedOutput,
        error: document.error || null,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Error in GET /api/documents/[id]:', error.message);
    
    // ALWAYS return JSON even on error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;

    // Get document
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from storage
    if (document.file_path) {
      await supabaseAdmin.storage
        .from('documents')
        .remove([document.file_path]);
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('❌ Failed to delete document:', deleteError);
      return Response.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    console.log(`✅ Document ${documentId} deleted successfully`);
    return Response.json({ success: true });
  } catch (error: any) {
    console.error('❌ Delete error:', error);
    return Response.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
