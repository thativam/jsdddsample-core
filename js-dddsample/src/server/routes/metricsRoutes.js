import express from 'express';
import { register, collectDefaultMetrics } from 'prom-client';

// Collect default Node.js metrics (process_*, nodejs_*) on the global registry.
// Called once here for the monolith; prom-bundle handles this for distributed servers.
collectDefaultMetrics();

const router = express.Router();

router.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
