// repositories/interfaces/IRepository.js
/**
 * Base Repository Contract — SELIDIKI Architecture v1.0
 *
 * EVERY repository MUST implement this interface.
 * Provider-specific types (Firestore DocumentSnapshot, pg PoolClient)
 * MUST NOT appear in any public method signature.
 *
 * @interface IRepository
 */

/**
 * Read a single entity by its primary identifier.
 * MUST return null (not undefined) when entity is not found.
 * MUST NOT throw on "not found" — only on infrastructure failures.
 *
 * @param {string} id - Primary identifier (hash, UUID, or composite key)
 * @returns {Promise<Object|null>} Domain object or null
 */
// async findById(id) { throw new Error('Not implemented'); }

/**
 * Create a new entity.
 * MUST be idempotent where possible (ON CONFLICT / merge:true).
 * MUST return the created entity with its identifier.
 *
 * @param {Object} data - Domain data object
 * @returns {Promise<Object>} Created entity
 */
// async create(data) { throw new Error('Not implemented'); }

/**
 * Update an existing entity.
 * MUST be idempotent.
 * MUST NOT create if entity does not exist (use upsert for that).
 *
 * @param {string} id - Entity identifier
 * @param {Object} data - Partial update data
 * @returns {Promise<Object>} Updated entity
 */
// async update(id, data) { throw new Error('Not implemented'); }

/**
 * Delete an entity by identifier.
 * MUST be idempotent — deleting a non-existent entity is a no-op.
 * MUST return true if deleted, false if not found.
 *
 * @param {string} id - Entity identifier
 * @returns {Promise<boolean>} Whether deletion occurred
 */
// async delete(id) { throw new Error('Not implemented'); }

/**
 * Search entities with pagination, filtering, and sorting.
 *
 * @param {Object} criteria - { filters, pagination, sort }
 * @returns {Promise<{data: Object[], total: number}>} Paginated results
 */
// async search(criteria) { throw new Error('Not implemented'); }

/**
 * Execute multiple operations within a transaction boundary.
 * Provider-specific transaction handle is passed to callback.
 *
 * @param {Function} callback - Async function receiving transaction handle
 * @returns {Promise<any>} Callback result
 */
// async transaction(callback) { throw new Error('Not implemented'); }

/**
 * Bulk insert multiple entities atomically.
 * MUST support at least 500 entities per batch.
 *
 * @param {Object[]} entities - Array of domain objects
 * @returns {Promise<{inserted: number}>} Count of inserted entities
 */
// async bulkInsert(entities) { throw new Error('Not implemented'); }

/**
 * Health check — verify the underlying data store is reachable.
 * MUST throw if connection fails.
 * MUST resolve void if healthy.
 *
 * @returns {Promise<void>}
 */
// async ping() { throw new Error('Not implemented'); }

module.exports = {
  name: 'IRepository',
  version: '1.0.0',
  description: 'Base repository contract for SELIDIKI Architecture v1.0',
};
