#!/usr/bin/env node
/**
 * Migration Script: Apply N8N Schema Updates
 * 
 * This script applies the n8n integration schema migration to Supabase.
 * It adds support for:
 * - 'queued' status in documents table
 * - file_url column for n8n to download files
 * - processed_output and error columns
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 Starting N8N Schema Migration...\n');
  
  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'fix-n8n-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Read migration file: fix-n8n-schema.sql');
    console.log(`   Size: ${sql.length} characters\n`);
    
    // Execute the migration using Supabase REST API
    const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
    
    console.log('📡 Executing migration via Supabase REST API...');
    console.log(`   URL: ${url}\n`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ Migration failed:');
      console.error(errorText);
      
      // Try alternative method: Direct SQL execution via pg protocol
      console.log('\n⚠️  Falling back to direct SQL execution...');
      console.log('   You need to run this SQL manually in Supabase SQL Editor:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/_/sql');
      console.log('   2. Paste the contents of fix-n8n-schema.sql');
      console.log('   3. Click "Run"\n');
      
      return false;
    }
    
    const result = await response.json();
    
    console.log('\n✅ Migration completed successfully!\n');
    console.log('📊 Results:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n🎉 Schema is now ready for n8n integration!');
    console.log('\n📝 Next steps:');
    console.log('   1. Verify tables in Supabase dashboard');
    console.log('   2. Test file upload through the app');
    console.log('   3. Check that document status is set to "queued"');
    console.log('   4. Verify n8n receives webhook POST\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    console.error('\n📋 Manual migration required:');
    console.log('   1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql');
    console.log('   2. Copy contents of fix-n8n-schema.sql');
    console.log('   3. Paste and execute in SQL Editor\n');
    
    return false;
  }
}

// Run the migration
runMigration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
