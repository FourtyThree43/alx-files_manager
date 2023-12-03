import { Router } from 'express';
import AppController from '../controllers/AppController';

const router = Router();

const handleRoute = (route, handler) => {
  router.route(route).get((req, res, next) => {
    try {
      handler(req, res, next);
    } catch (error) {
      next(error);
    }
  });
};

handleRoute('/status', AppController.getStatus);
handleRoute('/stats', AppController.getStats);

export default router;
