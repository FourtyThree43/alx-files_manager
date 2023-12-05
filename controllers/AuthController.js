import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

/**
 * Controller for the index route.
 * @class AuthController
 * @method getConnect
 * @method getDisconnect
 */
class AuthController {
  static async getConnect(req, res) {
    const authorization = req.headers.authorization || null;
    if (!authorization) return null;

    const base64Credentials = authorization.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');

    const sha1Password = sha1(password);
    const user = await (await dbClient.findUserByEmail(email));

    if (!user || sha1Password !== user.password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);

    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    const userId = await redisClient.get(`auth_${token}`);
    const user = await (await dbClient.findUserById(userId));
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await redisClient.del(user);
    return res.status(204).send();
  }
}
export default AuthController;
