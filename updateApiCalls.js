/**
 * Automated script to update all API calls to use the new API utility
 * Run with: node updateApiCalls.js
 */

const fs = require('fs');
const path = require('path');

// Directories to scan
const directoriesToScan = [
  'src/farmer',
  'src/transport-dealer',
  'src/admin',
  'src/components',
  'src/pages'
];

// Track statistics
let filesProcessed = 0;
let filesUpdated = 0;
const updatedFiles = [];

function updateFileContent(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changed = false;

    // Skip if already imports from api.js
    if (content.includes('from "../utils/api"') || content.includes('from "../../utils/api"')) {
      console.log(`⏭️  Skipping ${filePath} - already updated`);
      return false;
    }

    // Skip auth pages (Login, Register, etc.) - they don't need 401 handling
    if (filePath.includes('Login.js') || filePath.includes('Register.js') || 
        filePath.includes('ForgotPassword.js') || filePath.includes('ResetPassword.js')) {
      console.log(`⏭️  Skipping ${filePath} - auth page`);
      return false;
    }

    // 1. Remove API_URL constant
    if (content.includes('const API_URL = "http://localhost:8081/api";')) {
      content = content.replace(/const API_URL = "http:\/\/localhost:8081\/api";\n*/g, '');
      changed = true;
    }

    // 2. Add import statement
    if (content.includes('fetch(`${API_URL}') || content.includes('fetch("http://localhost:8081')) {
      // Determine import path based on file location
      const depth = filePath.split(path.sep).filter(p => p === 'src').length;
      const relativePath = filePath.includes('components' + path.sep) ? '.' : '..';
      
      // Find the last import statement
      const importRegex = /^import .+ from .+;$/gm;
      const imports = content.match(importRegex);
      
      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const importToAdd = `import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "${relativePath}/utils/api";`;
        
        // Add after last import
        content = content.replace(lastImport, lastImport + '\n' + importToAdd);
        changed = true;
      }
    }

    // 3. Replace fetch calls with API utility
    // Pattern: await fetch(`${API_URL}/endpoint`, ...)
    content = content.replace(
      /const response = await fetch\(`\$\{API_URL\}\/([^`]+)`\);[\s\S]*?const data = await response\.json\(\);/g,
      (match, endpoint) => {
        changed = true;
        return `const data = await apiGet("${endpoint}");`;
      }
    );

    // Pattern: await fetch(`${API_URL}/endpoint`, {method: "POST", headers, body})
    content = content.replace(
      /const response = await fetch\(`\$\{API_URL\}\/([^`]+)`, \{[\s\S]*?method: ["']POST["'][\s\S]*?body: JSON\.stringify\(([^)]+)\)[\s\S]*?\}\);/g,
      (match, endpoint, bodyVar) => {
        changed = true;
        return `const response = await apiPost("${endpoint}", ${bodyVar});`;
      }
    );

    // Pattern: await fetch with query params
    content = content.replace(
      /await fetch\(`\$\{API_URL\}\/([^`]+)\?([^`]+)`\)/g,
      (match, endpoint, params) => {
        changed = true;
        return `await apiGet("${endpoint}?${params}")`;
      }
    );

    // 4. Save if changed
    if (changed && content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function scanDirectory(dir) {
  const fullPath = path.join(__dirname, dir);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Directory not found: ${dir}`);
    return;
  }

  const files = fs.readdirSync(fullPath);

  files.forEach(file => {
    const filePath = path.join(fullPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively scan subdirectories
      scanDirectory(path.join(dir, file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      filesProcessed++;
      const updated = updateFileContent(filePath);
      
      if (updated) {
        filesUpdated++;
        updatedFiles.push(filePath.replace(__dirname + path.sep, ''));
        console.log(`✅ Updated: ${filePath.replace(__dirname + path.sep, '')}`);
      }
    }
  });
}

console.log('🚀 Starting API call migration...\n');

directoriesToScan.forEach(dir => {
  console.log(`\n📁 Scanning: ${dir}`);
  scanDirectory(dir);
});

console.log(`\n\n📊 Summary:`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Files updated: ${filesUpdated}`);
console.log(`\n✅ Migration complete!`);

if (updatedFiles.length > 0) {
  console.log('\n📝 Updated files:');
  updatedFiles.forEach(file => console.log(`   - ${file}`));
}
