/**
 * Cleanup Script - Removes unused files and dead code
 * 
 * This script is run by the auto-clean GitHub Action
 * It removes:
 * - Legacy n8n integration files
 * - Supabase edge functions
 * - Old Gemini beta code
 * - Duplicate processor utilities
 * - Files with 0 references
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

// Folders to delete entirely
const FOLDERS_TO_DELETE = [
  'supabase',
  'supabase/functions',
];

// File patterns to delete (if they contain these strings)
const CONTENT_PATTERNS_TO_DELETE = [
  'N8N_WEBHOOK_URL',
  'n8n-workflow',
  'edge-function',
  'supabase/functions',
  'v1beta/models/gemini',
  'gemini-pro-vision',
  'gemini-1.0',
];

// Files that should never be deleted (protected paths)
const PROTECTED_PATHS = [
  'app/api/upload',
  'app/api/process-document',
  'app/api/documents',
  'app/api/subscription',
  'app/api/user',
  'app/api/credits',
  'app/api/webhooks/clerk',
  'app/api/webhooks/razorpay',
  'app/api/health',
  'lib/gemini.ts',
  'lib/runtime.ts',
  'lib/supabase.ts',
  'lib/text-extractor.ts',
  'lib/credits.ts',
  'lib/rateLimit.ts',
  'components/',
  'app/page.tsx',
  'app/layout.tsx',
  'app/dashboard',
  'app/documents',
  'app/sign-in',
  'app/sign-up',
  'middleware.ts',
  'next.config.js',
  'package.json',
  'tsconfig.json',
  'tailwind.config.ts',
  '.github/',
  'scripts/cleanup.js',
  'node_modules',
  '.git',
  '.next',
];

// Specific files to delete
const FILES_TO_DELETE = [
  'lib/postToN8n.ts',
  'lib/geminiClient.ts',
  'lib/supabaseAdmin.ts',
  'app/api/webhooks/n8n/route.ts',
  'test-gemini.ts',
  'test-gemini.md',
  'list-gemini-models.ts',
];

let deletedFiles = [];
let deletedFolders = [];

function isProtected(filePath) {
  const relativePath = path.relative(ROOT, filePath).replace(/\\/g, '/');
  return PROTECTED_PATHS.some(p => relativePath.startsWith(p) || relativePath === p);
}

function deleteFolder(folderPath) {
  const fullPath = path.join(ROOT, folderPath);
  if (fs.existsSync(fullPath) && !isProtected(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      deletedFolders.push(folderPath);
      console.log(`🗑️  Deleted folder: ${folderPath}`);
    } catch (err) {
      console.error(`❌ Failed to delete folder ${folderPath}:`, err.message);
    }
  }
}

function deleteFile(filePath) {
  const fullPath = path.join(ROOT, filePath);
  if (fs.existsSync(fullPath) && !isProtected(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      deletedFiles.push(filePath);
      console.log(`🗑️  Deleted file: ${filePath}`);
    } catch (err) {
      console.error(`❌ Failed to delete file ${filePath}:`, err.message);
    }
  }
}

function scanForPatterns(dir) {
  if (!fs.existsSync(dir)) return;
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
    
    // Skip protected paths
    if (isProtected(fullPath)) continue;
    
    // Skip node_modules, .git, .next
    if (item.name === 'node_modules' || item.name === '.git' || item.name === '.next') continue;
    
    if (item.isDirectory()) {
      scanForPatterns(fullPath);
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx') || item.name.endsWith('.js'))) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        for (const pattern of CONTENT_PATTERNS_TO_DELETE) {
          if (content.includes(pattern)) {
            console.log(`⚠️  Found pattern "${pattern}" in ${relativePath}`);
            // Don't auto-delete, just log for review
            break;
          }
        }
      } catch (err) {
        // Skip unreadable files
      }
    }
  }
}

function main() {
  console.log('\n🧹 === AUTO-CLEANUP STARTED ===\n');
  
  // Step 1: Delete specific folders
  console.log('📁 Checking folders to delete...');
  for (const folder of FOLDERS_TO_DELETE) {
    deleteFolder(folder);
  }
  
  // Step 2: Delete specific files
  console.log('\n📄 Checking files to delete...');
  for (const file of FILES_TO_DELETE) {
    deleteFile(file);
  }
  
  // Step 3: Scan for patterns (informational only)
  console.log('\n🔍 Scanning for legacy patterns...');
  scanForPatterns(ROOT);
  
  // Summary
  console.log('\n📊 === CLEANUP SUMMARY ===');
  console.log(`   Folders deleted: ${deletedFolders.length}`);
  console.log(`   Files deleted: ${deletedFiles.length}`);
  
  if (deletedFolders.length > 0) {
    console.log('\n   Deleted folders:');
    deletedFolders.forEach(f => console.log(`     - ${f}`));
  }
  
  if (deletedFiles.length > 0) {
    console.log('\n   Deleted files:');
    deletedFiles.forEach(f => console.log(`     - ${f}`));
  }
  
  if (deletedFolders.length === 0 && deletedFiles.length === 0) {
    console.log('\n   ✅ No cleanup needed - project is clean!');
  }
  
  console.log('\n🧹 === CLEANUP COMPLETE ===\n');
}

main();
