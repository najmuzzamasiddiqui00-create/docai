// Internal Gemini API Helper - Single Model (gemini-2.5-pro)
// Fixed endpoint: https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent

export interface GeminiAnalysisResult {
  summary: string;
  keyPoints: string[];
  keywords: string[];
  category: string;
  sentiment: string;
  wordCount: number;
  charCount: number;
  extractedText?: string;
}

/**
 * Analyze document text using Gemini 2.5 Pro (latest stable model)
 * Single REST call; no dynamic model discovery or fallbacks
 */
export async function analyzeDocument(text: string): Promise<GeminiAnalysisResult> {
  console.log('🤖 Starting Gemini analysis...');
  console.log('   Text length:', text.length, 'characters');
  console.log('   Preview:', text.substring(0, 100).replace(/\n/g, ' '));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  try {
    // Create structured analysis prompt
    const prompt = `Analyze the following document text and provide a structured response in JSON format with these exact fields:
{
  "summary": "A concise 2-3 sentence summary",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "category": "Business|Technical|Legal|Educational|Personal|Other",
  "sentiment": "Positive|Negative|Neutral|Mixed",
  "wordCount": 1234
}

Document text:
${text.substring(0, 30000)}

Respond ONLY with valid JSON. Do not include markdown code blocks or any other text.`;

    console.log('   Calling Gemini API...');
    console.log('   Endpoint: v1/models/gemini-2.5-pro:generateContent');
    console.log('   Model: gemini-2.5-pro');
    console.log('   Prompt size:', prompt.length, 'characters');

    const requestBody = { contents: [ { parts: [{ text: prompt }] } ] };
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('   ❌ Gemini HTTP error:', res.status, res.statusText);
      console.error('   ❌ Body:', errText.substring(0, 400));
      throw new Error(`Gemini v1 error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('   ✅ Gemini response received');
    console.log('   Response has candidates:', Array.isArray(data?.candidates));
    console.log('   Extracted text length:', aiText.length);
    console.log('   Response preview:', aiText.substring(0, 150));

    // Clean response - remove markdown code fences
    let cleanedText = aiText.trim();
    cleanedText = cleanedText.replace(/^```json\s*/gi, '');
    cleanedText = cleanedText.replace(/^```\s*/gi, '');
    cleanedText = cleanedText.replace(/\s*```$/g, '');
    cleanedText = cleanedText.trim();

    console.log('   Cleaned text preview:', cleanedText.substring(0, 200));
    console.log('   Parsing JSON...');

    // Parse JSON with fallback
    let parsed: any;
    try {
      parsed = JSON.parse(cleanedText);
      console.log('   ✅ JSON parsed successfully');
      console.log('   Parsed keys:', Object.keys(parsed));
    } catch (parseError: any) {
      console.error('   ❌ JSON parse failed:', parseError.message);
      console.error('   Attempted to parse:', cleanedText.substring(0, 500));
      
      // Fallback: create basic analysis
      console.log('   Creating fallback analysis...');
      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
      parsed = {
        summary: 'Document processed successfully. AI analysis could not be generated from the response.',
        keyPoints: ['Document content extracted', 'Text analysis attempted'],
        keywords: ['document', 'analysis'],
        category: 'Other',
        sentiment: 'Neutral',
        wordCount: wordCount,
      };
    }

    // Calculate fields
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = text.length;

    // Build structured result
    const analysisResult: GeminiAnalysisResult = {
      summary: parsed.summary || 'No summary available',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : ['Analysis pending'],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : ['document'],
      category: parsed.category || 'Other',
      sentiment: parsed.sentiment || 'Neutral',
      wordCount: parsed.wordCount || wordCount,
      charCount: charCount,
    };

    console.log('   ✅ Analysis complete:');
    console.log('      Summary:', analysisResult.summary.substring(0, 80) + '...');
    console.log('      Key points:', analysisResult.keyPoints.length);
    console.log('      Keywords:', analysisResult.keywords.join(', '));
    console.log('      Category:', analysisResult.category);
    console.log('      Sentiment:', analysisResult.sentiment);
    console.log('      Word count:', analysisResult.wordCount);

    return analysisResult;

  } catch (error: any) {
    console.error('❌ Gemini API error:', error?.message || String(error));
    console.error('   Error name:', error?.name);
    if (error?.stack) {
      console.error('   Error stack:', error.stack.substring(0, 300));
    }
    const errorMessage = error?.message || 'Unknown Gemini API error';
    // Always throw a JSON-safe error message
    throw new Error(`Gemini API failed: ${errorMessage}`);
  }
}

// Alias for backward compatibility
export const analyzeTextWithGemini = analyzeDocument;

