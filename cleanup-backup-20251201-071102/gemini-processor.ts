import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Summarize text using Gemini AI with automatic retry logic
 * 
 * Features:
 * - Retries up to N times on failure
 * - Exponential backoff between retries
 * - Graceful fallback if all attempts fail
 * - Detailed logging for debugging
 */
export async function summarizeTextWithRetry(
  text: string,
  maxRetries: number = 3
): Promise<string> {
  
  // Handle empty or very short text
  if (!text || text.trim().length < 50) {
    return 'Document is too short for meaningful summarization.';
  }

  // Truncate text to fit model context
  const maxLength = 8000;
  const truncatedText = text.substring(0, maxLength);
  const wasTruncated = text.length > maxLength;

  console.log(`📊 Text stats: ${text.length} chars (using ${truncatedText.length})`);

  // Check API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not configured');
    return generateFallbackSummary(truncatedText, wasTruncated);
  }

  // Attempt summarization with retries
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const attemptStart = Date.now();
      console.log(`🤖 Gemini attempt ${attempt}/${maxRetries}...`);

      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 500,
        },
      });

      // Generate summary
      const prompt = `Provide a concise, informative summary of this document in 2-3 clear sentences. Focus on the main points and key information:\n\n${truncatedText}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      // Validate response
      if (!summary || summary.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }

      const duration = Date.now() - attemptStart;
      console.log(`✅ Gemini success in ${duration}ms (attempt ${attempt})`);
      console.log(`📝 Summary preview: ${summary.substring(0, 80)}...`);

      return summary.trim();

    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      console.error(`❌ Gemini attempt ${attempt}/${maxRetries} failed: ${errorMsg}`);

      // If this was the last attempt, return fallback
      if (attempt === maxRetries) {
        console.error('❌ All Gemini attempts exhausted');
        return generateFallbackSummary(truncatedText, wasTruncated);
      }

      // Wait before retrying (exponential backoff)
      const backoffMs = 1000 * Math.pow(2, attempt - 1);
      console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  // Should never reach here, but fallback just in case
  return generateFallbackSummary(truncatedText, wasTruncated);
}

/**
 * Generate a simple fallback summary when AI fails
 */
function generateFallbackSummary(text: string, wasTruncated: boolean): string {
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;
  const charCount = text.length;

  // Extract first 200 characters as preview
  const preview = text.substring(0, 200).trim() + '...';

  const truncationNote = wasTruncated 
    ? ' (Text was truncated for processing.)' 
    : '';

  return `Document processed successfully. Contains ${wordCount} words and ${charCount} characters.${truncationNote}\n\nPreview: ${preview}\n\n[AI summary temporarily unavailable - using text preview instead]`;
}

/**
 * Analyze document for basic metadata
 */
export async function analyzeDocument(text: string): Promise<{
  wordCount: number;
  charCount: number;
  lineCount: number;
  avgWordLength: number;
}> {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const lines = text.split('\n').length;
  const totalChars = words.reduce((sum, word) => sum + word.length, 0);
  const avgWordLength = words.length > 0 ? totalChars / words.length : 0;

  return {
    wordCount: words.length,
    charCount: text.length,
    lineCount: lines,
    avgWordLength: Math.round(avgWordLength * 10) / 10,
  };
}
