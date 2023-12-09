import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';

/**
 * Controller for the index route.
 * @class AuthController
 * @method getConnect
 * @method getDisconnect
 */
class AuthController {
  /**
    * Method for the route GET /connect.
    * Create's a new token in Redis.
    * @param {object} req - The express request object.
    * @param {object} res - The express response object.
    * @returns {object} 200 status code
    */
  static async getConnect(req, res) {
    const token = uuidv4();
    await redisClient.set(`auth_${token}`, req.user._id.toString(), 24 * 60 * 60);

    return res.status(200).json({ token });
  }

  /**
    * Method for the route GET /disconnect.
    * Deletes the token in Redis.
    * @param {object} req - The express request object.
    * @param {object} res - The express response object.
    * @returns {object} 204 status code
    */
  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}
export default AuthController;
