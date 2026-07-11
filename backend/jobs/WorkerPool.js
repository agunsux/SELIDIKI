// jobs/WorkerPool.js
/**
 * WorkerPool — ARGUS v1.1
 *
 * Manages a pool of workers to execute background jobs.
 * Supports concurrency limits, graceful shutdown, and metrics.
 */

class WorkerPool {
  /**
   * @param {Object} options
   * @param {number} [options.minWorkers=1] - Minimum worker count
   * @param {number} [options.maxWorkers=10] - Maximum worker count
   * @param {number} [options.idleTimeoutMs=30000] - Worker idle timeout before scale-down
   */
  constructor(options = {}) {
    this._minWorkers = options.minWorkers || 1;
    this._maxWorkers = options.maxWorkers || 10;
    this._idleTimeoutMs = options.idleTimeoutMs || 30000;
    this._workers = new Map();
    this._taskQueue = [];
    this._shuttingDown = false;
    this._metrics = {
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksTotal: 0,
    };

    // Initialize minimum workers
    for (let i = 0; i < this._minWorkers; i++) {
      this._addWorker();
    }
  }

  /**
   * Submit a task to the pool.
   * @param {Function} task - Async function
   * @param {Object} [context] - Context data for the task
   * @returns {Promise<any>}
   */
  submit(task, context = {}) {
    return new Promise((resolve, reject) => {
      this._taskQueue.push({ task, context, resolve, reject });
      this._metrics.tasksTotal++;
      this._assignWork();
    });
  }

  /**
   * Get pool statistics.
   * @returns {Object}
   */
  getStats() {
    return {
      ...this._metrics,
      activeWorkers: this._getActiveWorkerCount(),
      idleWorkers: this._getIdleWorkerCount(),
      totalWorkers: this._workers.size,
      queueDepth: this._taskQueue.length,
      minWorkers: this._minWorkers,
      maxWorkers: this._maxWorkers,
    };
  }

  /**
   * Gracefully shut down the pool.
   * @param {number} [timeoutMs=10000] - Wait timeout for active tasks
   * @returns {Promise<void>}
   */
  async shutdown(timeoutMs = 10000) {
    this._shuttingDown = true;

    // Wait for active tasks to complete
    const waitPromise = new Promise((resolve) => {
      const check = () => {
        if (this._getActiveWorkerCount() === 0) resolve();
        else setTimeout(check, 100);
      };
      check();
    });

    await Promise.race([
      waitPromise,
      new Promise(resolve => setTimeout(resolve, timeoutMs)),
    ]);

    // Terminate all workers
    for (const [id, worker] of this._workers) {
      if (worker.timer) clearTimeout(worker.timer);
      this._workers.delete(id);
    }

    // Clear remaining tasks
    for (const entry of this._taskQueue) {
      entry.reject(new Error('WorkerPool shutting down'));
    }
    this._taskQueue = [];
  }

  _addWorker() {
    const id = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this._workers.set(id, {
      id,
      busy: false,
      timer: null,
      createdAt: new Date(),
    });
    return id;
  }

  _removeWorker(id) {
    const worker = this._workers.get(id);
    if (worker) {
      if (worker.timer) clearTimeout(worker.timer);
      this._workers.delete(id);
    }
  }

  _getActiveWorkerCount() {
    let count = 0;
    for (const [, worker] of this._workers) {
      if (worker.busy) count++;
    }
    return count;
  }

  _getIdleWorkerCount() {
    let count = 0;
    for (const [, worker] of this._workers) {
      if (!worker.busy) count++;
    }
    return count;
  }

  _assignWork() {
    if (this._shuttingDown || this._taskQueue.length === 0) return;

    // Find an idle worker or create a new one if under max
    let worker = null;
    for (const [, w] of this._workers) {
      if (!w.busy) {
        worker = w;
        break;
      }
    }

    if (!worker && this._workers.size < this._maxWorkers) {
      const id = this._addWorker();
      worker = this._workers.get(id);
    }

    if (!worker) return; // All workers busy

    const task = this._taskQueue.shift();
    worker.busy = true;
    if (worker.timer) clearTimeout(worker.timer);

    Promise.resolve()
      .then(() => task.task(task.context))
      .then(
        (result) => {
          this._metrics.tasksCompleted++;
          task.resolve(result);
        },
        (err) => {
          this._metrics.tasksFailed++;
          task.reject(err);
        }
      )
      .finally(() => {
        worker.busy = false;
        // Set idle timeout for scale-down
        if (this._workers.size > this._minWorkers && !this._shuttingDown) {
          worker.timer = setTimeout(() => {
            this._removeWorker(worker.id);
          }, this._idleTimeoutMs);
        }
        this._assignWork();
      });
  }
}

module.exports = WorkerPool;