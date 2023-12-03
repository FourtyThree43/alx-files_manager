import redisClient from '../utils/redis';
import dbClient from '../utils/db';

/**
 * Controller for the index route.
 * @class AppController
 * @method getStatus
 * @method getStats
 */
class AppController {
  /**
   * Method for the route GET /status.
   * Checks the status of the API.
   * @param {object} _req - The express request object.
   * @param {object} res - The express response object.
   * @returns {object} The status code 200 and the status of the API.
   */
  static getStatus(_req, res) {
    res.status(200).json({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
  }

  /**
   * Method for the route GET /stats.
   * Checks the stats of the API.
   * @param {object} _req - The express request object.
   * @param {object} res - The express response object.
   * @returns {object} The status code 200 and the stats of the API.
   */
  static getStats(_req, res) {
    Promise.all([dbClient.nbUsers(), dbClient.nbFiles()])
      .then(([usersCount, filesCount]) => {
        res.status(200).json({ users: usersCount, files: filesCount });
      });
  }
}

export default AppController;
