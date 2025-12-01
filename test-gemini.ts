#!/usr/bin/env tsx
/**
 * Lightweight test harness for Gemini helper
 * 
 * Usage:
 *   npm run test:gemini          # Test with sample text
 *   npm run test:gemini -- pdf   # Test with PDF-like text
 *   npm run test:gemini -- long  # Test with long text
 */

import { analyzeDocument } from './lib/gemini';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Test samples
const SAMPLES = {
  short: `This is a short business proposal document.
We recommend implementing a new customer service system to improve response times.
Key benefits include faster resolution, better tracking, and improved customer satisfaction.`,

  pdf: `%PDF-1.4
Business Proposal Document
Executive Summary
This proposal outlines a comprehensive strategy for digital transformation.
Key Points:
1. Cloud migration strategy
2. API modernization
3. Security enhancements
Implementation timeline: Q1 2025 - Q4 2025
Expected ROI: 40% improvement in operational efficiency`,

  long: `Business Analysis Report

Executive Summary:
This comprehensive report analyzes market trends, competitive landscape, and strategic opportunities for growth in the technology sector.

Market Overview:
The global technology market continues to evolve rapidly, with artificial intelligence, cloud computing, and cybersecurity emerging as key growth drivers. Industry analysts project 15% annual growth over the next five years.

Competitive Analysis:
Our analysis identifies three major competitors, each with distinct market positioning. Competitor A focuses on enterprise solutions, Competitor B targets small businesses, and Competitor C specializes in vertical markets.

Strategic Recommendations:
1. Invest in AI-powered product features to enhance user experience
2. Expand cloud infrastructure to support global scalability
3. Strengthen cybersecurity capabilities to address emerging threats
4. Develop partnerships with complementary service providers
5. Focus on customer retention through enhanced support programs

Financial Projections:
Based on current market trends and our competitive positioning, we project revenue growth of 25% year-over-year, with gross margins improving from 45% to 52% over the next three years.

Implementation Timeline:
Phase 1 (Q1 2025): Infrastructure upgrades and team expansion
Phase 2 (Q2 2025): Product development and beta testing
Phase 3 (Q3 2025): Market launch and customer acquisition
Phase 4 (Q4 2025): Optimization and scaling

Risk Assessment:
Key risks include market volatility, competitive pressures, and technology disruptions. Mitigation strategies include diversification, continuous innovation, and maintaining financial reserves.

Conclusion:
With strategic investments and focused execution, we are well-positioned to capitalize on market opportunities and achieve sustainable growth.`,
};

async function runTest(sampleName: keyof typeof SAMPLES = 'short') {
  console.log('\n🧪 === GEMINI HELPER TEST HARNESS ===\n');
  
  // Validate environment
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY not found in .env.local');
    console.error('   Please set your Gemini API key in .env.local file');
    process.exit(1);
  }

  const sample = SAMPLES[sampleName];
  if (!sample) {
    console.error(`❌ Error: Unknown sample "${sampleName}"`);
    console.error(`   Available samples: ${Object.keys(SAMPLES).join(', ')}`);
    process.exit(1);
  }

  console.log(`📝 Testing with sample: ${sampleName}`);
  console.log(`📏 Sample length: ${sample.length} characters`);
  console.log(`📄 Sample preview: ${sample.substring(0, 100).replace(/\n/g, ' ')}...`);
  console.log('\n⏳ Calling Gemini API...\n');

  const startTime = Date.now();
  
  try {
    const result = await analyzeDocument(sample);
    const duration = Date.now() - startTime;
    
    console.log('\n✅ === TEST PASSED === ✅\n');
    console.log('⏱️  Duration:', `${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log('\n📊 Analysis Results:\n');
    console.log('Summary:');
    console.log(`  ${result.summary}`);
    console.log('\nKey Points:');
    result.keyPoints.forEach((point, i) => {
      console.log(`  ${i + 1}. ${point}`);
    });
    console.log('\nKeywords:');
    console.log(`  ${result.keywords.join(', ')}`);
    console.log('\nMetadata:');
    console.log(`  Category: ${result.category}`);
    console.log(`  Sentiment: ${result.sentiment}`);
    console.log(`  Word Count: ${result.wordCount}`);
    console.log(`  Char Count: ${result.charCount}`);
    
    console.log('\n✅ All fields present and valid');
    
    // Validate structure
    const errors = [];
    if (!result.summary || result.summary.length < 10) errors.push('Invalid summary');
    if (!Array.isArray(result.keyPoints) || result.keyPoints.length === 0) errors.push('Invalid keyPoints');
    if (!Array.isArray(result.keywords) || result.keywords.length === 0) errors.push('Invalid keywords');
    if (!result.category) errors.push('Missing category');
    if (!result.sentiment) errors.push('Missing sentiment');
    if (!result.wordCount || result.wordCount === 0) errors.push('Invalid wordCount');
    
    if (errors.length > 0) {
      console.log('\n⚠️  Validation warnings:');
      errors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('✅ Structure validation passed');
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('\n❌ === TEST FAILED === ❌\n');
    console.error('⏱️  Duration:', `${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.error('\nError Details:');
    console.error(`  Name: ${error.name}`);
    console.error(`  Message: ${error.message}`);
    
    if (error.message.includes('404')) {
      console.error('\n💡 Troubleshooting:');
      console.error('  • The model "gemini-1.5-pro" may not be available for your API key');
      console.error('  • Check https://ai.google.dev/gemini-api/docs/models for available models');
      console.error('  • Verify your GEMINI_API_KEY is valid and active');
    } else if (error.message.includes('GEMINI_API_KEY')) {
      console.error('\n💡 Troubleshooting:');
      console.error('  • Set GEMINI_API_KEY in your .env.local file');
      console.error('  • Get an API key at https://aistudio.google.com/app/apikey');
    } else if (error.message.includes('JSON')) {
      console.error('\n💡 Troubleshooting:');
      console.error('  • Gemini returned invalid JSON');
      console.error('  • Check the response parsing logic in lib/gemini.ts');
    }
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
  
  console.log('\n='.repeat(60));
  console.log('🎉 Test completed successfully!');
  console.log('='.repeat(60) + '\n');
}

// Parse command line args
const sampleArg = process.argv[2] as keyof typeof SAMPLES | undefined;
runTest(sampleArg || 'short').catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
