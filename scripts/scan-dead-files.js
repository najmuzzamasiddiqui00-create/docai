/**
 * Dead File Scanner
 * 
 * Scans the project for unused, suspicious, or deprecated files.
 * Reports findings without deleting anything.
 * 
 * Usage: npm run scan:dead-files
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

// Directories to scan
const SCAN_DIRS = ['app', 'lib', 'components', 'middleware', 'types'];

// File extensions to analyze
const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Keywords that indicate old/deprecated code
const DEPRECATED_KEYWORDS = [
  { pattern: 'import.*from.*[\'"].*n8n', description: 'N8N integration (legacy)', isRegex: true },
  { pattern: 'N8N_WEBHOOK', description: 'N8N webhook URL' },
  { pattern: 'postToN8n', description: 'N8N webhook helper function' },
  { pattern: 'edge-function', description: 'Supabase Edge Function' },
  { pattern: 'from [\'"]@/lib/supabaseAdmin[\'"]', description: 'Deleted supabaseAdmin file import', isRegex: true },
  { pattern: 'from [\'"]@/lib/geminiClient[\'"]', description: 'Deleted geminiClient file import', isRegex: true },
  { pattern: 'from [\'"]\\.\\.?/supabaseAdmin[\'"]', description: 'Deleted supabaseAdmin relative import', isRegex: true },
  { pattern: 'openai.chat', description: 'OpenAI Chat API' },
  { pattern: 'new OpenAI(', description: 'OpenAI client instantiation' },
  { pattern: 'v1beta', description: 'Gemini v1beta API (deprecated)' },
  { pattern: 'gemini-1.0', description: 'Gemini 1.0 model (old)' },
  { pattern: 'gemini-pro-vision', description: 'Gemini Pro Vision (deprecated)' },
  { pattern: 'flash-latest', description: 'Gemini flash-latest (unstable)' },
  { pattern: '/supabase/functions', description: 'Supabase Edge Functions path' },
];

// Files/patterns that should always exist (not flagged as unused)
const ENTRY_POINTS = [
  'app/page.tsx',
  'app/layout.tsx',
  'app/globals.css',
  'middleware.ts',
  'next.config.js',
  'tailwind.config.ts',
  'tsconfig.json',
  'package.json',
];

// Route files are entry points (Next.js convention)
const ROUTE_PATTERNS = [
  /app\/.*\/page\.tsx$/,
  /app\/.*\/layout\.tsx$/,
  /app\/.*\/route\.ts$/,
  /app\/.*\/loading\.tsx$/,
  /app\/.*\/error\.tsx$/,
  /app\/.*\/not-found\.tsx$/,
];

// Results storage
const results = {
  unusedFiles: [],
  suspiciousFiles: [],
  deprecatedFiles: [],
  zeroImportFiles: [],
  recommendations: [],
};

// All files in project
let allFiles = [];
// Map of file -> files that import it
let importMap = new Map();

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    // Skip node_modules, .git, .next
    if (item.name === 'node_modules' || item.name === '.git' || item.name === '.next') {
      continue;
    }
    
    if (item.isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (CODE_EXTENSIONS.includes(path.extname(item.name))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Get relative path from root
 */
function relativePath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

/**
 * Check if file is an entry point (shouldn't be flagged as unused)
 */
function isEntryPoint(filePath) {
  const rel = relativePath(filePath);
  
  // Check explicit entry points
  if (ENTRY_POINTS.some(ep => rel === ep || rel.endsWith(ep))) {
    return true;
  }
  
  // Check route patterns
  if (ROUTE_PATTERNS.some(pattern => pattern.test(rel))) {
    return true;
  }
  
  return false;
}

/**
 * Extract imports from a file
 */
function extractImports(filePath) {
  const imports = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Match ES6 imports: import ... from '...'
    const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    // Match require(): require('...')
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    // Match dynamic imports: import('...')
    const dynamicRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
  } catch (err) {
    // Skip unreadable files
  }
  
  return imports;
}

/**
 * Resolve import path to actual file
 */
function resolveImport(importPath, fromFile) {
  // Skip external modules
  if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
    return null;
  }
  
  let resolved;
  
  if (importPath.startsWith('@/')) {
    // Resolve @/ alias to root
    resolved = path.join(ROOT, importPath.slice(2));
  } else {
    // Resolve relative import
    resolved = path.resolve(path.dirname(fromFile), importPath);
  }
  
  // Try different extensions
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
  
  for (const ext of extensions) {
    const tryPath = resolved + ext;
    if (fs.existsSync(tryPath) && fs.statSync(tryPath).isFile()) {
      return tryPath;
    }
  }
  
  return null;
}

/**
 * Build import map (who imports whom)
 */
function buildImportMap() {
  for (const file of allFiles) {
    const imports = extractImports(file);
    
    for (const imp of imports) {
      const resolved = resolveImport(imp, file);
      if (resolved) {
        if (!importMap.has(resolved)) {
          importMap.set(resolved, []);
        }
        importMap.get(resolved).push(file);
      }
    }
  }
}

/**
 * Check file for deprecated keywords
 */
function checkForDeprecated(filePath) {
  const findings = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    for (const { pattern, description, isRegex } of DEPRECATED_KEYWORDS) {
      if (isRegex) {
        // Use regex matching
        const regex = new RegExp(pattern, 'i');
        if (regex.test(content)) {
          findings.push({ pattern, description });
        }
      } else {
        // Use simple string matching
        if (content.toLowerCase().includes(pattern.toLowerCase())) {
          findings.push({ pattern, description });
        }
      }
    }
  } catch (err) {
    // Skip unreadable files
  }
  
  return findings;
}

/**
 * Check if file has any exports
 */
