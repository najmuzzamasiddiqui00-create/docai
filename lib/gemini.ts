/**
 * AI Analysis Module
 * 
 * Primary: AI SDK 6 with Gemini (gemini-2.0-flash)
 * Fallback: AI SDK 6 with OpenAI (gpt-4o)
 * Legacy: Direct REST API calls (deprecated)
 * 
 * Features:
 * - AI SDK 6 generateText with tool-based analysis
 * - Streaming support via streamText
 * - Automatic provider fallback (Gemini → OpenAI)
 * - Retry with exponential backoff on 429/5xx errors
 * - Robust JSON parsing (strips markdown code fences)
 * - Safe fallback object on parse failures
 * - Truncated text storage (max 5000 chars)
 * 
 * ZERO top-level initialization - all clients created at request time
 * 
 * @see https://sdk.vercel.ai/docs for AI SDK documentation
 */

import { isBuildPhase } from './supabase';
import { createRequestLogger } from './logger';

// Try to import AI SDK - falls back to legacy if not available
let useAISDK = false;
try {
  require('ai');
  useAISDK = true;
} catch {
  // AI SDK not installed, use legacy implementation
}

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessedOutput {
  summary: string;
  keyPoints: string[];
  keywords: string[];
  category: string;
  sentiment: string;
  wordCount: number;
  charCount?: number;
  extractedText?: string;
  raw?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 1000;
const MAX_TEXT_LENGTH = 30000; // Max text to send to AI
const MAX_STORED_TEXT = 5000; // Max extracted text to store in DB

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (429 or 5xx)
 */
function isRetryableError(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

/**
 * Clean AI response text - remove markdown code fences
 */
function cleanAIResponse(text: string): string {
  let cleaned = text.trim();
  // Remove ```json ... ``` blocks
  cleaned = cleaned.replace(/^```json\s*/gi, '');
  cleaned = cleaned.replace(/^```\s*/gi, '');
  cleaned = cleaned.replace(/\s*```$/g, '');
  // Remove any leading/trailing whitespace
  return cleaned.trim();
}

/**
 * Safely parse JSON from AI response
 * Returns null if parsing fails
 */
function safeParseJSON(text: string): Record<string, unknown> | null {
  const cleaned = cleanAIResponse(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from mixed content
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Create a fallback ProcessedOutput when AI parsing fails
 */
function createFallbackOutput(text: string): ProcessedOutput {
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  return {
    summary: 'Document processed. AI analysis could not generate a structured response.',
    keyPoints: ['Document content extracted', 'Manual review recommended'],
    keywords: ['document'],
    category: 'Other',
    sentiment: 'Neutral',
    wordCount,
    charCount: text.length,
  };
}

/**
 * Build the analysis prompt
 */
function buildPrompt(text: string): string {
  const truncatedText = text.substring(0, MAX_TEXT_LENGTH);
  return `Analyze the following document text and provide a structured response in JSON format with these exact fields:
{
  "summary": "A concise 2-3 sentence summary",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "category": "Business|Technical|Legal|Educational|Personal|Other",
  "sentiment": "Positive|Negative|Neutral|Mixed",
  "wordCount": 1234
}

Document text:
${truncatedText}

Respond ONLY with valid JSON. Do not include markdown code blocks or any other text.`;
}

// ============================================================================
// GEMINI API
// ============================================================================

/**
 * Call Gemini API with retry logic
 */
async function callGemini(
  prompt: string,
  apiKey: string,
  log: ReturnType<typeof createRequestLogger>
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        log.info(`Gemini retry attempt ${attempt}/${MAX_RETRIES}`, { backoffMs: backoff });
        await sleep(backoff);
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });
      
      if (!response.ok) {
        const status = response.status;
        const errorText = await response.text();
        
        log.warn('Gemini API error', { 
          status, 
          error: errorText.substring(0, 200),
          attempt 
        });
        
        // Check if retryable
        if (isRetryableError(status) && attempt < MAX_RETRIES) {
          continue;
        }
        
        // Non-retryable or max retries reached
        return null;
      }
      
      const data: GeminiResponse = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (!text) {
        log.warn('Gemini returned empty response');
        return null;
      }
      
      log.info('Gemini response received', { length: text.length });
      return text;
      
    } catch (error) {
      log.error('Gemini request failed', { 
        error: error instanceof Error ? error.message : String(error),
        attempt 
      });
      
      if (attempt >= MAX_RETRIES) {
        return null;
      }
    }
  }
  
  return null;
}

// ============================================================================
// OPENAI API (FALLBACK)
// ============================================================================

/**
 * Call OpenAI API with retry logic
 */
async function callOpenAI(
  prompt: string,
  apiKey: string,
  log: ReturnType<typeof createRequestLogger>
): Promise<string | null> {
  const models = ['gpt-4o', 'gpt-3.5-turbo'];
  
  for (const model of models) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
          log.info(`OpenAI retry attempt ${attempt}/${MAX_RETRIES}`, { model, backoffMs: backoff });
          await sleep(backoff);
        }
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: 'You are a document analysis assistant. Always respond with valid JSON only.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        });
        
        if (!response.ok) {
          const status = response.status;
          const errorText = await response.text();
          
          log.warn('OpenAI API error', { 
            status, 
            model,
            error: errorText.substring(0, 200),
            attempt 
          });
          
          // If model not available, try next model
          if (status === 404 && model === 'gpt-4o') {
            log.info('gpt-4o not available, trying gpt-3.5-turbo');
            break;
          }
          
          // Check if retryable
          if (isRetryableError(status) && attempt < MAX_RETRIES) {
            continue;
          }
          
          // Exhausted retries on retryable error, try next model
          if (isRetryableError(status)) {
            break;
          }
          
          return null;
        }
        
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content || '';
        
        if (!text) {
          log.warn('OpenAI returned empty response', { model });
          continue;
        }
        
        log.info('OpenAI response received', { model, length: text.length });
        return text;
        
      } catch (error) {
        log.error('OpenAI request failed', { 
          error: error instanceof Error ? error.message : String(error),
          model,
          attempt 
        });
        
        if (attempt >= MAX_RETRIES) {
          break;
        }
      }
    }
  }
  
  return null;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyze document text using AI
 * 
 * 1. Tries Gemini first (if GEMINI_API_KEY present)
 * 2. Falls back to OpenAI (if OPENAI_API_KEY present)
 * 3. Returns safe fallback if both fail
 * 
 * @param text - The document text to analyze
 * @returns ProcessedOutput with analysis results
 */
export async function analyzeText(text: string): Promise<ProcessedOutput> {
  const log = createRequestLogger('gemini');
  
  // Validate input
  if (!text || text.trim().length === 0) {
    throw new Error('Text input cannot be empty');
  }
  
  // Build phase guard
  if (isBuildPhase()) {
    throw new Error('Cannot analyze during build phase');
  }  
  log.info('Starting AI analysis', { textLength: text.length });
  
  const prompt = buildPrompt(text);
  let aiResponse: string | null = null;
  
  // Try Gemini first
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    log.info('Attempting Gemini analysis');
    aiResponse = await callGemini(prompt, geminiKey, log);
    
    if (aiResponse) {
      log.info('Gemini analysis successful');
    } else {
      log.warn('Gemini analysis failed, checking for OpenAI fallback');
    }
  }
  
  // Fallback to OpenAI if Gemini failed or unavailable
  if (!aiResponse) {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      log.info('Attempting OpenAI fallback');
      aiResponse = await callOpenAI(prompt, openaiKey, log);
      
      if (aiResponse) {
        log.info('OpenAI fallback successful');
      } else {
        log.error('OpenAI fallback also failed');
      }
    } else if (!geminiKey) {
      log.error('No AI API keys configured (GEMINI_API_KEY or OPENAI_API_KEY)');
      throw new Error('No AI API keys configured');
    }
  }
  
  // Parse response or use fallback
  if (!aiResponse) {
    log.warn('All AI providers failed, using fallback output');
    return {
      ...createFallbackOutput(text),
      extractedText: text.substring(0, MAX_STORED_TEXT),
    };
  }
  
  // Parse JSON response
  const parsed = safeParseJSON(aiResponse);
  
  if (!parsed) {
    log.warn('Failed to parse AI response as JSON', { 
      preview: aiResponse.substring(0, 100) 
    });
    return {
      ...createFallbackOutput(text),
      extractedText: text.substring(0, MAX_STORED_TEXT),
      raw: aiResponse.substring(0, 500),
    };
  }
  
  // Build final output with validation
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  
  const output: ProcessedOutput = {
    summary: typeof parsed.summary === 'string' 
      ? parsed.summary 
      : 'No summary available',
    keyPoints: Array.isArray(parsed.keyPoints) 
      ? parsed.keyPoints.filter((p): p is string => typeof p === 'string')
      : ['Analysis pending'],
    keywords: Array.isArray(parsed.keywords) 
      ? parsed.keywords.filter((k): k is string => typeof k === 'string')
      : ['document'],
    category: typeof parsed.category === 'string' 
      ? parsed.category 
      : 'Other',
    sentiment: typeof parsed.sentiment === 'string' 
      ? parsed.sentiment 
      : 'Neutral',
    wordCount: typeof parsed.wordCount === 'number' 
      ? parsed.wordCount 
      : wordCount,
    charCount: text.length,
    extractedText: text.substring(0, MAX_STORED_TEXT),
  };
  
  log.info('AI analysis complete', {
    summaryLength: output.summary.length,
    keyPointsCount: output.keyPoints.length,
    keywordsCount: output.keywords.length,
    category: output.category,
    sentiment: output.sentiment,
  });
  
  return output;
}

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================================

export const analyzeDocument = analyzeText;
export const analyzeTextWithGemini = analyzeText;

export type GeminiAnalysisResult = ProcessedOutput;

// ============================================================================
// AI SDK 6 INTEGRATION
// ============================================================================

/**
 * Re-export AI SDK functions for convenience
 * Use these for streaming chat and advanced features
 */
export { analyzeTextWithSDK, streamAnalysis } from './ai-sdk';

