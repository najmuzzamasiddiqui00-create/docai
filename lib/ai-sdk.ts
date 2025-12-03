/**
 * AI SDK Document Analysis Module
 * 
 * Uses Vercel AI SDK for:
 * - Streaming text generation
 * - Multi-step tool calls
 * - Automatic provider fallback (Gemini → OpenAI)
 * 
 * Features:
 * - streamText for real-time responses
 * - generateText for structured analysis
 * - Tool-based document analysis
 * - Provider abstraction via AI Gateway or direct providers
 * 
 * @see https://sdk.vercel.ai/docs/getting-started
 */

import { generateText, tool, streamText, LanguageModel } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { isBuildPhase } from './supabase';
import { createRequestLogger } from './logger';

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

export interface AnalysisToolResult {
  summary?: string;
  keyPoints?: string[];
  keywords?: string[];
  category?: string;
  sentiment?: string;
  analyzed?: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_TEXT_LENGTH = 30000; // Max text to send to AI
const MAX_STORED_TEXT = 5000; // Max extracted text to store in DB

// ============================================================================
// PROVIDER INITIALIZATION
// ============================================================================

/**
 * Get the primary AI model (Gemini)
 * Returns null if API key not configured
 */
function getGeminiModel(): LanguageModel | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  
  const google = createGoogleGenerativeAI({ apiKey });
  return google('gemini-2.0-flash');
}

/**
 * Get fallback AI model (OpenAI)
 * Returns null if API key not configured
 */
function getOpenAIModel(): LanguageModel | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  
  const openai = createOpenAI({ apiKey });
  return openai('gpt-4o');
}

/**
 * Get available AI model with fallback chain
 * Gemini → OpenAI → throws error
 */
function getAvailableModel(log: ReturnType<typeof createRequestLogger>): LanguageModel {
  const gemini = getGeminiModel();
  if (gemini) {
    log.info('Using Gemini model');
    return gemini;
  }
  
  const openai = getOpenAIModel();
  if (openai) {
    log.info('Using OpenAI model (Gemini not available)');
    return openai;
  }
  
  throw new Error('No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY');
}

// ============================================================================
// ANALYSIS TOOLS (AI SDK Pattern)
// ============================================================================

const documentAnalysisTool = tool({
  description: 'Analyze a document and extract structured information including summary, key points, keywords, category, and sentiment',
  inputSchema: z.object({
    summary: z.string().describe('A concise 2-3 sentence summary of the document'),
    keyPoints: z.array(z.string()).describe('3-5 key points from the document'),
    keywords: z.array(z.string()).describe('5-10 relevant keywords or phrases'),
    category: z.enum(['Business', 'Technical', 'Legal', 'Educational', 'Personal', 'Medical', 'Financial', 'Other'])
      .describe('The document category'),
    sentiment: z.enum(['Positive', 'Negative', 'Neutral', 'Mixed'])
      .describe('The overall sentiment of the document'),
  }),
  execute: async ({ summary, keyPoints, keywords, category, sentiment }) => ({
    summary,
    keyPoints,
    keywords,
    category,
    sentiment,
    analyzed: true,
  }),
});

// ============================================================================
// MAIN ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze document text using AI SDK
 * 
 * Uses generateText with tools for structured output
 * Automatic fallback from Gemini to OpenAI
 * 
 * @param text - Document text to analyze
 * @returns ProcessedOutput with analysis results
 */
