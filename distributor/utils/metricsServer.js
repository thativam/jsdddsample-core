/**
 * Self-starting Prometheus metrics HTTP server.
 *
 * Loaded via Node's --import flag so it starts automatically with no changes
 * to app.js or any other source file:
 *
 *   node --import ./src/server/metricsServer.js src/server/app.js
 *
 * PLACEMENT: inject-metrics.mjs copies this file to src/server/metricsServer.js
 * inside each generated distributed server and patches the package.json start
 * script to include the --import flag.
 *
 * METRICS_PORT (env var, default 9091): port for the /metrics endpoint.
 * Each server instance must use a unique port exposed in compose.yaml.
 */

import http from 'http';
import { registry } from '../infrastructure/metrics/MetricsCollector.js';

const port = Number(process.env.METRICS_PORT) || 9091;

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/metrics') {
    try {
      const metrics = await registry.metrics();
      res.writeHead(200, { 'Content-Type': registry.contentType });
      res.end(metrics);
    } catch (err) {
      res.writeHead(500);
      res.end(err.message);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.info(`Metrics server listening on http://localhost:${port}/metrics`);
});
