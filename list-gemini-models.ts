#!/usr/bin/env tsx
/**
 * List available Gemini models for your API key
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('🔍 Checking available Gemini models...\n');

  for (const version of ['v1', 'v1beta']) {
    console.log(`📡 Fetching ${version} models...`);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${version}/models?key=${apiKey}`);
      
      if (!res.ok) {
        console.log(`   ❌ ${version}: ${res.status} ${res.statusText}`);
        continue;
      }

      const data = await res.json();
      const models = data.models || [];
      
      if (models.length === 0) {
        console.log(`   ⚠️  No models found\n`);
        continue;
      }

      console.log(`   ✅ Found ${models.length} models:\n`);
      
      for (const model of models) {
        const name = model.name?.replace('models/', '') || model.name;
        const methods = model.supportedGenerationMethods || [];
        const supportsGenerate = methods.includes('generateContent');
        
        console.log(`   ${supportsGenerate ? '✓' : '✗'} ${name}`);
        if (model.displayName) console.log(`      Display: ${model.displayName}`);
        if (methods.length) console.log(`      Methods: ${methods.join(', ')}`);
        console.log();
      }
    } catch (err: any) {
      console.log(`   ❌ Error: ${err.message}\n`);
    }
  }

  console.log('💡 Use a model marked with ✓ that supports generateContent');
}

listModels();
