import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

/**
 * Middleware for verifing token to authenticate a user.
 * @param {Request} req - The express request object.
 * @param {NextFunction} next - The express next function.
 * @param {Response} res - The express response object.
 * @returns {void} Void
 */
const verifyToken = async (req, res, next) => {
  const token = req.headers['x-token'];
  const authorization = req.headers.authorization || null;

  if (token) {
    const userId = await redisClient.get(`auth_${token}`);
    const user = await dbClient.findUserById(userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = user;
    next();
  } else if (authorization) {
    const base64Credentials = authorization.split(' ');
    if (base64Credentials.length !== 2 || base64Credentials[0] !== 'Basic') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const credentials = Buffer.from(base64Credentials[1], 'base64').toString('ascii');
    const [email, password] = credentials.split(':');

    const sha1Password = sha1(password);
    const user = await dbClient.findUserByEmail(email);

    if (!user || sha1Password !== user.password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = user;
    next();
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return null;
};

export default verifyToken;