function hasExports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return /export\s+(default|const|function|class|type|interface|enum)/.test(content);
  } catch {
    return false;
  }
}

/**
 * Main scan function
 */
function scan() {
  console.log('\n🔍 === DEAD FILE SCANNER ===\n');
  console.log('Scanning directories:', SCAN_DIRS.join(', '));
  console.log('');
  
  // Collect all files
  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(ROOT, dir);
    getAllFiles(dirPath, allFiles);
  }
  
  console.log(`📁 Found ${allFiles.length} code files\n`);
  
  // Build import map
  console.log('🔗 Building import graph...');
  buildImportMap();
  
  // Analyze each file
  console.log('🔎 Analyzing files...\n');
  
  for (const file of allFiles) {
    const rel = relativePath(file);
    const importedBy = importMap.get(file) || [];
    const deprecatedFindings = checkForDeprecated(file);
    
    // Check for deprecated keywords
    if (deprecatedFindings.length > 0) {
      results.deprecatedFiles.push({
        file: rel,
        findings: deprecatedFindings,
      });
    }
    
    // Check for zero imports (excluding entry points)
    if (importedBy.length === 0 && !isEntryPoint(file)) {
      // Check if it exports anything (might be a utility that should be used)
      if (hasExports(file)) {
        results.zeroImportFiles.push({
          file: rel,
          hasExports: true,
        });
      }
    }
    
    // Check for suspicious patterns in filename
    const filename = path.basename(file).toLowerCase();
    const suspiciousPatterns = [
      { pattern: /\.test\.|\.spec\.|_test\./, reason: 'Test file' },
      { pattern: /\.old\.|-old\.|_old\./, reason: 'Old/backup file' },
      { pattern: /\.backup\.|-backup\.|_backup\./, reason: 'Backup file' },
      { pattern: /\.copy\.|-copy\.|_copy\.|\(1\)|\(copy\)/, reason: 'Copy/duplicate file' },
      { pattern: /\.temp\.|-temp\.|_temp\.|\.tmp\./, reason: 'Temporary file' },
    ];
    
    for (const { pattern, reason } of suspiciousPatterns) {
      if (pattern.test(filename)) {
        results.suspiciousFiles.push({
          file: rel,
          reason,
        });
        break;
      }
    }
  }
  
  // Generate recommendations
  generateRecommendations();
  
  // Print report
  printReport();
}

/**
 * Generate recommendations based on findings
 */
function generateRecommendations() {
  // Recommend deleting deprecated files
  for (const { file, findings } of results.deprecatedFiles) {
    results.recommendations.push({
      file,
      action: 'REVIEW',
      reason: `Contains deprecated code: ${findings.map(f => f.description).join(', ')}`,
    });
  }
  
  // Recommend reviewing zero-import files
  for (const { file } of results.zeroImportFiles) {
    results.recommendations.push({
      file,
      action: 'CHECK',
      reason: 'File has exports but is never imported',
    });
  }
  
  // Recommend deleting suspicious files
  for (const { file, reason } of results.suspiciousFiles) {
    results.recommendations.push({
      file,
      action: 'REVIEW',
      reason,
    });
  }
}

/**
 * Print the final report
 */
function printReport() {
  console.log('═'.repeat(60));
  console.log('📊 SCAN REPORT');
  console.log('═'.repeat(60));
  
  // Deprecated files
  console.log('\n🚨 FILES WITH DEPRECATED CODE:');
  console.log('─'.repeat(40));
  if (results.deprecatedFiles.length === 0) {
    console.log('   ✅ None found');
  } else {
    for (const { file, findings } of results.deprecatedFiles) {
      console.log(`   ⚠️  ${file}`);
      for (const f of findings) {
        console.log(`       - ${f.description} ("${f.pattern}")`);
      }
    }
  }
  
  // Zero import files
  console.log('\n📭 FILES WITH ZERO IMPORTS:');
  console.log('─'.repeat(40));
  if (results.zeroImportFiles.length === 0) {
    console.log('   ✅ None found');
  } else {
    for (const { file } of results.zeroImportFiles) {
      console.log(`   ❓ ${file}`);
    }
  }
  
  // Suspicious files
  console.log('\n🔍 SUSPICIOUS FILES:');
  console.log('─'.repeat(40));
  if (results.suspiciousFiles.length === 0) {
    console.log('   ✅ None found');
  } else {
    for (const { file, reason } of results.suspiciousFiles) {
      console.log(`   ⚠️  ${file}`);
      console.log(`       Reason: ${reason}`);
    }
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('─'.repeat(40));
  if (results.recommendations.length === 0) {
    console.log('   ✅ Project looks clean!');
  } else {
    for (const { file, action, reason } of results.recommendations) {
      const icon = action === 'DELETE' ? '🗑️' : action === 'REVIEW' ? '👀' : '❓';
      console.log(`   ${icon} [${action}] ${file}`);
      console.log(`       ${reason}`);
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📈 SUMMARY');
  console.log('═'.repeat(60));
  console.log(`   Total files scanned: ${allFiles.length}`);
  console.log(`   Deprecated code found: ${results.deprecatedFiles.length}`);
  console.log(`   Zero-import files: ${results.zeroImportFiles.length}`);
  console.log(`   Suspicious files: ${results.suspiciousFiles.length}`);
  console.log(`   Total recommendations: ${results.recommendations.length}`);
  console.log('');
  
  if (results.recommendations.length > 0) {
    console.log('⚠️  Review the recommendations above and manually delete if needed.');
    console.log('   Run `npm run cleanup` to auto-delete known legacy files.\n');
  } else {
    console.log('✅ Project is clean! No dead files detected.\n');
  }
}

// Run scanner
scan();
