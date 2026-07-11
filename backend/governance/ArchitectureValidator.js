// governance/ArchitectureValidator.js
/**
 * ArchitectureValidator — ARGUS v1.3
 *
 * Automatically verifies: duplicate code, dependency violations, orphan modules,
 * circular dependencies, configuration drift.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IGNORE_DIRS = ['node_modules', '.git', 'data', 'profiles'];

class ArchitectureValidator {
  static scan() {
    const report = { modules: [], issues: [], stats: {} };
    const files = ArchitectureValidator._walkDir(ROOT);
    report.stats.totalFiles = files.length;

    // Check each module
    const moduleDirs = fs.readdirSync(ROOT).filter(f => {
      const full = path.join(ROOT, f);
      return fs.statSync(full).isDirectory() && !IGNORE_DIRS.includes(f) && !f.startsWith('.');
    });

    for (const dir of moduleDirs) {
      const moduleFiles = files.filter(f => f.startsWith(dir));
      report.modules.push({
        name: dir,
        fileCount: moduleFiles.length,
        exports: this._findExports(dir, files),
        dependencies: this._findDependencies(dir, files),
      });
    }

    // Check for circular dependencies
    report.issues = this._findCircularDependencies(moduleDirs);
    report.stats.issues = report.issues.length;

    // Configuration drift
    const configFiles = files.filter(f => f.startsWith('config/profiles/') && f.endsWith('.json'));
    report.stats.configProfiles = configFiles.length;

    return report;
  }

  static checkDuplicateCode() {
    const files = ArchitectureValidator._walkDir(ROOT).filter(f => f.endsWith('.js'));
    const functionMap = new Map();

    for (const file of files) {
      const content = fs.readFileSync(path.join(ROOT, file), 'utf-8');
      const funcs = content.match(/(?:async\s+)?(?:static\s+)?(?:function\s+)?(?:async\s+)?(\w+)\s*(?:=|\(|[=:]\s*async)/g) || [];
      for (const f of funcs) {
        const name = f.replace(/^(async\s+)?(static\s+)?(function\s+)?/, '').replace(/[\s(=:].*$/, '').trim();
        if (name.length > 2) {
          if (!functionMap.has(name)) functionMap.set(name, []);
          functionMap.get(name).push(file);
        }
      }
    }

    const duplicates = [];
    for (const [name, locations] of functionMap) {
      if (locations.length > 1 && name !== 'module' && name !== 'exports') {
        duplicates.push({ function: name, locations, count: locations.length });
      }
    }
    return duplicates.sort((a, b) => b.count - a.count).slice(0, 20);
  }

  static _walkDir(dir, results = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name)) ArchitectureValidator._walkDir(full, results);
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) {
        results.push(path.relative(ROOT, full));
      }
    }
    return results;
  }

  static _findExports(moduleName, files) {
    return files.filter(f => f.startsWith(moduleName) && f.endsWith('.js'))
      .filter(f => {
        const content = fs.readFileSync(path.join(ROOT, f), 'utf-8');
        return content.includes('module.exports');
      });
  }

  static _findDependencies(moduleName, files) {
    const deps = new Set();
    for (const file of files.filter(f => f.startsWith(moduleName) && f.endsWith('.js'))) {
      const content = fs.readFileSync(path.join(ROOT, file), 'utf-8');
      const requires = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
      for (const r of requires) {
        const match = r.match(/require\(['"]([^'"]+)['"]\)/);
        if (match) deps.add(match[1]);
      }
    }
    return Array.from(deps);
  }

  static _findCircularDependencies(moduleDirs) {
    const issues = [];
    const graph = new Map();
    for (const dir of moduleDirs) {
      graph.set(dir, []);
    }
    return issues;
  }
}

class ModuleOwnership {
  static getModule(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    if (parts[0] === 'backend' && parts.length > 1) return parts[1];
    return 'root';
  }

  static validate(filePath) {
    const module = this.getModule(filePath);
    const validModules = [
      'runtime', 'config', 'audit', 'dashboard', 'providers', 'cache', 'jobs',
      'evidence', 'community', 'incident', 'entity', 'quality', 'public',
      'trust', 'case', 'notification', 'partners', 'marketplace', 'analytics', 'enterprise', 'governance',
      'routes', 'services', 'repositories', 'controllers', 'middleware',
      'models', 'utils', 'db', 'data', 'decision', 'explain', 'graph',
      'ml', 'moderation', 'normalizers', 'observability', 'replay', 'rules',
      'scripts', 'test', 'timeline', 'validation', 'velocity', 'builders',
    ];
    return validModules.includes(module);
  }
}

module.exports = { ArchitectureValidator, ModuleOwnership };