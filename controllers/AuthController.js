import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';

/**
 * Controller for the index route.
 * @class AuthController
 * @method getConnect
 * @method getDisconnect
 */
class AuthController {
  static async getConnect(req, res) {
    const token = uuidv4();
    await redisClient.set(`auth_${token}`, req.user._id.toString(), 24 * 60 * 60);

    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}
export default AuthController;
