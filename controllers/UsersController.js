import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

/**
 * Controller for the index route.
 * @class UsersController
 * @method postNew
 * @method getMe
 */
class UsersController {
  /**
   * Method for the route POST /users.
   * Create a new user in DB.
   * @param {object} req - The express request object.
   * @param {object} res - The express response object.
   * @returns {object} The status code 201 and the new user if successful,
   *                   400 if missing parameters or 409 if already exist.
   */
  static async postNew(req, res) {
    const email = req.body ? req.body.email : null;
    const password = req.body ? req.body.password : null;

    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    const user = await (await dbClient.usersCollection()).findOne({ email });

    if (user) return res.status(400).json({ error: 'Already exist' });

    try {
      const addUserInfo = await (await dbClient.usersCollection())
        .insertOne({ email, password: sha1(password) });
      const userId = addUserInfo.insertedId.toString();
      return res.status(201).json({ id: userId, email });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Method for the route GET /users/me.
   * Fetches a user in DB.
   * @param {object} req - The express request object.
   * @param {object} res - The express response object.
   * @returns {object} The status code 200 and the user if successful,
   */
  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) return null;

    const userId = await redisClient.get(`auth_${token}`);
    const user = await (await dbClient.findUserById(userId));
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    return res.status(200).json({ email: user.email, id: userId.toString() });
  }
}

export default UsersController;
