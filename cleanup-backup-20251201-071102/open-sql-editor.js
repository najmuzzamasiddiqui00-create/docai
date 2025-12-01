#!/usr/bin/env node
/**
 * Helper script to open Supabase SQL Editor in browser
 * Run with: npm run open-sql-editor
 */

const { exec } = require('child_process');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
  process.exit(1);
}

// Extract project ID from URL
// Format: https://PROJECT_ID.supabase.co
const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectId) {
  console.error('❌ Could not extract project ID from SUPABASE_URL');
  console.error(`   URL: ${SUPABASE_URL}`);
  process.exit(1);
}

const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectId}/sql`;

console.log('🚀 Opening Supabase SQL Editor...');
console.log(`📍 Project: ${projectId}`);
console.log(`🔗 URL: ${sqlEditorUrl}\n`);

console.log('📋 Next steps:');
console.log('   1. Click "+ New query" button');
console.log('   2. Copy contents of: fix-n8n-schema.sql');
console.log('   3. Paste into SQL Editor');
console.log('   4. Click "Run" to execute migration');
console.log('   5. Run: npm run verify-schema\n');

// Open in default browser
const command = process.platform === 'win32' ? 'start' : 
                process.platform === 'darwin' ? 'open' : 'xdg-open';

exec(`${command} ${sqlEditorUrl}`, (error) => {
  if (error) {
    console.error(`❌ Could not open browser automatically`);
    console.error(`   Please open manually: ${sqlEditorUrl}`);
  }
});
