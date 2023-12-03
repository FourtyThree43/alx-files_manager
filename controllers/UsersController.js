import dbClient from '../utils/db';

/**
 * Controller for the index route.
 * @class UsersController
 * @method postNew
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
      const addUserInfo = await (await dbClient.usersCollection()).insertOne({ email, password });
      const userId = addUserInfo.insertedId.toString();
      return res.status(201).json({ id: userId, email });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

export default UsersController;
