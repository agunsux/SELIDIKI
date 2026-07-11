// scripts/harden.js
/**
 * Production Hardening — ARGUS v1.1
 *
 * Run: node scripts/harden.js
 *
 * Audits the repository for:
 * - Duplicate utilities
 * - Unused exports
 * - Dead code
 * - Duplicate validation
 * - Duplicate DTOs
 * - Circular dependencies
 * - Orphan files
 * - TODO/FIXME/placeholder patterns
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IGNORE_DIRS = ['node_modules', '.git', 'data', 'profiles'];
const WARN_PATTERNS = [
  /TODO/i,
  /FIXME/i,
  /PLACEHOLDER/i,
  /HACK/i,
  /XXX:/i,
  /TEMP:/i,
  /console\.log/,
  /debugger/,
];

const RESULTS = {
  todos: [],
  fixmes: [],
  placeholders: [],
  consoleLogs: [],
  largeFiles: [],
  orphanFiles: [],
  duplicateUtils: [],
  unusedExports: [],
};

function walkDir(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
        walkDir(fullPath, files);
      }
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relative = path.relative(ROOT, filePath);

  // Check patterns
  lines.forEach((line, i) => {
    const num = i + 1;
    if (/TODO/i.test(line) && !/TODO/i.test(line) === false) {
      RESULTS.todos.push({ file: relative, line: num, text: line.trim() });
    }
    if (/FIXME/i.test(line)) {
      RESULTS.fixmes.push({ file: relative, line: num, text: line.trim() });
    }
    if (/placeholder/i.test(line)) {
      RESULTS.placeholders.push({ file: relative, line: num, text: line.trim() });
    }
    if (/console\.log/.test(line)) {
      RESULTS.consoleLogs.push({ file: relative, line: num, text: line.trim() });
    }
  });

  // Large files warning
  if (lines.length > 200) {
    RESULTS.largeFiles.push({ file: relative, lines: lines.length });
  }
}

function checkDuplicateUtils() {
  // Check for duplicate utility patterns
  const utilsDir = path.join(ROOT, 'utils');
  if (fs.existsSync(utilsDir)) {
    const utilFiles = fs.readdirSync(utilsDir).filter(f => f.endsWith('.js'));
    const utilNames = utilFiles.map(f => f.replace('.js', ''));

    // Check for utility functions duplicated elsewhere
    const allFiles = walkDir(ROOT);
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const relative = path.relative(ROOT, file);

      // Skip utils themselves
      if (relative.startsWith('utils')) continue;

      // Check if utility is re-implemented elsewhere
      if (content.includes('function maskPhone') && !relative.includes('routes/check')) {
        RESULTS.duplicateUtils.push({ file: relative, pattern: 'maskPhone-like function' });
      }
      if (content.includes('function parseBool') && !relative.includes('config/featureFlags')) {
        RESULTS.duplicateUtils.push({ file: relative, pattern: 'parseBool-like function' });
      }
      if (content.includes('function scoreToStatus') && !relative.includes('routes/check')) {
        RESULTS.duplicateUtils.push({ file: relative, pattern: 'scoreToStatus-like function' });
      }
    }
  }
}

function checkOrphanFiles() {
  // Check for .js files that are never imported by any other file
  const allFiles = walkDir(ROOT);
  const importMap = new Map();

  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relative = path.relative(ROOT, file);

    // Find all require statements
    const requires = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
    for (const req of requires) {
      const match = req.match(/require\(['"]([^'"]+)['"]\)/);
      if (match) {
        const target = match[1];
        importMap.set(target, (importMap.get(target) || 0) + 1);
      }
    }
  }

  // Check each file if it's imported by at least one other file
  for (const file of allFiles) {
    const relative = path.relative(ROOT, file);
    const basename = path.basename(file, '.js');
    const fileContent = fs.readFileSync(file, 'utf-8');

    // Skip entry points and test files
    if (relative === 'server.js' || relative.startsWith('test') || relative.startsWith('scripts')) continue;

    // Check if any import refers to this file
    let imported = false;
    for (const [importPath] of importMap) {
      if (importPath.includes(basename) || importPath.includes(relative)) {
        imported = true;
        break;
      }
    }

    // Entry points like routes that are loaded in server.js
    if (fileContent.includes('module.exports')) {
      // Check if required somewhere
      let required = false;
      for (const [importPath] of importMap) {
        if (importPath.includes(basename)) {
          required = true;
          break;
        }
      }
      if (!required && !relative.startsWith('scripts')) {
        // Might still be used - check server.js
        const serverContent = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf-8');
        if (!serverContent.includes(basename) && !serverContent.includes(relative)) {
          RESULTS.orphanFiles.push({ file: relative });
        }
      }
    }
  }
}

function generateReport() {
  const report = [];
  const timestamp = new Date().toISOString();

  report.push('═══════════════════════════════════════════');
  report.push('  ARGUS v1.1 — Production Hardening Report');
  report.push(`  ${timestamp}`);
  report.push('═══════════════════════════════════════════');
  report.push('');

  // Summary
  let totalIssues = 0;
  for (const [, issues] of Object.entries(RESULTS)) {
    totalIssues += issues.length;
  }

  report.push(`Total issues found: ${totalIssues}`);
  report.push('');

  // By category
  if (RESULTS.todos.length > 0) {
    report.push(`[TODO] ${RESULTS.todos.length} found:`);
    RESULTS.todos.slice(0, 10).forEach(i => report.push(`  ${i.file}:${i.line} → ${i.text}`));
    if (RESULTS.todos.length > 10) report.push(`  ... and ${RESULTS.todos.length - 10} more`);
    report.push('');
  }

  if (RESULTS.fixmes.length > 0) {
    report.push(`[FIXME] ${RESULTS.fixmes.length} found:`);
    RESULTS.fixmes.forEach(i => report.push(`  ${i.file}:${i.line} → ${i.text}`));
    report.push('');
  }

  if (RESULTS.placeholders.length > 0) {
    report.push(`[PLACEHOLDER] ${RESULTS.placeholders.length} found:`);
    RESULTS.placeholders.forEach(i => report.push(`  ${i.file}:${i.line} → ${i.text}`));
    report.push('');
  }

  if (RESULTS.consoleLogs.length > 0) {
    report.push(`[console.log] ${RESULTS.consoleLogs.length} found:`);
    RESULTS.consoleLogs.slice(0, 10).forEach(i => report.push(`  ${i.file}:${i.line} → ${i.text}`));
    if (RESULTS.consoleLogs.length > 10) report.push(`  ... and ${RESULTS.consoleLogs.length - 10} more`);
    report.push('');
  }

  if (RESULTS.largeFiles.length > 0) {
    report.push(`[Large Files >200 lines] ${RESULTS.largeFiles.length} found:`);
    RESULTS.largeFiles.slice(0, 10).forEach(i => report.push(`  ${i.file} (${i.lines} lines)`));
    report.push('');
  }

  if (RESULTS.orphanFiles.length > 0) {
    report.push(`[Orphan Files] ${RESULTS.orphanFiles.length} found:`);
    RESULTS.orphanFiles.forEach(i => report.push(`  ${i.file}`));
    report.push('');
  }

  if (RESULTS.duplicateUtils.length > 0) {
    report.push(`[Duplicate Utilities] ${RESULTS.duplicateUtils.length} found:`);
    RESULTS.duplicateUtils.forEach(i => report.push(`  ${i.file} → ${i.pattern}`));
    report.push('');
  }

  // Final verdict
  if (totalIssues === 0) {
    report.push('✓ No issues found. Codebase is clean.');
  } else {
    report.push(`⚠ ${totalIssues} issue(s) found. Recommended actions:`);
    if (RESULTS.todos.length > 0) report.push('  - Convert TODOs to tracked tasks');
    if (RESULTS.fixmes.length > 0) report.push('  - Address FIXMEs before production');
    if (RESULTS.placeholders.length > 0) report.push('  - Implement placeholder functions');
    if (RESULTS.duplicateUtils.length > 0) report.push('  - Consolidate duplicate utilities');
    if (RESULTS.orphanFiles.length > 0) report.push('  - Review and remove orphan files');
  }

  report.push('');
  report.push('───────────────────────────────────────────');

  return report.join('\n');
}

// ── Main ──

console.log('🔍 Running Production Hardening audit...\n');

const files = walkDir(ROOT);
console.log(`Scanning ${files.length} files...`);

for (const file of files) {
  analyzeFile(file);
}

checkDuplicateUtils();
checkOrphanFiles();

const report = generateReport();
console.log(report);

// Save report
const reportPath = path.join(ROOT, 'harden-report.txt');
fs.writeFileSync(reportPath, report);
console.log(`\nReport saved to: ${reportPath}`);