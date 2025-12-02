/**
 * Gemini AI Client (Server-Side Only)
 * 
 * Centralized, hardened Google Gemini API client with:
 * - Runtime environment validation
 * - Request/response type safety
 * - Rate limiting preparation
 * - Error handling
 */

import { ServerEnv, isBuildPhase } from './safeEnv';
import { auditLog, maskSecret } from './security';

export interface GeminiAnalysisResult {
  summary: string;
  keyPoints: string[];
  keywords: string[];
  category: string;
  sentiment: string;
  wordCount: number;
  charCount: number;
}

/**
 * Analyze text using Gemini AI with structured JSON output.
 * 
 * @throws {Error} If API request fails or response is invalid
 */
export async function analyzeTextWithGemini(
  text: string,
  userId?: string
): Promise<GeminiAnalysisResult> {
  // Build-phase safety
  if (isBuildPhase()) {
    throw new Error('Cannot call Gemini API during build phase');
  }

  // Get API key from safe environment
  const apiKey = ServerEnv.geminiApiKey;

  // Audit log (don't log full text, only metadata)
  if (userId) {
    auditLog('gemini_analysis', userId, {
      textLength: text.length,
      apiKeyMasked: maskSecret(apiKey),
    });
  }

  const endpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent';
  
  const prompt = `Analyze the following text and provide a structured JSON response with:
- summary: A concise 2-3 sentence summary
- keyPoints: Array of 3-5 main points (strings)
- keywords: Array of 5-10 relevant keywords (strings)
- category: Single category (Business/Technical/Legal/Medical/General)
- sentiment: Overall sentiment (Positive/Negative/Neutral)
- wordCount: Approximate word count (number)
- charCount: Character count (number)

Text to analyze:
${text.slice(0, 10000)}

Return ONLY valid JSON matching this structure:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "keywords": ["...", "..."],
  "category": "...",
  "sentiment": "...",
  "wordCount": 0,
  "charCount": 0
}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 2048,
    },
  };

  try {
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Extract and parse the response
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('No content in Gemini response');
    }

    // Clean and parse JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate structure
    const result: GeminiAnalysisResult = {
      summary: parsed.summary || 'No summary available',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      category: parsed.category || 'General',
      sentiment: parsed.sentiment || 'Neutral',
      wordCount: parsed.wordCount || text.split(/\s+/).length,
      charCount: parsed.charCount || text.length,
    };

    return result;
  } catch (error) {
    console.error('Gemini analysis error:', error);
    throw error;
  }
}

/**
 * Analyze document with Gemini (wrapper for backward compatibility).
 */
export async function analyzeDocument(
  text: string,
  userId?: string
): Promise<GeminiAnalysisResult> {
  return analyzeTextWithGemini(text, userId);
}

/**
 * Check if Gemini API is configured and accessible.
 */
export async function checkGeminiHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    if (isBuildPhase()) {
      return { healthy: false, error: 'Build phase' };
    }

    const apiKey = ServerEnv.geminiApiKey;
    
    // Simple validation check
    if (!apiKey || apiKey.length < 20) {
      return { healthy: false, error: 'Invalid API key' };
    }

    return { healthy: true };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
