/**
 * N8N Webhook Helper with Retry Logic
 * 
 * Posts document processing requests to configured N8N webhook
 * with exponential backoff retry (3 attempts)
 */

interface N8nPayload {
  documentId: string;
  fileUrl: string;
  userId: string;
  fileName?: string;
  fileType?: string;
}

interface N8nResponse {
  success: boolean;
  error?: string;
  attempts?: number;
  response?: any;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second base delay

/**
 * Posts to N8N webhook with exponential backoff retry
 * @param payload - Document data to send to N8N
 * @returns Promise with success status and any error message
 */
export async function postToN8n(payload: N8nPayload): Promise<N8nResponse> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('⚠️ N8N_WEBHOOK_URL not configured - skipping webhook');
    return {
      success: true, // Not an error if webhook isn't configured
      error: 'N8N_WEBHOOK_URL not configured',
      attempts: 0,
    };
  }

  console.log('\n🔗 === POSTING TO N8N WEBHOOK ===');
  console.log('   URL:', webhookUrl);
  console.log('   Payload:', JSON.stringify(payload, null, 2));

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`\n📤 Attempt ${attempt}/${MAX_RETRIES}...`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Source': 'docai-upload',
        },
        body: JSON.stringify(payload),
      });

      console.log(`   Response status: ${response.status}`);

      if (response.ok) {
        let responseData;
        try {
          responseData = await response.json();
        } catch {
          responseData = await response.text();
        }
        
        console.log('✅ N8N webhook call successful');
        console.log('   Response:', typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
        
        return {
          success: true,
          attempts: attempt,
          response: responseData,
        };
      }

      // Non-2xx response
      const errorText = await response.text();
      console.error(`❌ N8N returned error: ${response.status}`);
      console.error(`   Body: ${errorText.substring(0, 200)}`);
      
      lastError = new Error(`N8N webhook returned ${response.status}: ${errorText.substring(0, 100)}`);
      
    } catch (error: any) {
      console.error(`❌ N8N request failed: ${error.message}`);
      lastError = error;
    }

    // Calculate exponential backoff delay
    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`   Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // All retries exhausted
  console.error('\n❌❌❌ N8N WEBHOOK FAILED AFTER ALL RETRIES ❌❌❌');
  console.error(`   Last error: ${lastError?.message}`);
  
  return {
    success: false,
    error: lastError?.message || 'N8N webhook failed after retries',
    attempts: MAX_RETRIES,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
