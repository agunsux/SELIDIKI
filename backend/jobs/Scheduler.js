// jobs/Scheduler.js
/**
 * Scheduler — ARGUS v1.1
 *
 * Manages scheduled recurring jobs.
 * Supports: dataset import, provider sync, report processing, cache warming, cleanup.
 * Integrates with JobQueue for execution.
 */

const { JobQueue } = require('./JobQueue');

class Scheduler {
  constructor() {
    this._scheduledJobs = new Map();
    this._jobQueue = null;
  }

  /**
   * Initialize the scheduler with a JobQueue instance.
   * @param {JobQueue} jobQueue
   */
  init(jobQueue) {
    this._jobQueue = jobQueue;
  }

  /**
   * Schedule a recurring job.
   * @param {string} name - Job name
   * @param {Object} config
   * @param {Function} config.handler - Async function
   * @param {number} config.intervalMs - Run interval in milliseconds
   * @param {number} [config.priority=0]
   * @param {Object} [config.data] - Static data passed to handler
   * @returns {string} Scheduler ID
   */
  schedule(name, config) {
    if (!this._jobQueue) {
      throw new Error('Scheduler not initialized. Call init() first.');
    }

    const id = this._jobQueue.schedule(
      {
        type: name,
        handler: config.handler,
        data: config.data || {},
        priority: config.priority || 0,
      },
      config.intervalMs
    );

    this._scheduledJobs.set(name, {
      id,
      name,
      intervalMs: config.intervalMs,
      createdAt: new Date().toISOString(),
    });

    console.log(`Scheduler: Scheduled "${name}" every ${config.intervalMs}ms`);
    return id;
  }

  /**
   * Cancel a scheduled job.
   * @param {string} name
   */
  cancel(name) {
    const job = this._scheduledJobs.get(name);
    if (job) {
      this._jobQueue.cancelSchedule(job.id);
      this._scheduledJobs.delete(name);
      console.log(`Scheduler: Cancelled "${name}"`);
    }
  }

  /**
   * Get all scheduled jobs.
   * @returns {Object[]}
   */
  list() {
    return Array.from(this._scheduledJobs.values());
  }

  /**
   * Cancel all scheduled jobs.
   */
  cancelAll() {
    for (const [name] of this._scheduledJobs) {
      this.cancel(name);
    }
  }

  /**
   * Register standard scheduled jobs.
   * Call this once at startup.
   */
  registerStandardJobs() {
    // Cache warming every 5 minutes
    this.schedule('cache_warming', {
      handler: async () => {
        const cacheWarm = require('../cache/CacheWarming');
        await cacheWarm.warm();
      },
      intervalMs: 5 * 60 * 1000,
      priority: 1,
    });

    // Audit log cleanup daily
    this.schedule('audit_cleanup', {
      handler: async () => {
        const AuditRetention = require('../audit/AuditRetention');
        await AuditRetention.purgeOldLogs(90);
      },
      intervalMs: 24 * 60 * 60 * 1000,
      priority: 0,
    });

    // Provider health check every 60 seconds
    this.schedule('provider_health', {
      handler: async () => {
        const providerManager = require('../providers/ProviderManager');
        await providerManager.healthCheck();
      },
      intervalMs: 60 * 1000,
      priority: 2,
    });

    // Metrics collection every 30 seconds
    this.schedule('metrics_collection', {
      handler: async () => {
        const MetricsCollector = require('../observability/MetricsCollector');
        const collector = new MetricsCollector();
        await collector.collectSystemMetrics();
      },
      intervalMs: 30 * 1000,
      priority: 3,
    });

    // Dataset import scheduler (if data directory has new files)
    this.schedule('dataset_import', {
      handler: async () => {
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.resolve(__dirname, '../data');
        if (fs.existsSync(dataDir)) {
          const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv') || f.endsWith('.json'));
          for (const file of files) {
            console.log(`Scheduler: Found dataset file for import: ${file}`);
          }
        }
      },
      intervalMs: 15 * 60 * 1000,
      priority: 0,
    });
  }
}

module.exports = new Scheduler();