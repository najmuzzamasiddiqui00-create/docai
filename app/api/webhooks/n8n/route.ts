/**
 * N8N Webhook Receiver Route
 * 
 * Receives processing callbacks from N8N workflow to update document status.
 * This is called by N8N after document processing is complete.
 * 
 * Expected payload:
 * {
 *   documentId: string,
 *   status: 'processing' | 'completed' | 'failed',
 *   processed_output?: { summary, keyPoints, keywords, ... },
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, isBuildPhase } from '@/lib/runtime';

// Webhook secret for validation (optional but recommended)
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  console.log('\n🔔 === N8N WEBHOOK RECEIVED ===');
  console.log('⏰ Timestamp:', new Date().toISOString());

  try {
    // Build phase guard
    if (isBuildPhase()) {
      return NextResponse.json({ message: 'Skip during build' });
    }

    // Validate webhook secret if configured
    if (WEBHOOK_SECRET) {
      const providedSecret = req.headers.get('x-webhook-secret');
      if (providedSecret !== WEBHOOK_SECRET) {
        console.error('❌ Invalid webhook secret');
        return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
      }
      console.log('✅ Webhook secret validated');
    }

    // Parse request body
    const body = await req.json();
    console.log('📋 Webhook payload:', JSON.stringify(body, null, 2));

    const { documentId, status, processed_output, error } = body;

    // Validate required fields
    if (!documentId) {
      console.error('❌ Missing documentId');
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    if (!status || !['processing', 'completed', 'failed'].includes(status)) {
      console.error('❌ Invalid status:', status);
      return NextResponse.json(
        { error: 'Invalid status. Must be: processing, completed, or failed' },
        { status: 400 }
      );
    }

    console.log(`📝 Updating document ${documentId} to status: ${status}`);

    // Update document in database
    const supabase = getSupabaseAdminClient();
    
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'completed' && processed_output) {
      updateData.processed_output = processed_output;
      updateData.processed_at = new Date().toISOString();
      updateData.error = null;
    }

    if (status === 'failed' && error) {
      updateData.error = error;
    }

    const { data, error: updateError } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Database update failed:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      );
    }

    if (!data) {
      console.error('❌ Document not found:', documentId);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    console.log('✅ Document updated successfully');
    console.log(`   Document ID: ${documentId}`);
    console.log(`   New status: ${status}`);
    if (processed_output) {
      console.log(`   Has processed output: true`);
    }

    return NextResponse.json({
      success: true,
      documentId,
      status,
      message: `Document status updated to ${status}`,
    });

  } catch (error: any) {
    console.error('\n❌❌❌ N8N WEBHOOK ERROR ❌❌❌');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack?.substring(0, 300));

    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Also support GET for webhook verification
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'N8N webhook endpoint ready',
    timestamp: new Date().toISOString(),
  });
}
