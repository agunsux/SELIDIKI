// runtime/StartupReport.js
/**
 * StartupReport — ARGUS v1.1
 *
 * Generates a comprehensive startup report showing:
 * - Environment validation results
 * - Dependency availability
 * - Overall system readiness
 */

const RuntimeValidator = require('./RuntimeValidator');
const { STATUS } = require('./DependencyChecker');

class StartupReport {
  /**
   * Generate full startup report.
   * @returns {Promise<Object>}
   */
  static async generate() {
    const startTime = Date.now();
    const runtime = await RuntimeValidator.runAllChecks();
    const elapsed = Date.now() - startTime;

    return {
      service: 'ARGUS',
      version: require('../package.json').version,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      },
      environment: runtime.environment,
      dependencies: runtime.dependencies,
      summary: {
        ...runtime.summary,
        diagnosticTimeMs: elapsed,
      },
      recommendation: this._getRecommendation(runtime.summary.status),
    };
  }

  /**
   * Generate a concise startup summary for console logging.
   * @returns {Promise<string>}
   */
  static async consoleSummary() {
    const report = await this.generate();
    const lines = [];
    const { summary, environment, dependencies } = report;

    lines.push('');
    lines.push('┌─────────────────────────────────────────┐');
    lines.push('│  ARGUS Startup Report                   │');
    lines.push('├─────────────────────────────────────────┤');

    // Environment summary
    for (const [domain, result] of Object.entries(environment)) {
      const icon = result.status === STATUS.AVAILABLE ? '✓' : result.status === STATUS.DEGRADED ? '~' : '✗';
      lines.push(`│  ${icon} ${domain.padEnd(16)} ${result.status.padEnd(12)} │`);
    }

    lines.push('├─────────────────────────────────────────┤');

    // Dependency summary
    for (const [name, dep] of Object.entries(dependencies)) {
      const icon = dep.status === STATUS.AVAILABLE ? '✓' : dep.status === STATUS.DEGRADED ? '~' : '✗';
      const namePad = name.padEnd(16);
      lines.push(`│  ${icon} ${namePad} ${dep.status.padEnd(12)} │`);
    }

    lines.push('├─────────────────────────────────────────┤');
    lines.push(`│  Overall: ${summary.status.padEnd(25)} │`);
    lines.push(`│  ${summary.available} available, ${summary.degraded} degraded, ${summary.unavailable} unavailable`);
    lines.push(`│  Diagnosed in ${summary.diagnosticTimeMs}ms`);
    lines.push('└─────────────────────────────────────────┘');
    lines.push('');

    return lines.join('\n');
  }

  static _getRecommendation(status) {
    switch (status) {
      case STATUS.AVAILABLE:
        return 'All systems operational. Normal operation.';
      case STATUS.DEGRADED:
        return 'Some non-critical dependencies unavailable. Check optional environment variables.';
      case STATUS.UNAVAILABLE:
        return 'Critical dependencies missing. Review environment configuration and service status.';
      default:
        return 'Unable to determine system readiness.';
    }
  }
}

module.exports = StartupReport;