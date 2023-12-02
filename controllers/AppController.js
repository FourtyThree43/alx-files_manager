const { Router } = require('express');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

/**
 * 
 */
class AppController {
  static async getStatus(req, res) {
    const redisAlive = await redisClient.isAlive();
    const dbAlive = await dbClient.isAlive();

    res.status(200).json({ "redis": redisAlive, "db": dbAlive });
  }

  static async getStats(req, res) {
    try {
      const userCount = await users.countDocuments();
      const fileCount = await files.countDocuments();

      res.status(200).json({ users: userCount, files: fileCount });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = AppController;
