// jobs/RetryManager.js
/**
 * RetryManager — ARGUS v1.1
 *
 * Manages retry logic for background jobs.
 * Supports exponential backoff, max retries, and retry policies per job type.
 */

class RetryManager {
  constructor(options = {}) {
    this._policies = new Map();

    // Default policy
    this._defaultPolicy = {
      maxRetries: options.maxRetries || 3,
      baseDelayMs: options.baseDelayMs || 1000,
      maxDelayMs: options.maxDelayMs || 60000,
      backoffMultiplier: options.backoffMultiplier || 2,
      jitter: options.jitter !== false,
    };
  }

  /**
   * Set a retry policy for a specific job type.
   * @param {string} jobType
   * @param {Object} policy
   * @param {number} [policy.maxRetries]
   * @param {number} [policy.baseDelayMs]
   * @param {number} [policy.maxDelayMs]
   * @param {number} [policy.backoffMultiplier]
   * @param {boolean} [policy.jitter]
   */
  setPolicy(jobType, policy) {
    this._policies.set(jobType, { ...this._defaultPolicy, ...policy });
  }

  /**
   * Get retry policy for a job type.
   * @param {string} jobType
   * @returns {Object}
   */
  getPolicy(jobType) {
    return this._policies.get(jobType) || { ...this._defaultPolicy };
  }

  /**
   * Calculate delay before the next retry attempt.
   * @param {string} jobType
   * @param {number} retryCount - 0-based retry count
   * @returns {number} Delay in milliseconds
   */
  getDelay(jobType, retryCount) {
    const policy = this.getPolicy(jobType);
    let delay = policy.baseDelayMs * Math.pow(policy.backoffMultiplier, retryCount);
    delay = Math.min(delay, policy.maxDelayMs);

    if (policy.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5); // 50-100% of calculated delay
    }

    return Math.floor(delay);
  }

  /**
   * Check if a job should be retried.
   * @param {string} jobType
   * @param {number} retryCount - Current retry count
   * @returns {boolean}
   */
  shouldRetry(jobType, retryCount) {
    const policy = this.getPolicy(jobType);
    return retryCount < policy.maxRetries;
  }

  /**
   * Execute a function with retry logic.
   * @param {Function} fn - Async function to execute
   * @param {Object} options
   * @param {string} [options.jobType='default']
   * @param {Function} [options.onRetry] - Callback on each retry
   * @returns {Promise<any>}
   */
  async executeWithRetry(fn, options = {}) {
    const jobType = options.jobType || 'default';
    let lastError;

    for (let attempt = 0; attempt <= this.getPolicy(jobType).maxRetries; attempt++) {
      try {
        return await fn(attempt);
      } catch (err) {
        lastError = err;
        if (attempt < this.getPolicy(jobType).maxRetries) {
          const delay = this.getDelay(jobType, attempt);
          if (options.onRetry) {
            options.onRetry({ attempt, error: err, delay });
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

module.exports = RetryManager;