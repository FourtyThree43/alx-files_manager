// eslint-disable-next-line no-unused-vars
import { Express, Next } from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import authenticate from '../middlewares/authenticate';

/**
 * Initialize the routes of the api.
 * @param {Express} api - The express apilication object.
 * @returns {void} Void
 */
const initializeRoutes = (api) => {
  api.get('/status', AppController.getStatus);
  api.get('/stats', AppController.getStats);

  api.post('/users', UsersController.postNew);
  api.get('/users/me', authenticate, UsersController.getMe);

  api.get('/connect', authenticate, AuthController.getConnect);
  api.get('/disconnect', authenticate, AuthController.getDisconnect);
};

export default initializeRoutes;
