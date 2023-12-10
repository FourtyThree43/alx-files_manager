// eslint-disable-next-line no-unused-vars
import { Express, Next } from 'express';
import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';
import UsersController from '../controllers/UsersController';
import verifyToken from '../middlewares/authenticate';
import { APIError, errorResponse } from '../middlewares/error';

/**
 * Initialize the routes of the api.
 * @param {Express} api - The express apilication object.
 * @returns {void} Void
 */
const initializeRoutes = (api) => {
  api.get('/status', AppController.getStatus);
  api.get('/stats', AppController.getStats);

  api.post('/users', UsersController.postNew);
  api.get('/users/me', verifyToken, UsersController.getMe);

  api.get('/connect', verifyToken, AuthController.getConnect);
  api.get('/disconnect', verifyToken, AuthController.getDisconnect);

  api.post('/files', verifyToken, FilesController.postUpload);
  api.get('/files/:id', verifyToken, FilesController.getShow);
  api.get('/files', verifyToken, FilesController.getIndex);
  api.put('/files/:id/publish', verifyToken, FilesController.putPublish);
  api.put('/files/:id/unpublish', verifyToken, FilesController.putUnpublish);
  api.get('/files/:id/data', FilesController.getFile);

  api.all('*', (req, res, next) => {
    errorResponse(new APIError(404, `Cannot ${req.method} ${req.url}`), req, res, next);
  });
  api.use(errorResponse);
};

export default initializeRoutes;
