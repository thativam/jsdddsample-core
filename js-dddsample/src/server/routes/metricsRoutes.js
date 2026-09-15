import express from 'express';
import { registry } from '../../infrastructure/metrics/MetricsCollector.js';

const router = express.Router();

router.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

export default router;
