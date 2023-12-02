import { isAlive, nbUsers, nbFiles } from '../utils/db';
import { isAlive as redisIsAlive } from '../utils/redis';

/**
 * Controller for the index route.
 * @class AppController
 * @method getStatus
 * @method getStats
 */
class AppController {
  static async getStatus(_req, res) {
    const redisAlive = redisIsAlive();
    const dbAlive = isAlive();

    res.status(200).json({ redis: redisAlive, db: dbAlive });
  }

  static async getStats(_req, res) {
    try {
      const userCount = await nbUsers();
      const fileCount = await nbFiles();

      res.status(200).json({ users: userCount, files: fileCount });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default AppController;
