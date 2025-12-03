/**
 * Document Chat API Route
 * 
 * AI SDK streaming chat endpoint for document analysis
 * Supports tools for structured analysis
 * 
 * @see https://sdk.vercel.ai/docs/getting-started
 */

import { streamText, tool } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { createRequestLogger } from '@/lib/logger';

// ============================================================================
// MODEL INITIALIZATION
// ============================================================================

function getModel() {
  // Try Gemini first
  if (process.env.GEMINI_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    return google('gemini-2.0-flash');
  }
  
  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai('gpt-4o');
  }
  
  throw new Error('No AI provider configured');
}

// ============================================================================
// ANALYSIS TOOLS (using tool helper for type inference)
// ============================================================================

const analyzeDocumentTool = tool({
  description: 'Analyze a document and extract structured information',
  inputSchema: z.object({
    summary: z.string().describe('A concise 2-3 sentence summary'),
    keyPoints: z.array(z.string()).describe('3-5 key points'),
    keywords: z.array(z.string()).describe('5-10 relevant keywords'),
    category: z.enum(['Business', 'Technical', 'Legal', 'Educational', 'Personal', 'Medical', 'Financial', 'Other']),
    sentiment: z.enum(['Positive', 'Negative', 'Neutral', 'Mixed']),
  }),
  execute: async ({ summary, keyPoints, keywords, category, sentiment }) => ({
    summary,
    keyPoints,
    keywords,
    category,
    sentiment,
    analyzed: true,
    timestamp: new Date().toISOString(),
  }),
});

const extractKeywordsTool = tool({
  description: 'Extract keywords and phrases from text',
  inputSchema: z.object({
    keywords: z.array(z.string()).describe('Relevant keywords and phrases'),
    topics: z.array(z.string()).describe('Main topics covered'),
  }),
  execute: async ({ keywords, topics }) => ({ keywords, topics }),
});

const summarizeTool = tool({
  description: 'Generate a summary of the document',
  inputSchema: z.object({
    brief: z.string().describe('One sentence summary'),
    detailed: z.string().describe('Detailed 2-3 paragraph summary'),
    bulletPoints: z.array(z.string()).describe('Key points as bullet list'),
  }),
  execute: async ({ brief, detailed, bulletPoints }) => ({ brief, detailed, bulletPoints }),
});

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  const log = createRequestLogger('chat-api');
  
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const body = await req.json();
    const messages = body.messages || [];
    
    log.info('Chat request received', {
      userId,
      messageCount: messages.length,
    });
    
    const model = getModel();
    
    const result = streamText({
      model,
      system: `You are an expert document analysis assistant. Help users understand, analyze, and extract insights from their documents.

When analyzing documents:
- Use the analyzeDocument tool for comprehensive analysis
- Use the extractKeywords tool for topic extraction
- Use the summarize tool for generating summaries

Always be helpful, accurate, and concise.`,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      tools: {
        analyzeDocument: analyzeDocumentTool,
        extractKeywords: extractKeywordsTool,
        summarize: summarizeTool,
      },
    });
    
    return result.toTextStreamResponse();
    
  } catch (error) {
    log.error('Chat API error', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