export async function analyzeTextWithSDK(text: string): Promise<ProcessedOutput> {
  const log = createRequestLogger('ai-sdk');
  
  // Validate input
  if (!text || text.trim().length === 0) {
    throw new Error('Text input cannot be empty');
  }
  
  // Build phase guard
  if (isBuildPhase()) {
    throw new Error('Cannot analyze during build phase');
  }
  
  log.info('Starting AI SDK analysis', { textLength: text.length });
  
  const truncatedText = text.substring(0, MAX_TEXT_LENGTH);
  const model = getAvailableModel(log);
  
  try {
    const result = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a document analysis expert. Analyze the provided document and use the documentAnalysis tool to return structured results. Be thorough but concise.`,
        },
        {
          role: 'user',
          content: `Analyze this document:\n\n${truncatedText}`,
        },
      ],
      tools: {
        documentAnalysis: documentAnalysisTool,
      },
    });
    
    // Extract tool results
    let analysis: Partial<ProcessedOutput> = {};
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    
    // Process tool results from response (using 'output' property in AI SDK 5.x)
    if (result.toolResults && result.toolResults.length > 0) {
      for (const toolResult of result.toolResults) {
        if (toolResult.toolName === 'documentAnalysis' && 'output' in toolResult && toolResult.output) {
          const res = toolResult.output as AnalysisToolResult;
          analysis = {
            summary: res.summary || 'No summary available',
            keyPoints: res.keyPoints || ['Analysis pending'],
            keywords: res.keywords || ['document'],
            category: res.category || 'Other',
            sentiment: res.sentiment || 'Neutral',
          };
        }
      }
    }
    
    // If no tool was called, try to parse from text response
    if (!analysis.summary && result.text) {
      log.warn('No tool result, falling back to text parsing');
      analysis = parseTextResponse(result.text, log);
    }
    
    const output: ProcessedOutput = {
      summary: analysis.summary || 'Document analyzed successfully',
      keyPoints: analysis.keyPoints || ['Content extracted'],
      keywords: analysis.keywords || ['document'],
      category: analysis.category || 'Other',
      sentiment: analysis.sentiment || 'Neutral',
      wordCount,
      charCount: text.length,
      extractedText: text.substring(0, MAX_STORED_TEXT),
    };
    
    log.info('AI SDK analysis complete', {
      summaryLength: output.summary.length,
      keyPointsCount: output.keyPoints.length,
      keywordsCount: output.keywords.length,
      category: output.category,
    });
    
    return output;
    
  } catch (error) {
    log.error('AI SDK analysis failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return fallback output
    return createFallbackOutput(text);
  }
}

/**
 * Stream document analysis (for real-time UI updates)
 * 
 * Returns a readable stream for progressive UI rendering
 * Useful for chat-based document analysis
 */
export async function streamAnalysis(text: string) {
  const log = createRequestLogger('ai-sdk-stream');
  
  if (!text || text.trim().length === 0) {
    throw new Error('Text input cannot be empty');
  }
  
  if (isBuildPhase()) {
    throw new Error('Cannot analyze during build phase');
  }
  
  log.info('Starting streamed analysis', { textLength: text.length });
  
  const truncatedText = text.substring(0, MAX_TEXT_LENGTH);
  const model = getAvailableModel(log);
  
  const result = streamText({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a document analysis expert. Provide a clear, structured analysis.',
      },
      {
        role: 'user',
        content: `Analyze this document and provide:
1. A brief summary (2-3 sentences)
2. Key points (3-5 bullet points)
3. Keywords (5-10 relevant terms)
4. Category (Business/Technical/Legal/Educational/Personal/Other)
5. Sentiment (Positive/Negative/Neutral/Mixed)

Document:
${truncatedText}`,
      },
    ],
  });
  
  return result;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse text response when tool wasn't called
 */
function parseTextResponse(
  text: string, 
  log: ReturnType<typeof createRequestLogger>
): Partial<ProcessedOutput> {
  // Try to extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary,
        keyPoints: parsed.keyPoints,
        keywords: parsed.keywords,
        category: parsed.category,
        sentiment: parsed.sentiment,
      };
    } catch {
      log.warn('Failed to parse JSON from text response');
    }
  }
  
  return {};
}

/**
 * Create fallback output when analysis fails
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
    extractedText: text.substring(0, MAX_STORED_TEXT),
  };
}

// ============================================================================
// CHAT API HELPERS (for useChat hook)
// ============================================================================

/**
 * Convert messages array for AI SDK
 * Use in route handlers for chat-based analysis
 */
export function prepareMessages(
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string
): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  const coreMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
  
  if (systemPrompt) {
    coreMessages.push({
      role: 'system',
      content: systemPrompt,
    });
  }
  
  for (const msg of messages) {
    coreMessages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    });
  }
  
  return coreMessages;
}

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Drop-in replacement for existing analyzeText function
 * Uses AI SDK under the hood
 */
export const analyzeText = analyzeTextWithSDK;
export const analyzeDocument = analyzeTextWithSDK;
