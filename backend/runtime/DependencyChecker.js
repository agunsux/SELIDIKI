// runtime/DependencyChecker.js
/**
 * DependencyChecker — ARGUS v1.1
 *
 * Checks every startup dependency and returns status.
 * No redesign, no breaking changes.
 */

const dns = require('dns').promises;
const net = require('net');

const STATUS = {
  AVAILABLE: 'AVAILABLE',
  DEGRADED: 'DEGRADED',
  UNAVAILABLE: 'UNAVAILABLE',
  UNKNOWN: 'UNKNOWN',
};

class DependencyChecker {
  /**
   * Check a single dependency by URL/host.
   * @param {string} name - Dependency name
   * @param {string} urlOrHost - Connection URL or hostname
   * @param {number} [timeout=5000] - Timeout in ms
   * @returns {Promise<{name: string, status: string, latency: number}>}
   */
  static async checkUrl(name, urlOrHost, timeout = 5000) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const resp = await fetch(urlOrHost, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timer);
      const latency = Date.now() - start;
      return {
        name,
        status: resp.ok ? STATUS.AVAILABLE : STATUS.DEGRADED,
        latency,
        statusCode: resp.status,
      };
    } catch (err) {
      const latency = Date.now() - start;
      if (err.name === 'AbortError') {
        return { name, status: STATUS.UNAVAILABLE, latency, error: 'timeout' };
      }
      // Try DNS resolution fallback
      try {
        const host = new URL(urlOrHost).hostname;
        await dns.resolve(host);
        return { name, status: STATUS.DEGRADED, latency, error: 'connect_failed_dns_ok' };
      } catch {
        return { name, status: STATUS.UNAVAILABLE, latency, error: err.message };
      }
    }
  }

  /**
   * Check TCP connectivity to a host:port.
   */
  static checkTcp(name, host, port, timeout = 3000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      socket.on('connect', () => {
        const latency = Date.now() - start;
        socket.destroy();
        resolve({ name, status: STATUS.AVAILABLE, latency });
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ name, status: STATUS.UNAVAILABLE, latency: Date.now() - start, error: 'timeout' });
      });
      socket.on('error', (err) => {
        socket.destroy();
        resolve({ name, status: STATUS.UNAVAILABLE, latency: Date.now() - start, error: err.message });
      });
      socket.connect(port, host);
    });
  }

  /**
   * Check environment variable is set and non-empty.
   */
  static checkEnv(name, envVar) {
    const val = process.env[envVar];
    if (val && val.length > 0 && val !== 'undefined' && val !== 'null') {
      return { name, status: STATUS.AVAILABLE, envVar };
    }
    return { name, status: STATUS.UNAVAILABLE, envVar, error: `${envVar} not set` };
  }

  /**
   * Check a module can be required.
   */
  static checkModule(name, modulePath) {
    try {
      require.resolve(modulePath);
      return { name, status: STATUS.AVAILABLE };
    } catch (err) {
      return { name, status: STATUS.UNAVAILABLE, error: `module ${modulePath} not found` };
    }
  }
}

module.exports = { DependencyChecker, STATUS };