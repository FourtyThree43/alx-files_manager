// eslint-disable-next-line no-unused-vars
import { Express } from 'express';
import apiController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

/**
 * Initialize the routes of the api.
 * @param {Express} api - The express apilication object.
 * @returns {void} Void
 */
const initializeRoutes = (api) => {
  api.get('/status', apiController.getStatus);
  api.get('/stats', apiController.getStats);

  api.post('/users', UsersController.postNew);
};

export default initializeRoutes;
