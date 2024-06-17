const { createClient } = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('err', (err) => {
      console.log('Redis not connected', err);
    });

    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.expireAsync = promisify(this.client.expire).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    await this.ready;
    try {
      const result = await this.getAsync(key);
      return result;
    } catch (err) {
      console.log('GET error', err);
      return null;
    }
  }

  async set(key, value, duration) {
    await this.ready;
    try {
      await this.setAsync(key, value);
      await this.expireAsync(key, duration);
    } catch (err) {
      console.log('SET error', err);
    }
  }

  async del(key) {
    await this.ready;
    try {
      await this.delAsync(key);
    } catch (err) {
      console.log('DEL error', err);
    }
  }
}

module.exports = new RedisClient();
