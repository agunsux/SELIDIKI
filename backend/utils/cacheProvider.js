// utils/cacheProvider.js

/**
 * CacheProvider abstraction that uses Redis if REDIS_URL is configured,
 * otherwise falls back to an in‑memory Map. All methods are async to keep a
 * consistent interface.
 */
class CacheProvider {
  static async _init() {
    if (this._client) return;
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      const { createClient } = require('redis');
      this._client = createClient({ url: redisUrl });
      this._client.on('error', err => console.error('Redis error', err));
      await this._client.connect();
      this._isRedis = true;
    } else {
      // Simple in‑memory cache with expiration handling
      this._memory = new Map();
      this._isRedis = false;
    }
  }

  static async get(key) {
    await this._init();
    if (this._isRedis) {
      const value = await this._client.get(key);
      return value ? JSON.parse(value) : null;
    }
    const entry = this._memory.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._memory.delete(key);
      return null;
    }
    return entry.value;
  }

  static async set(key, value, ttlSeconds) {
    await this._init();
    if (this._isRedis) {
      await this._client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } else {
      const expiresAt = Date.now() + ttlSeconds * 1000;
      this._memory.set(key, { value, expiresAt });
    }
  }

  static async ping() {
    await this._init();
    if (this._isRedis) {
      await this._client.ping();
    }
    // memory cache always available
    return true;
  }
}

module.exports = CacheProvider;
