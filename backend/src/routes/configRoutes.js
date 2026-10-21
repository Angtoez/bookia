import { Router } from 'express';
import { getConfig, listGenres } from '../controllers/configController.js';

export function createConfigRouter() {
  const router = Router();
  router.get('/config', getConfig);
  router.get('/genres', listGenres);
  return router;
}
