import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getAdminClient, isBuildPhase } from '@/lib/supabase';
import { createRequestLogger, logAndSanitize } from '@/lib/logger';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const log = createRequestLogger('documents/[id]', params.id);
  
  try {
    // Build phase guard
    if (isBuildPhase()) {
      return NextResponse.json({ message: 'Skip during build' });
    }
    
    const { userId } = await auth();

    if (!userId) {
      log.warn('Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;
    log.info('Fetching document', { documentId, userId });

    // Get document from database
    const supabaseAdmin = getAdminClient();
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (error || !document) {
      log.warn('Document not found', { error: error?.message });
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    log.info('Document found', { 
      status: document.status,
      hasProcessedOutput: !!document.processed_output 
    });

    // Normalize processed_output to object if stored as TEXT
    let processedOutput: Record<string, unknown> | null = null;
    if (document.processed_output) {
      if (typeof document.processed_output === 'string') {
        try {
          processedOutput = JSON.parse(document.processed_output);
        } catch (parseError) {
          log.warn('Failed to parse processed_output as JSON', { 
            error: parseError instanceof Error ? parseError.message : String(parseError) 
          });
          processedOutput = null;
        }
      } else {
        processedOutput = document.processed_output;
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
  } catch (error) {
    const safeMessage = logAndSanitize(log, error, 'get-document');
    
    // ALWAYS return JSON even on error
    return NextResponse.json(
      { error: safeMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const log = createRequestLogger('documents/[id]/delete', params.id);
  
  try {
    // Build phase guard
    if (isBuildPhase()) {
      return Response.json({ message: 'Skip during build' });
    }
    
    const { userId } = await auth();

    if (!userId) {
      log.warn('Unauthorized delete request');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;
    log.info('Deleting document', { documentId, userId });

    // Get document
    const supabaseAdmin = getAdminClient();
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !document) {
      log.warn('Document not found for deletion');
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from storage
    if (document.file_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('documents')
        .remove([document.file_path]);
      
      if (storageError) {
        log.warn('Failed to delete from storage', { error: storageError.message });
        // Continue with database deletion anyway
      }
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      log.error('Failed to delete document', { error: deleteError.message });
      return Response.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    log.info('Document deleted successfully');
    return Response.json({ success: true });
  } catch (error) {
    const safeMessage = logAndSanitize(log, error, 'delete-document');
    return Response.json(
      { error: safeMessage },
      { status: 500 }
    );
  }
}
