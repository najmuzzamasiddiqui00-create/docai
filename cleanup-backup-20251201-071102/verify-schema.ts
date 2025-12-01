/**
 * Schema Verification Script for N8N Integration
 * 
 * Checks Supabase database schema and provides migration instructions
 * Run with: npm run verify-schema
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkSchema() {
  console.log('🔍 Checking Supabase Schema for N8N Integration...\n');
  console.log(`📍 Project: ${SUPABASE_URL}\n`);
  
  let hasErrors = false;
  
  try {
    // 1. Check user_profiles table and clerk_user_id column
    console.log('1️⃣  Checking user_profiles table...');
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('clerk_user_id, email')
      .limit(1);
    
    if (profilesError) {
      hasErrors = true;
      console.error('    ❌ Error:', profilesError.message);
      console.error('    Code:', profilesError.code);
      
      if (profilesError.code === '42P01') {
        console.log('    ⚠️  user_profiles table does NOT exist\n');
      } else if (profilesError.code === '42703') {
        console.log('    ⚠️  user_profiles exists but clerk_user_id column is missing\n');
      }
    } else {
      console.log('    ✅ user_profiles table exists with clerk_user_id column\n');
    }
    
    // 2. Check documents table required columns
    console.log('2️⃣  Checking documents table columns...');
    const { data: docs, error: docsError } = await supabaseAdmin
      .from('documents')
      .select('id, status, file_url, processed_output, error')
      .limit(1);
    
    if (docsError) {
      hasErrors = true;
      console.error('    ❌ Error:', docsError.message);
      console.error('    Code:', docsError.code);
      
      if (docsError.code === '42P01') {
        console.log('    ⚠️  documents table does NOT exist\n');
      } else if (docsError.code === '42703') {
        console.log('    ⚠️  documents table missing columns\n');
      }
    } else {
      console.log('    ✅ documents table has all required columns\n');
    }
    
    // 3. Test "queued" status support
    console.log('3️⃣  Testing "queued" status constraint...');
    const testId = 'test-schema-' + Date.now();
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
      hasErrors = true;
      console.error('    ❌ Cannot use "queued" status');
      console.error('    Error:', insertError.message);
      console.log('    ⚠️  Status CHECK constraint needs "queued" added\n');
    } else {
      console.log('    ✅ "queued" status is supported\n');
      // Clean up test record
      await supabaseAdmin.from('documents').delete().eq('user_id', testId);
    }
    
    // 4. Check N8N_WEBHOOK_URL environment variable
    console.log('4️⃣  Checking N8N_WEBHOOK_URL...');
    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nUrl) {
      hasErrors = true;
      console.error('    ❌ N8N_WEBHOOK_URL not set in .env.local\n');
    } else {
      console.log(`    ✅ N8N_WEBHOOK_URL configured: ${n8nUrl}\n`);
    }
    
    // 5. Summary
    console.log('='.repeat(70));
    if (hasErrors) {
      console.log('❌ SCHEMA ISSUES DETECTED - Migration Required');
    } else {
      console.log('✅ SCHEMA VERIFICATION PASSED');
    }
    console.log('='.repeat(70));
    
    if (hasErrors) {
      console.log('\n📋 MIGRATION STEPS:\n');
      console.log('1. Open Supabase SQL Editor:');
      console.log(`   ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/sql\n`);
      console.log('2. Click "New query" button\n');
      console.log('3. Paste contents of: fix-n8n-schema.sql\n');
      console.log('4. Click "Run" to execute the migration\n');
      console.log('5. Run verification again: npm run verify-schema\n');
      console.log('='.repeat(70) + '\n');
      
      process.exit(1);
    } else {
      console.log('\n🎉 Your database is ready for n8n integration!\n');
      console.log('📝 Next steps:\n');
      console.log('   1. Start n8n workflow: http://localhost:5678\n');
      console.log('   2. Test file upload through the app\n');
      console.log('   3. Verify document status changes: queued → processing → completed\n');
      console.log('='.repeat(70) + '\n');
      
      process.exit(0);
    }
    
  } catch (error: any) {
    console.error('\n❌ Schema check failed:', error.message);
    console.error('\nPlease run the migration in Supabase SQL Editor');
    console.error('File: fix-n8n-schema.sql\n');
    process.exit(1);
  }
}

checkSchema();
