import { createClient } from 'redis';

/**
 * Redis client class.
 * @class RedisClient
 * @property {object} client - The Redis client.
 * @method {boolean} isAlive - Checks if the Redis client is connected to the server.
 * @method {Promise<string>} get - Retrieves the value stored in Redis for a given key.
 * @method {Promise<void>} set - Sets a value in Redis with an expiration (duration in seconds).
 * @method {Promise<void>} del - Removes a value from Redis for a given key.
 */
class RedisClient {
  constructor() {
    this.client = createClient();
    // Handle Errors
    this.client.on('error', (err) => {
      console.error('Reddis Client Error:', err);
    });
  }

  /**
   * Checks if the Redis client is connected to the server.
   * @return {boolean} true if connected, false otherwise.
   */
  isAlive() {
    return this.client.connected;
  }

  /**
   * Retrieves the value stored in Redis for a given key.
   * @param {string} key - The redis key.
   * @returns {Promise<string>} The value associated with key.
   */
  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, value) => {
        if (err) reject(err);
        resolve(value);
      });
    });
  }

  /**
   * Sets a value in Redis with an expiration (duration in seconds).
   * @param {string} key - The Redis key.
   * @param {number} duration - Expiration duration in seconds.
   * @param {string} value - The value to store.
   * @returns {Promise<void>}
   */
  async set(key, value, duration) {
    return new Promise((resolve, reject) => {
      this.client.setex(key, duration, value, (err) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  }

  /**
   * Removes a value from Redis for a given key.
   * @param {string} key - The Redis key.
   * @returns {Promise<void>}
   */
  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, resp) => {
        if (err) reject(err);
        resolve(resp === 1);
      });
    });
  }
}

const redisClient = new RedisClient();
export default redisClient;
