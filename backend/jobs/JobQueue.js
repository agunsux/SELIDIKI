// jobs/JobQueue.js
/**
 * JobQueue — ARGUS v1.1
 *
 * Simple background job queue with retry, scheduling, and dead letter queue support.
 * Supports: dataset import, provider sync, report processing, cache warming, cleanup.
 */

const EventEmitter = require('events');

const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying',
  DEAD_LETTER: 'dead_letter',
  CANCELLED: 'cancelled',
};

class JobQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this._queue = [];
    this._running = new Map();
    this._concurrency = options.concurrency || 5;
    this._activeCount = 0;
    this._processing = false;
    this._retryDelays = options.retryDelays || [1000, 5000, 15000, 30000, 60000];
    this._deadLetterQueue = [];
  }

  /**
   * Add a job to the queue.
   * @param {Object} job
   * @param {string} job.type - Job type identifier
   * @param {Function} job.handler - Async function to execute
   * @param {Object} [job.data] - Job payload
   * @param {number} [job.priority=0] - Higher = more urgent
   * @param {string} [job.id] - Custom job ID
   * @returns {string} Job ID
   */
  add(job) {
    const id = job.id || `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const entry = {
      id,
      type: job.type,
      handler: job.handler,
      data: job.data || {},
      priority: job.priority || 0,
      status: JOB_STATUS.PENDING,
      retryCount: 0,
      maxRetries: job.maxRetries || 3,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
      result: null,
    };

    this._queue.push(entry);
    this._queue.sort((a, b) => b.priority - a.priority);
    this.emit('added', entry);
    this._processNext();

    return id;
  }

  /**
   * Schedule a recurring job.
   * @param {Object} job - Job definition
   * @param {number} intervalMs - Interval in milliseconds
   * @returns {string} Scheduler ID
   */
  schedule(job, intervalMs) {
    const schedulerId = `scheduler_${Date.now()}`;

    const run = () => {
      this.add({
        ...job,
        id: `${job.type}_${Date.now()}`,
      });
    };

    // Run immediately, then on interval
    run();
    const timer = setInterval(run, intervalMs);

    this._running.set(schedulerId, { timer, type: job.type });
    return schedulerId;
  }

  /**
   * Cancel a scheduled job.
   * @param {string} schedulerId
   */
  cancelSchedule(schedulerId) {
    const entry = this._running.get(schedulerId);
    if (entry) {
      clearInterval(entry.timer);
      this._running.delete(schedulerId);
    }
  }

  /**
   * Get job status.
   * @param {string} id
   * @returns {Object|null}
   */
  getStatus(id) {
    // Check running jobs
    const running = this._queue.find(j => j.id === id);
    if (running) return running;

    // Check dead letter queue
    const dead = this._deadLetterQueue.find(j => j.id === id);
    return dead || null;
  }

  /**
   * Get queue statistics.
   * @returns {Object}
   */
  getStats() {
    return {
      pending: this._queue.filter(j => j.status === JOB_STATUS.PENDING).length,
      running: this._activeCount,
      completed: this._queue.filter(j => j.status === JOB_STATUS.COMPLETED).length,
      failed: this._queue.filter(j => j.status === JOB_STATUS.FAILED).length,
      deadLetter: this._deadLetterQueue.length,
      total: this._queue.length + this._deadLetterQueue.length,
    };
  }

  /**
   * Get dead letter queue contents.
   * @returns {Object[]}
   */
  getDeadLetterQueue() {
    return [...this._deadLetterQueue];
  }

  /**
   * Retry a dead letter job.
   * @param {string} id
   * @returns {boolean}
   */
  retryDeadLetter(id) {
    const idx = this._deadLetterQueue.findIndex(j => j.id === id);
    if (idx === -1) return false;

    const job = this._deadLetterQueue.splice(idx, 1)[0];
    job.status = JOB_STATUS.PENDING;
    job.retryCount = 0;
    job.error = null;
    this._queue.push(job);
    this._processNext();
    return true;
  }

  /**
   * Cancel a pending job.
   * @param {string} id
   * @returns {boolean}
   */
  cancel(id) {
    const idx = this._queue.findIndex(j => j.id === id && j.status === JOB_STATUS.PENDING);
    if (idx === -1) return false;
    this._queue[idx].status = JOB_STATUS.CANCELLED;
    return true;
  }

  // ── Private ──

  async _processNext() {
    if (this._processing) return;
    this._processing = true;

    while (this._activeCount < this._concurrency) {
      const pending = this._queue.findIndex(
        j => j.status === JOB_STATUS.PENDING || j.status === JOB_STATUS.RETRYING
      );
      if (pending === -1) break;

      const job = this._queue[pending];
      job.status = JOB_STATUS.RUNNING;
      job.startedAt = new Date().toISOString();
      this._activeCount++;
      this.emit('started', job);

      this._executeJob(job).finally(() => {
        this._activeCount--;
        this._processNext();
      });
    }

    this._processing = false;
  }

  async _executeJob(job) {
    try {
      const result = await job.handler(job.data);
      job.status = JOB_STATUS.COMPLETED;
      job.completedAt = new Date().toISOString();
      job.result = result;
      this.emit('completed', job);
    } catch (err) {
      job.error = err.message;
      job.retryCount++;

      if (job.retryCount < job.maxRetries) {
        job.status = JOB_STATUS.RETRYING;
        const delay = this._retryDelays[Math.min(job.retryCount - 1, this._retryDelays.length - 1)];
        this.emit('retrying', { job, retryCount: job.retryCount, delay });

        setTimeout(() => {
          this._processNext();
        }, delay);
      } else {
        // Move to dead letter queue
        job.status = JOB_STATUS.DEAD_LETTER;
        job.completedAt = new Date().toISOString();
        this._deadLetterQueue.push(job);
        this.emit('dead_letter', job);
      }
    }
  }
}

module.exports = { JobQueue, JOB_STATUS };