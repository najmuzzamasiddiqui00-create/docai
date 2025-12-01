import { supabaseAdmin } from '@/lib/supabase';

/**
 * n8n Webhook Callback Endpoint (Optional)
 * 
 * This endpoint allows n8n to POST back completion status or logs.
 * It's optional since n8n updates Supabase directly, but useful for:
 * - Logging/debugging
 * - Real-time notifications
 * - Webhook authentication validation
 * 
 * n8n should POST:
 * {
 *   documentId: string,
 *   status: 'completed' | 'failed',
 *   processed_output?: object,
 *   error?: string
 * }
 */
export async function POST(req: Request) {
  try {
    console.log('\n🔔 === n8n WEBHOOK CALLBACK RECEIVED ===');
    
    const body = await req.json();
    console.log('📦 Webhook payload:', JSON.stringify(body, null, 2));
    
    const { documentId, status, processed_output, error } = body;
    
    // Validate required fields
    if (!documentId) {
      console.error('❌ Missing documentId in webhook payload');
      return Response.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }
    
    if (!status) {
      console.error('❌ Missing status in webhook payload');
      return Response.json(
        { error: 'status is required' },
        { status: 400 }
      );
    }
    
    // Log the callback
    console.log(`📄 Document ${documentId} - Status: ${status}`);
    
    if (status === 'completed') {
      console.log('✅ Processing completed successfully');
      if (processed_output) {
        console.log('📊 Has processed output:', Object.keys(processed_output));
      }
    } else if (status === 'failed') {
      console.error('❌ Processing failed');
      if (error) {
        console.error('📛 Error:', error);
      }
    }
    
    // Optional: Verify the document was actually updated
    const { data: document } = await supabaseAdmin
      .from('documents')
      .select('id, status')
      .eq('id', documentId)
      .single();
    
    if (document) {
      console.log(`✅ Document ${documentId} current status in DB: ${document.status}`);
    } else {
      console.warn(`⚠️ Document ${documentId} not found in database`);
    }
    
    console.log('🔔 === WEBHOOK CALLBACK PROCESSED ===\n');
    
    return Response.json({
      success: true,
      message: 'Webhook received and logged',
      documentId,
    });
    
  } catch (error: any) {
    console.error('❌ Webhook callback error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return Response.json(
      { error: 'Webhook processing failed', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for testing/debugging
 */
export async function GET() {
  return Response.json({
    message: 'n8n webhook endpoint is active',
    usage: 'POST to this endpoint from n8n workflow',
    expectedPayload: {
      documentId: 'uuid',
      status: 'completed | failed',
      processed_output: {
        summary: 'string',
        extracted_text: 'string',
        metadata: 'object'
      },
      error: 'string (optional, for failed status)'
    }
  });
}
