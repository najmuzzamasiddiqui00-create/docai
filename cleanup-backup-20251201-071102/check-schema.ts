/**
 * Schema Verification Script for N8N Integration
 * 
 * Checks Supabase database schema and provides migration instructions
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from './lib/supabase';

async function checkSchema() {
  console.log('🔍 Checking Supabase Schema for N8N Integration...\n');
  
  try {
    // 1. Check user_profiles table and clerk_user_id column
    console.log('1️⃣ Checking user_profiles table...');
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('clerk_user_id, email')
      .limit(1);
    
    if (profilesError) {
      console.error('   ❌ Error:', profilesError.message);
      console.error('   Code:', profilesError.code);
      
      if (profilesError.code === '42P01') {
        console.log('\n   ⚠️  user_profiles table does NOT exist\n');
      } else if (profilesError.code === '42703') {
        console.log('\n   ⚠️  user_profiles exists but clerk_user_id column is missing\n');
      }
    } else {
      console.log('   ✅ user_profiles table exists with clerk_user_id column\n');
    }
    
    // 2. Check documents table required columns
    console.log('2️⃣ Checking documents table columns...');
    const { data: docs, error: docsError } = await supabaseAdmin
      .from('documents')
      .select('id, status, file_url, processed_output, error')
      .limit(1);
    
    if (docsError) {
      console.error('   ❌ Error:', docsError.message);
      console.error('   Code:', docsError.code);
      
      if (docsError.code === '42P01') {
        console.log('\n   ⚠️  documents table does NOT exist\n');
      } else if (docsError.code === '42703') {
        console.log('\n   ⚠️  documents table missing columns: file_url, processed_output, or error\n');
      }
    } else {
      console.log('   ✅ documents table has all required columns\n');
    }
    
    // 3. Test "queued" status support
    console.log('3️⃣ Testing "queued" status constraint...');
    const testId = 'test-' + Date.now();
    const { error: insertError } = await supabaseAdmin
      .from('documents')
      .insert({
        user_id: testId,
        file_name: 'test.pdf',
        file_path: 'test/path',
        file_url: 'https://example.com/test.pdf',
        file_size: 1000,
        file_type: 'application/pdf',
        status: 'queued'
      });
    
    if (insertError) {
      console.error('   ❌ Cannot use "queued" status:', insertError.message);
      console.log('\n   ⚠️  Status CHECK constraint needs "queued" added\n');
    } else {
      console.log('   ✅ "queued" status is supported\n');
      // Clean up test record
      await supabaseAdmin.from('documents').delete().eq('user_id', testId);
    }
    
    // 4. Summary and instructions
    console.log('='.repeat(70));
    console.log('📋 MIGRATION INSTRUCTIONS');
    console.log('='.repeat(70));
    console.log('\nIf any checks failed above, run the migration:\n');
    console.log('1. Open Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard (select your project)\n');
    console.log('2. Click "SQL Editor" in the left sidebar\n');
    console.log('3. Create a new query and paste contents of: fix-n8n-schema.sql\n');
    console.log('4. Click "Run" to execute the migration\n');
    console.log('5. Verify all checks pass by running: npm run check-schema\n');
    console.log('='.repeat(70) + '\n');
    
  } catch (error: any) {
    console.error('\n❌ Schema check failed:', error.message);
    console.error('\nPlease run the migration in Supabase SQL Editor:');
    console.error('File: fix-n8n-schema.sql\n');
  }
}

checkSchema();
