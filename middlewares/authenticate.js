import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

/**
 * Function to get user from X-token.
 * @param {string} token - The token string.
 * @returns {object} The user object or null.
 */
const getUserFromXToken = async (token) => {
  const userId = await redisClient.get(`auth_${token}`);
  const user = await dbClient.findUserById(userId);
  return user;
};

/**
 * Function to get user from authorization.
 * @param {string} authorization - The authorization string.
 * @returns {object} The user object or null.
 */
const getUserFromAuthorization = async (authorization) => {
  const base64Credentials = authorization.split(' ');
  if (base64Credentials.length !== 2 || base64Credentials[0] !== 'Basic') return null;

  const credentials = Buffer.from(base64Credentials[1], 'base64').toString('ascii');
  const [email, password] = credentials.split(':');
  if (!email || !password) return null;

  const sha1Password = sha1(password);
  const user = await dbClient.findUserByEmail(email);
  if (!user || user.password !== sha1Password) return null;

  return user;
};

/**
 * Middleware for verifying token to authenticate a user.
 * @param {Request} req - The express request object.
 * @param {NextFunction} next - The express next function.
 * @param {Response} res - The express response object.
 * @returns {object} The user object or error status code.
 */
const verifyToken = async (req, res, next) => {
  const Xtoken = req.headers['x-token'];
  const authorization = req.headers.authorization || null;

  let user = null;

  if (Xtoken) {
    user = await getUserFromXToken(Xtoken);
  } else if (authorization) {
    user = await getUserFromAuthorization(authorization);
  }

  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  req.user = user;
  return next();
};

export default verifyToken;
export { getUserFromXToken };
